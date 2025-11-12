import { supabase } from './supabase';
import type { ApiError } from '@/types';

export class AuthService {
  /**
   * Sign up with email and password
   */
  static async signUp(email: string, password: string, fullName?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to sign up',
        code: error.code,
        details: error,
      };
      return { data: null, error: apiError };
    }
  }

  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to sign in',
        code: error.code,
        details: error,
      };
      return { data: null, error: apiError };
    }
  }

  /**
   * Sign out current user
   */
  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to sign out',
        code: error.code,
        details: error,
      };
      return { error: apiError };
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'cleanerscheduler://reset-password',
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to send reset email',
        code: error.code,
        details: error,
      };
      return { error: apiError };
    }
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to update password',
        code: error.code,
        details: error,
      };
      return { error: apiError };
    }
  }

  /**
   * Get current session
   */
  static async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { data: data.session, error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to get session',
        code: error.code,
        details: error,
      };
      return { data: null, error: apiError };
    }
  }

  /**
   * Get current user
   */
  static async getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data: data.user, error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to get user',
        code: error.code,
        details: error,
      };
      return { data: null, error: apiError };
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: {
    full_name?: string;
    phone?: string;
  }) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates,
      });

      if (error) throw error;
      return { data: data.user, error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to update profile',
        code: error.code,
        details: error,
      };
      return { data: null, error: apiError };
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return { data: data.session, error: null };
    } catch (error: any) {
      const apiError: ApiError = {
        message: error.message || 'Failed to refresh session',
        code: error.code,
        details: error,
      };
      return { data: null, error: apiError };
    }
  }
}
