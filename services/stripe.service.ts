/**
 * Stripe Service for React Native
 * Handles all Stripe payment operations via Edge Functions
 */

import { initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import { supabase } from './supabase';
import type {
  PaymentIntentResponse,
  CreateSubscriptionResponse,
  StripeSubscription,
  StripeInvoice,
  StripeError,
} from '../types';

const FUNCTIONS_URL = process.env.EXPO_PUBLIC_API_URL;

if (!FUNCTIONS_URL) {
  throw new Error('Missing EXPO_PUBLIC_API_URL environment variable');
}

/**
 * Custom error class for Stripe-related errors
 */
export class StripeServiceError extends Error {
  code?: string;
  type?: string;

  constructor(message: string, code?: string, type?: string) {
    super(message);
    this.name = 'StripeServiceError';
    this.code = code;
    this.type = type;
  }
}

/**
 * Get the current user's auth token for authenticated requests
 */
async function getAuthToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new StripeServiceError('User not authenticated');
  }

  return session.access_token;
}

/**
 * Make an authenticated request to a Supabase Edge Function
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${FUNCTIONS_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as StripeError;
      throw new StripeServiceError(
        error.message || 'An error occurred with the payment service',
        error.code,
        error.type
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'An unexpected error occurred'
    );
  }
}

/**
 * Initialize the Stripe payment sheet for a one-time payment
 * @param userId - The user's ID
 * @param amount - Amount in cents (e.g., 1000 = $10.00)
 * @param currency - Currency code (default: 'usd')
 * @returns Promise with payment sheet initialization result
 */
export async function initializePaymentSheet(
  userId: string,
  amount: number,
  currency: string = 'usd'
): Promise<{ clientSecret: string; customerId: string }> {
  try {
    const response = await callEdgeFunction<PaymentIntentResponse>(
      'create-payment-intent',
      { userId, amount, currency }
    );

    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Airbnb Cleaner Scheduler',
      customerId: response.customerId,
      paymentIntentClientSecret: response.clientSecret,
      allowsDelayedPaymentMethods: false,
      returnURL: 'airbnb-cleaner-scheduler://payment-complete',
      defaultBillingDetails: {
        name: '',
      },
    });

    if (error) {
      throw new StripeServiceError(error.message, error.code);
    }

    return response;
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to initialize payment sheet'
    );
  }
}

/**
 * Present the Stripe payment sheet to the user
 * @returns Promise with success status
 */
export async function presentPaymentSheetUI(): Promise<{ success: boolean }> {
  try {
    const { error } = await presentPaymentSheet();

    if (error) {
      if (error.code === 'Canceled') {
        return { success: false };
      }
      throw new StripeServiceError(error.message, error.code);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to present payment sheet'
    );
  }
}

/**
 * Create a new subscription for a user
 * @param userId - The user's ID
 * @param priceId - Stripe price ID for the subscription plan
 * @returns Promise with subscription details
 */
export async function createSubscription(
  userId: string,
  priceId: string
): Promise<CreateSubscriptionResponse> {
  try {
    const response = await callEdgeFunction<CreateSubscriptionResponse>(
      'create-subscription',
      { userId, priceId }
    );

    // If a setup intent is required, initialize the payment sheet
    if (response.clientSecret) {
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Airbnb Cleaner Scheduler',
        paymentIntentClientSecret: response.clientSecret,
        allowsDelayedPaymentMethods: false,
        returnURL: 'airbnb-cleaner-scheduler://subscription-complete',
      });

      if (error) {
        throw new StripeServiceError(error.message, error.code);
      }

      // Present the payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') {
          throw new StripeServiceError('Subscription setup was canceled', 'Canceled');
        }
        throw new StripeServiceError(presentError.message, presentError.code);
      }
    }

    return response;
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to create subscription'
    );
  }
}

/**
 * Cancel a user's subscription
 * @param userId - The user's ID
 * @param immediate - If true, cancel immediately; if false, cancel at period end
 * @returns Promise with success status
 */
export async function cancelSubscription(
  userId: string,
  immediate: boolean = false
): Promise<{ success: boolean }> {
  try {
    await callEdgeFunction<{ success: boolean }>('cancel-subscription', {
      userId,
      immediate,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to cancel subscription'
    );
  }
}

/**
 * Update a user's payment method
 * @param userId - The user's ID
 * @returns Promise with success status
 */
export async function updatePaymentMethod(userId: string): Promise<{ success: boolean }> {
  try {
    // Create a setup intent for updating the payment method
    const response = await callEdgeFunction<{ clientSecret: string }>(
      'create-setup-intent',
      { userId }
    );

    const { error } = await initPaymentSheet({
      merchantDisplayName: 'Airbnb Cleaner Scheduler',
      setupIntentClientSecret: response.clientSecret,
      allowsDelayedPaymentMethods: false,
      returnURL: 'airbnb-cleaner-scheduler://payment-method-updated',
    });

    if (error) {
      throw new StripeServiceError(error.message, error.code);
    }

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) {
      if (presentError.code === 'Canceled') {
        return { success: false };
      }
      throw new StripeServiceError(presentError.message, presentError.code);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to update payment method'
    );
  }
}

/**
 * Get the user's current subscription status
 * @param userId - The user's ID
 * @returns Promise with subscription details
 */
export async function getSubscriptionStatus(
  userId: string
): Promise<StripeSubscription | null> {
  try {
    const response = await callEdgeFunction<{ subscription: StripeSubscription | null }>(
      'get-subscription',
      { userId }
    );

    return response.subscription;
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to fetch subscription status'
    );
  }
}

/**
 * Get the user's invoice history
 * @param userId - The user's ID
 * @param limit - Maximum number of invoices to return (default: 10)
 * @returns Promise with array of invoices
 */
export async function getInvoices(
  userId: string,
  limit: number = 10
): Promise<StripeInvoice[]> {
  try {
    const response = await callEdgeFunction<{ invoices: StripeInvoice[] }>(
      'get-invoices',
      { userId, limit }
    );

    return response.invoices;
  } catch (error) {
    if (error instanceof StripeServiceError) {
      throw error;
    }
    throw new StripeServiceError(
      error instanceof Error ? error.message : 'Failed to fetch invoices'
    );
  }
}

/**
 * Format currency amount for display
 * @param amount - Amount in cents
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

/**
 * Get brand display name for card brand
 * @param brand - Card brand code
 * @returns Display name
 */
export function getCardBrandName(brand: string): string {
  const brandMap: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };

  return brandMap[brand.toLowerCase()] || brand;
}

export default {
  initializePaymentSheet,
  presentPaymentSheetUI,
  createSubscription,
  cancelSubscription,
  updatePaymentMethod,
  getSubscriptionStatus,
  getInvoices,
  formatCurrency,
  getCardBrandName,
};
