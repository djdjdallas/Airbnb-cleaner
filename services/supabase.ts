import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

// Custom storage adapter that uses SecureStore for sensitive data on native
// and AsyncStorage for web/less sensitive data
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Type-safe database types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// Database type definitions (generated from Supabase CLI)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          stripe_customer_id: string | null;
          subscription_status: string | null;
          expo_push_token: string | null;
          sms_consent_granted: boolean;
          sms_consent_granted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          expo_push_token?: string | null;
          sms_consent_granted?: boolean;
          sms_consent_granted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: string | null;
          expo_push_token?: string | null;
          sms_consent_granted?: boolean;
          sms_consent_granted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string | null;
          ical_url: string;
          last_synced: string | null;
          sync_error: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address?: string | null;
          ical_url: string;
          last_synced?: string | null;
          sync_error?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string | null;
          ical_url?: string;
          last_synced?: string | null;
          sync_error?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cleaners: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          hourly_rate: number | null;
          active: boolean;
          sms_opt_out: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          hourly_rate?: number | null;
          active?: boolean;
          sms_opt_out?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          hourly_rate?: number | null;
          active?: boolean;
          sms_opt_out?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      property_cleaners: {
        Row: {
          id: string;
          property_id: string;
          cleaner_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          cleaner_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          cleaner_id?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      cleaning_jobs: {
        Row: {
          id: string;
          property_id: string;
          cleaner_id: string | null;
          checkout_date: string;
          checkin_date: string | null;
          status: string;
          sms_sent_at: string | null;
          confirmed_at: string | null;
          completed_at: string | null;
          cancelled_at: string | null;
          amount_owed: number | null;
          payment_status: string;
          payment_date: string | null;
          notes: string | null;
          is_same_day_turnaround: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          cleaner_id?: string | null;
          checkout_date: string;
          checkin_date?: string | null;
          status?: string;
          sms_sent_at?: string | null;
          confirmed_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          amount_owed?: number | null;
          payment_status?: string;
          payment_date?: string | null;
          notes?: string | null;
          is_same_day_turnaround?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          cleaner_id?: string | null;
          checkout_date?: string;
          checkin_date?: string | null;
          status?: string;
          sms_sent_at?: string | null;
          confirmed_at?: string | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          amount_owed?: number | null;
          payment_status?: string;
          payment_date?: string | null;
          notes?: string | null;
          is_same_day_turnaround?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sms_logs: {
        Row: {
          id: string;
          cleaning_job_id: string | null;
          phone: string;
          message: string;
          direction: string;
          twilio_sid: string | null;
          status: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          cleaning_job_id?: string | null;
          phone: string;
          message: string;
          direction: string;
          twilio_sid?: string | null;
          status?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          cleaning_job_id?: string | null;
          phone?: string;
          message?: string;
          direction?: string;
          twilio_sid?: string | null;
          status?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
    };
    Enums: {
      subscription_status:
        | 'active'
        | 'trialing'
        | 'past_due'
        | 'canceled'
        | 'unpaid'
        | 'incomplete'
        | 'incomplete_expired';
      job_status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
      payment_status: 'unpaid' | 'paid';
    };
  };
}
