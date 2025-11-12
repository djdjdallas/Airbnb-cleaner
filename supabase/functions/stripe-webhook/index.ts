/**
 * Stripe Webhook Handler Edge Function
 * Handles Stripe webhook events for subscription management
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { verifyStripeWebhook, getSubscriptionLimits } from '../_shared/stripe.ts';
import { errorResponse } from '../_shared/cors.ts';

// Types
interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

/**
 * Send push notification to user
 */
async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
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
      title,
      body: message,
      data: { type },
    };

    await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    console.log('Push notification sent to user:', userId);
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

/**
 * Find user by Stripe customer ID
 */
async function findUserByCustomerId(customerId: string, supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) {
    console.error('User not found for customer ID:', customerId);
    return null;
  }

  return data.id;
}

/**
 * Update subscription status
 */
async function updateSubscriptionStatus(
  userId: string,
  status: string,
  supabase: any
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: status })
    .eq('id', userId);

  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }

  console.log(`Updated subscription status for user ${userId} to ${status}`);
}

/**
 * Check and enforce property limits
 */
async function enforcePropertyLimits(userId: string, status: string, supabase: any): Promise<void> {
  const limits = getSubscriptionLimits(status);

  // Get current active property count
  const { count, error } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.error('Error checking property count:', error);
    return;
  }

  const currentCount = count || 0;

  // If user exceeds limit, deactivate excess properties
  if (currentCount > limits.propertyLimit) {
    console.log(`User ${userId} exceeds limit. Deactivating excess properties.`);

    // Get properties to deactivate (keep oldest ones, deactivate newest)
    const { data: properties, error: propsError } = await supabase
      .from('properties')
      .select('id')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .range(limits.propertyLimit, currentCount - 1);

    if (!propsError && properties && properties.length > 0) {
      const propertyIds = properties.map((p: any) => p.id);

      await supabase
        .from('properties')
        .update({ active: false })
        .in('id', propertyIds);

      // Notify user
      await sendPushNotification(
        userId,
        'Property Limit Exceeded',
        `Some properties have been deactivated due to your subscription plan limits. Please upgrade or manage your properties.`,
        'property_limit_exceeded',
        supabase
      );
    }
  }
}

/**
 * Handle subscription created
 */
async function handleSubscriptionCreated(event: StripeEvent, supabase: any): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const status = subscription.status;

  const userId = await findUserByCustomerId(customerId, supabase);
  if (!userId) return;

  await updateSubscriptionStatus(userId, status, supabase);

  if (status === 'active') {
    await sendPushNotification(
      userId,
      'Subscription Active',
      'Your subscription is now active! Enjoy all premium features.',
      'subscription_active',
      supabase
    );
  }
}

/**
 * Handle subscription updated
 */
async function handleSubscriptionUpdated(event: StripeEvent, supabase: any): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const status = subscription.status;

  const userId = await findUserByCustomerId(customerId, supabase);
  if (!userId) return;

  await updateSubscriptionStatus(userId, status, supabase);
  await enforcePropertyLimits(userId, status, supabase);

  if (status === 'canceled') {
    await sendPushNotification(
      userId,
      'Subscription Cancelled',
      'Your subscription has been cancelled. You can reactivate it anytime from your account settings.',
      'subscription_cancelled',
      supabase
    );
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(event: StripeEvent, supabase: any): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer;

  const userId = await findUserByCustomerId(customerId, supabase);
  if (!userId) return;

  await updateSubscriptionStatus(userId, 'canceled', supabase);
  await enforcePropertyLimits(userId, 'canceled', supabase);

  await sendPushNotification(
    userId,
    'Subscription Ended',
    'Your subscription has ended. Upgrade to continue using premium features.',
    'subscription_ended',
    supabase
  );
}

/**
 * Handle invoice payment succeeded
 */
async function handleInvoicePaymentSucceeded(event: StripeEvent, supabase: any): Promise<void> {
  const invoice = event.data.object;
  const customerId = invoice.customer;

  const userId = await findUserByCustomerId(customerId, supabase);
  if (!userId) return;

  await updateSubscriptionStatus(userId, 'active', supabase);

  console.log('Invoice payment succeeded for user:', userId);
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(event: StripeEvent, supabase: any): Promise<void> {
  const invoice = event.data.object;
  const customerId = invoice.customer;

  const userId = await findUserByCustomerId(customerId, supabase);
  if (!userId) return;

  await updateSubscriptionStatus(userId, 'past_due', supabase);

  await sendPushNotification(
    userId,
    'Payment Failed',
    'Your payment failed. Please update your payment method to continue your subscription.',
    'payment_failed',
    supabase
  );
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
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!supabaseUrl || !supabaseServiceKey || !stripeWebhookSecret) {
      return errorResponse('Missing configuration', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return errorResponse('Missing Stripe signature', 400);
    }

    // Verify webhook signature
    let event: StripeEvent;
    try {
      event = await verifyStripeWebhook(body, signature, stripeWebhookSecret);
    } catch (verifyError: any) {
      console.error('Webhook verification failed:', verifyError);
      return errorResponse('Invalid signature', 400);
    }

    console.log('Received Stripe webhook event:', event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, supabase);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabase);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, supabase);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, supabase);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    // Acknowledge receipt of event
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Stripe webhook error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
