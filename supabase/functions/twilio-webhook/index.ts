/**
 * Twilio Webhook Handler Edge Function
 * Handles incoming SMS messages from cleaners
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  parseTwilioWebhook,
  createTwiMLResponse,
  formatPhoneNumber,
} from '../_shared/twilio.ts';
import { errorResponse } from '../_shared/cors.ts';

// Types
interface CleaningJob {
  id: string;
  property_id: string;
  cleaner_id: string;
  status: string;
  checkout_date: string;
  property?: {
    name: string;
    user_id: string;
  };
}

interface Cleaner {
  id: string;
  name: string;
  phone: string;
  user_id: string;
}

/**
 * Parse SMS body for keywords
 */
function parseMessageIntent(body: string): {
  intent: 'confirm' | 'decline' | 'complete' | 'unknown';
  status: string | null;
  timestamp_field: string | null;
} {
  const normalizedBody = body.trim().toLowerCase();

  // Confirmation keywords
  if (['yes', 'y', 'confirm', 'ok', 'okay', 'accept', 'confirmed'].includes(normalizedBody)) {
    return {
      intent: 'confirm',
      status: 'confirmed',
      timestamp_field: 'confirmed_at',
    };
  }

  // Decline keywords
  if (['no', 'n', 'decline', 'cancel', 'nope', 'declined', 'cancelled'].includes(normalizedBody)) {
    return {
      intent: 'decline',
      status: 'cancelled',
      timestamp_field: 'cancelled_at',
    };
  }

  // Completion keywords
  if (['done', 'complete', 'completed', 'finished', 'finish'].includes(normalizedBody)) {
    return {
      intent: 'complete',
      status: 'completed',
      timestamp_field: 'completed_at',
    };
  }

  return {
    intent: 'unknown',
    status: null,
    timestamp_field: null,
  };
}

/**
 * Find recent pending job for cleaner
 */
async function findRecentJob(cleanerId: string, supabase: any): Promise<CleaningJob | null> {
  // Look for jobs in the next 30 days with pending or confirmed status
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('cleaning_jobs')
    .select(`
      *,
      property:properties (
        name,
        user_id
      )
    `)
    .eq('cleaner_id', cleanerId)
    .in('status', ['pending', 'confirmed'])
    .gte('checkout_date', today)
    .lte('checkout_date', futureDateStr)
    .order('checkout_date', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    console.error('Error finding recent job:', error);
    return null;
  }

  return data;
}

/**
 * Send push notification to host
 */
async function sendPushNotification(
  userId: string,
  type: string,
  message: string,
  jobId: string,
  supabase: any
) {
  try {
    // Get user's push token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.expo_push_token) {
      console.log('No push token found for user:', userId);
      return;
    }

    // Send push notification via Expo
    const expoPushUrl = 'https://exp.host/--/api/v2/push/send';
    const notification = {
      to: profile.expo_push_token,
      sound: 'default',
      title: 'Cleaning Job Update',
      body: message,
      data: { type, job_id: jobId },
    };

    await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Missing Supabase configuration', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse Twilio webhook data
    const twilioData = await parseTwilioWebhook(req);
    const fromPhone = twilioData.From;
    const messageBody = twilioData.Body || '';
    const messageSid = twilioData.MessageSid;

    console.log('Received SMS:', { fromPhone, messageBody, messageSid });

    // Format phone number
    const formattedPhone = formatPhoneNumber(fromPhone);

    // Find cleaner by phone number
    const { data: cleaners, error: cleanerError } = await supabase
      .from('cleaners')
      .select('*')
      .eq('phone', formattedPhone);

    if (cleanerError || !cleaners || cleaners.length === 0) {
      console.log('Cleaner not found for phone:', formattedPhone);

      // Log SMS anyway
      await supabase.from('sms_logs').insert({
        phone: formattedPhone,
        message: messageBody,
        direction: 'inbound',
        twilio_sid: messageSid,
        status: 'received',
      });

      return createTwiMLResponse(
        "We couldn't find your cleaner profile. Please contact your property manager."
      );
    }

    const cleaner: Cleaner = cleaners[0];

    // Parse message intent
    const { intent, status, timestamp_field } = parseMessageIntent(messageBody);

    if (intent === 'unknown') {
      // Log SMS
      await supabase.from('sms_logs').insert({
        phone: formattedPhone,
        message: messageBody,
        direction: 'inbound',
        twilio_sid: messageSid,
        status: 'received',
      });

      return createTwiMLResponse(
        'Please reply with YES to confirm, NO to decline, or DONE when completed.'
      );
    }

    // Find recent job for this cleaner
    const job = await findRecentJob(cleaner.id, supabase);

    if (!job) {
      // Log SMS
      await supabase.from('sms_logs').insert({
        cleaning_job_id: null,
        phone: formattedPhone,
        message: messageBody,
        direction: 'inbound',
        twilio_sid: messageSid,
        status: 'received',
      });

      return createTwiMLResponse(
        'No upcoming cleaning jobs found. Contact your property manager if you believe this is an error.'
      );
    }

    // Update job status
    const updateData: any = {
      status,
      [timestamp_field!]: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('cleaning_jobs')
      .update(updateData)
      .eq('id', job.id);

    if (updateError) {
      console.error('Error updating job:', updateError);
      throw new Error('Failed to update job status');
    }

    // Log SMS
    await supabase.from('sms_logs').insert({
      cleaning_job_id: job.id,
      phone: formattedPhone,
      message: messageBody,
      direction: 'inbound',
      twilio_sid: messageSid,
      status: 'processed',
    });

    // Send push notification to host
    const propertyName = job.property?.name || 'Unknown Property';
    let notificationType = '';
    let notificationMessage = '';

    switch (intent) {
      case 'confirm':
        notificationType = 'job_confirmed';
        notificationMessage = `${cleaner.name} confirmed cleaning at ${propertyName} on ${job.checkout_date}`;
        break;
      case 'decline':
        notificationType = 'job_declined';
        notificationMessage = `${cleaner.name} declined cleaning at ${propertyName} on ${job.checkout_date}`;
        break;
      case 'complete':
        notificationType = 'job_completed';
        notificationMessage = `${cleaner.name} completed cleaning at ${propertyName}`;
        break;
    }

    if (job.property?.user_id) {
      await sendPushNotification(
        job.property.user_id,
        notificationType,
        notificationMessage,
        job.id,
        supabase
      );
    }

    // Send confirmation response
    let responseMessage = '';
    switch (intent) {
      case 'confirm':
        responseMessage = `Thanks ${cleaner.name}! Your cleaning at ${propertyName} on ${job.checkout_date} is confirmed.`;
        break;
      case 'decline':
        responseMessage = `Your decline has been noted. The property manager has been notified.`;
        break;
      case 'complete':
        responseMessage = `Great work! Cleaning marked as complete. Thanks ${cleaner.name}!`;
        break;
    }

    return createTwiMLResponse(responseMessage);
  } catch (error: any) {
    console.error('Twilio webhook error:', error);

    // Return TwiML error response
    return createTwiMLResponse(
      'Sorry, there was an error processing your message. Please contact your property manager.'
    );
  }
});
