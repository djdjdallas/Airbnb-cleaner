/**
 * Send Cleaning SMS Edge Function
 * Sends SMS notifications to cleaners about upcoming jobs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { sendSms } from '../_shared/twilio.ts';
import { corsHeaders, jsonResponse, errorResponse, handleCors } from '../_shared/cors.ts';

// Types
interface CleaningJob {
  id: string;
  property_id: string;
  cleaner_id: string;
  checkout_date: string;
  status: string;
  sms_sent_at: string | null;
  is_same_day_turnaround: boolean;
  property?: {
    name: string;
    address: string | null;
  };
  cleaner?: {
    name: string;
    phone: string;
    sms_opt_out: boolean;
  };
}

/**
 * Format date for SMS (e.g., "Monday, Jan 15")
 */
function formatDateForSms(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Build SMS message
 */
function buildSmsMessage(job: CleaningJob): string {
  const cleanerName = job.cleaner?.name || 'there';
  const propertyName = job.property?.name || 'the property';
  const formattedDate = formatDateForSms(job.checkout_date);

  let message = `Hi ${cleanerName}, you have a cleaning at ${propertyName} on ${formattedDate}.`;

  // Add same-day turnaround warning
  if (job.is_same_day_turnaround) {
    message += ' ⚠️ SAME DAY TURNAROUND - Guest checks in today!';
  }

  // Add address if available
  if (job.property?.address) {
    message += ` Address: ${job.property.address}.`;
  }

  // Add response instructions
  message += ' Reply YES to confirm or NO to decline.';

  return message;
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only accept POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Missing Supabase configuration', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body = await req.json();
    const { cleaning_job_id } = body;

    if (!cleaning_job_id) {
      return errorResponse('Missing cleaning_job_id in request body', 400);
    }

    // Fetch job with property and cleaner details
    const { data: job, error: jobError } = await supabase
      .from('cleaning_jobs')
      .select(`
        *,
        property:properties (
          name,
          address
        ),
        cleaner:cleaners (
          name,
          phone,
          sms_opt_out
        )
      `)
      .eq('id', cleaning_job_id)
      .single();

    if (jobError || !job) {
      return errorResponse('Cleaning job not found', 404);
    }

    // Check if cleaner exists
    if (!job.cleaner) {
      return errorResponse('No cleaner assigned to this job', 400);
    }

    // Check if cleaner has opted out of SMS
    if (job.cleaner.sms_opt_out) {
      console.log('Cleaner has opted out of SMS:', job.cleaner.name);
      return jsonResponse({
        success: false,
        message: 'Cleaner has opted out of SMS notifications',
      });
    }

    // Check if SMS already sent
    if (job.sms_sent_at) {
      console.log('SMS already sent for this job:', job.id);
      return jsonResponse({
        success: false,
        message: 'SMS already sent for this job',
        sent_at: job.sms_sent_at,
      });
    }

    // Build SMS message
    const message = buildSmsMessage(job);

    // Send SMS via Twilio
    let twilioResponse;
    try {
      twilioResponse = await sendSms({
        to: job.cleaner.phone,
        body: message,
      });
    } catch (twilioError: any) {
      console.error('Twilio error:', twilioError);

      // Log failed SMS
      await supabase.from('sms_logs').insert({
        cleaning_job_id: job.id,
        phone: job.cleaner.phone,
        message,
        direction: 'outbound',
        status: 'failed',
        error_message: twilioError.message,
      });

      return errorResponse('Failed to send SMS: ' + twilioError.message, 500);
    }

    // Log successful SMS
    await supabase.from('sms_logs').insert({
      cleaning_job_id: job.id,
      phone: job.cleaner.phone,
      message,
      direction: 'outbound',
      twilio_sid: twilioResponse.sid,
      status: twilioResponse.status,
    });

    // Update job with sms_sent_at timestamp
    await supabase
      .from('cleaning_jobs')
      .update({
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    return jsonResponse({
      success: true,
      message_sid: twilioResponse.sid,
      message: 'SMS sent successfully',
      sent_to: job.cleaner.name,
      phone: job.cleaner.phone,
    });
  } catch (error: any) {
    console.error('Send SMS error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
