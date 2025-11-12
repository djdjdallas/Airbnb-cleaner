/**
 * Profile Service
 *
 * Handles all operations related to user profile management including
 * profile updates, push notifications, and SMS consent.
 */

import { supabase } from './supabase';
import type { Profile, ApiError } from '../types';

interface ServiceResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Get user profile by user ID
 *
 * @param userId - The user ID
 * @returns Promise with profile or error
 */
export async function getProfile(
  userId: string
): Promise<ServiceResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'Profile not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Map database row to Profile type
    const profile: Profile = {
      id: data.id,
      email: data.email || '',
      full_name: data.full_name,
      phone: data.phone,
      stripe_customer_id: data.stripe_customer_id,
      subscription_status: data.subscription_status,
      created_at: data.created_at,
    };

    return { data: profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Update user profile
 *
 * @param userId - The user ID
 * @param profileData - Partial profile data to update
 * @returns Promise with updated profile or error
 */
export async function updateProfile(
  userId: string,
  profileData: Partial<Profile>
): Promise<ServiceResponse<Profile>> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are defined in the input
    if (profileData.full_name !== undefined) {
      updateData.full_name = profileData.full_name;
    }
    if (profileData.phone !== undefined) {
      updateData.phone = profileData.phone;
    }
    if (profileData.email !== undefined) {
      updateData.email = profileData.email;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'Profile not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Map database row to Profile type
    const profile: Profile = {
      id: data.id,
      email: data.email || '',
      full_name: data.full_name,
      phone: data.phone,
      stripe_customer_id: data.stripe_customer_id,
      subscription_status: data.subscription_status,
      created_at: data.created_at,
    };

    return { data: profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Update user's Expo push notification token
 *
 * This token is used to send push notifications to the user's device
 *
 * @param userId - The user ID
 * @param token - The Expo push token
 * @returns Promise with updated profile or error
 */
export async function updatePushToken(
  userId: string,
  token: string
): Promise<ServiceResponse<Profile>> {
  try {
    if (!token || token.trim() === '') {
      return {
        data: null,
        error: {
          message: 'Push token cannot be empty',
          code: 'INVALID_INPUT',
        },
      };
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        expo_push_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'Profile not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Map database row to Profile type
    const profile: Profile = {
      id: data.id,
      email: data.email || '',
      full_name: data.full_name,
      phone: data.phone,
      stripe_customer_id: data.stripe_customer_id,
      subscription_status: data.subscription_status,
      created_at: data.created_at,
    };

    return { data: profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Grant SMS consent for the user
 *
 * This records that the user has consented to receive SMS notifications
 * and tracks when the consent was granted.
 *
 * @param userId - The user ID
 * @returns Promise with updated profile or error
 */
export async function grantSmsConsent(
  userId: string
): Promise<ServiceResponse<Profile>> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update({
        sms_consent_granted: true,
        sms_consent_granted_at: now,
        updated_at: now,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'Profile not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Map database row to Profile type
    const profile: Profile = {
      id: data.id,
      email: data.email || '',
      full_name: data.full_name,
      phone: data.phone,
      stripe_customer_id: data.stripe_customer_id,
      subscription_status: data.subscription_status,
      created_at: data.created_at,
    };

    return { data: profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}

/**
 * Revoke SMS consent for the user
 *
 * This records that the user has revoked consent to receive SMS notifications.
 *
 * @param userId - The user ID
 * @returns Promise with updated profile or error
 */
export async function revokeSmsConsent(
  userId: string
): Promise<ServiceResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        sms_consent_granted: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      };
    }

    if (!data) {
      return {
        data: null,
        error: {
          message: 'Profile not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Map database row to Profile type
    const profile: Profile = {
      id: data.id,
      email: data.email || '',
      full_name: data.full_name,
      phone: data.phone,
      stripe_customer_id: data.stripe_customer_id,
      subscription_status: data.subscription_status,
      created_at: data.created_at,
    };

    return { data: profile, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}
