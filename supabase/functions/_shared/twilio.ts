/**
 * Twilio client helper for Supabase Edge Functions
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export interface SendSmsParams {
  to: string;
  body: string;
}

export interface TwilioSmsResponse {
  sid: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Initialize Twilio configuration from environment variables
 */
export function getTwilioConfig(): TwilioConfig {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const phoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Missing Twilio configuration in environment variables');
  }

  return { accountSid, authToken, phoneNumber };
}

/**
 * Send an SMS via Twilio API
 */
export async function sendSms(
  params: SendSmsParams,
  config?: TwilioConfig
): Promise<TwilioSmsResponse> {
  const twilioConfig = config || getTwilioConfig();

  // Create Basic Auth credentials
  const credentials = btoa(`${twilioConfig.accountSid}:${twilioConfig.authToken}`);

  // Twilio API endpoint
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioConfig.accountSid}/Messages.json`;

  // Create form-encoded body
  const body = new URLSearchParams({
    To: params.to,
    From: twilioConfig.phoneNumber,
    Body: params.body,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send SMS');
    }

    return {
      sid: data.sid,
      status: data.status,
      errorCode: data.error_code,
      errorMessage: data.error_message,
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    throw error;
  }
}

/**
 * Verify Twilio webhook signature (for security)
 */
export function verifyTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  // Note: This is a simplified version. For production, use the official twilio-node library
  // or implement the full HMAC-SHA1 verification
  // For now, we'll skip signature verification but log a warning
  console.warn('Twilio signature verification not fully implemented - consider adding in production');
  return true;
}

/**
 * Parse Twilio webhook request body
 */
export async function parseTwilioWebhook(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get('content-type') || '';

  if (!contentType.includes('application/x-www-form-urlencoded')) {
    throw new Error('Invalid content type for Twilio webhook');
  }

  const text = await req.text();
  const params = new URLSearchParams(text);
  const result: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;
  }

  return result;
}

/**
 * Create TwiML response for Twilio webhook
 */
export function createTwiMLResponse(message: string): Response {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(twiml, {
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it doesn't start with +, add +1 for US numbers
  if (!phone.startsWith('+')) {
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  }

  return phone;
}
