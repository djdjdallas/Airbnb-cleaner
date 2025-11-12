/**
 * Stripe Provider Wrapper
 * Initializes and wraps the app with Stripe context
 */

import React from 'react';
import { StripeProvider as StripeReactNativeProvider } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface StripeProviderProps {
  children: React.ReactNode;
}

/**
 * Stripe Provider Component
 * Wraps the application with Stripe context using the publishable key
 */
export function StripeProvider({ children }: StripeProviderProps) {
  // Validate that the Stripe key is present
  if (!STRIPE_PUBLISHABLE_KEY) {
    console.error('Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
    Alert.alert(
      'Configuration Error',
      'Stripe is not properly configured. Please contact support.'
    );
    // Return children without Stripe provider in development
    // In production, you might want to show an error screen instead
    return <>{children}</>;
  }

  // Validate the key format
  if (
    !STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') &&
    !STRIPE_PUBLISHABLE_KEY.startsWith('pk_live_')
  ) {
    console.error('Invalid Stripe publishable key format');
    Alert.alert(
      'Configuration Error',
      'Stripe key is invalid. Please contact support.'
    );
    return <>{children}</>;
  }

  return (
    <StripeReactNativeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.airbnb-cleaner-scheduler" // Required for Apple Pay
      urlScheme="airbnb-cleaner-scheduler" // Required for 3D Secure and other redirects
    >
      {children}
    </StripeReactNativeProvider>
  );
}

export default StripeProvider;
