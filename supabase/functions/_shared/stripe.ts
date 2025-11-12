/**
 * Stripe client helper for Supabase Edge Functions
 */

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
}

/**
 * Initialize Stripe configuration from environment variables
 */
export function getStripeConfig(): StripeConfig {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!secretKey || !webhookSecret) {
    throw new Error('Missing Stripe configuration in environment variables');
  }

  return { secretKey, webhookSecret };
}

/**
 * Verify Stripe webhook signature
 */
export async function verifyStripeWebhook(
  payload: string,
  signature: string,
  webhookSecret: string
): Promise<any> {
  try {
    // Parse the signature header
    const signatureParts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const timestamp = signatureParts.t;
    const expectedSignature = signatureParts.v1;

    if (!timestamp || !expectedSignature) {
      throw new Error('Invalid signature format');
    }

    // Create the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Compute HMAC using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedPayload)
    );

    // Convert to hex
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures (timing-safe comparison)
    if (computedSignature !== expectedSignature) {
      throw new Error('Signature verification failed');
    }

    // Check timestamp to prevent replay attacks (5 minutes tolerance)
    const now = Math.floor(Date.now() / 1000);
    const timestampNum = parseInt(timestamp, 10);
    if (now - timestampNum > 300) {
      throw new Error('Webhook timestamp too old');
    }

    // Parse and return the event
    return JSON.parse(payload);
  } catch (error) {
    console.error('Stripe webhook verification error:', error);
    throw error;
  }
}

/**
 * Make a request to Stripe API
 */
export async function stripeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  secretKey?: string
): Promise<any> {
  const config = secretKey ? { secretKey, webhookSecret: '' } : getStripeConfig();

  const url = `https://api.stripe.com/v1/${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    // Convert body to form-encoded format
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      params.append(key, String(value));
    }
    options.body = params.toString();
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Stripe API request failed');
    }

    return data;
  } catch (error) {
    console.error('Stripe API error:', error);
    throw error;
  }
}

/**
 * Get subscription tier limits
 */
export function getSubscriptionLimits(status: string | null): {
  propertyLimit: number;
  features: string[];
} {
  switch (status) {
    case 'active':
      return {
        propertyLimit: 100,
        features: ['unlimited_cleaners', 'sms_notifications', 'calendar_sync', 'payment_tracking'],
      };
    case 'trialing':
      return {
        propertyLimit: 3,
        features: ['unlimited_cleaners', 'sms_notifications', 'calendar_sync'],
      };
    default:
      return {
        propertyLimit: 1,
        features: ['basic_features'],
      };
  }
}

/**
 * Check if user has reached property limit
 */
export async function enforcePropertyLimit(
  userId: string,
  subscriptionStatus: string | null,
  supabaseClient: any
): Promise<{ allowed: boolean; reason?: string }> {
  const limits = getSubscriptionLimits(subscriptionStatus);

  // Get current property count
  const { count, error } = await supabaseClient
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('active', true);

  if (error) {
    console.error('Error checking property count:', error);
    return { allowed: false, reason: 'Failed to check property limit' };
  }

  const currentCount = count || 0;

  if (currentCount >= limits.propertyLimit) {
    return {
      allowed: false,
      reason: `Property limit reached (${limits.propertyLimit}). Please upgrade your subscription.`,
    };
  }

  return { allowed: true };
}
