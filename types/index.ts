/**
 * TypeScript types for the Cleaner Scheduler app
 */

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  created_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  ical_url: string;
  last_synced: string | null;
  active: boolean;
  created_at: string;
}

export interface Cleaner {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  hourly_rate: number | null;
  active: boolean;
  created_at: string;
}

export interface PropertyCleaner {
  id: string;
  property_id: string;
  cleaner_id: string;
  is_primary: boolean;
  created_at: string;
  // Joined data
  property?: Property;
  cleaner?: Cleaner;
}

export interface CleaningJob {
  id: string;
  property_id: string;
  cleaner_id: string | null;
  checkout_date: string;
  checkin_date: string | null;
  status: JobStatus;
  sms_sent_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  amount_owed: number | null;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  // Joined data
  property?: Property;
  cleaner?: Cleaner;
}

export interface SmsLog {
  id: string;
  cleaning_job_id: string | null;
  phone: string;
  message: string;
  direction: 'outbound' | 'inbound';
  twilio_sid: string | null;
  status: string | null;
  created_at: string;
}

// Enums
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired'
  | null;

export type JobStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid';

// API request/response types
export interface CreatePropertyInput {
  name: string;
  address?: string;
  ical_url: string;
}

export interface UpdatePropertyInput {
  name?: string;
  address?: string;
  ical_url?: string;
  active?: boolean;
}

export interface CreateCleanerInput {
  name: string;
  phone: string;
  hourly_rate?: number;
}

export interface UpdateCleanerInput {
  name?: string;
  phone?: string;
  hourly_rate?: number;
  active?: boolean;
}

export interface CreateJobInput {
  property_id: string;
  cleaner_id?: string;
  checkout_date: string;
  checkin_date?: string;
  notes?: string;
}

export interface UpdateJobInput {
  cleaner_id?: string;
  status?: JobStatus;
  notes?: string;
  amount_owed?: number;
  payment_status?: PaymentStatus;
}

// UI types
export interface PropertyWithCleaners extends Property {
  cleaners: PropertyCleaner[];
  upcoming_jobs?: CleaningJob[];
}

export interface CleanerWithStats extends Cleaner {
  total_jobs: number;
  unpaid_amount: number;
  last_job_date: string | null;
  assigned_properties: Property[];
}

export interface JobWithDetails extends CleaningJob {
  property: Property;
  cleaner: Cleaner | null;
  sms_logs: SmsLog[];
}

// Form validation types
export interface PropertyFormData {
  name: string;
  address: string;
  ical_url: string;
}

export interface CleanerFormData {
  name: string;
  phone: string;
  hourly_rate: string;
}

export interface ProfileFormData {
  full_name: string;
  phone: string;
  email: string;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

// Notification types
export interface PushNotificationData {
  type: 'job_confirmed' | 'job_declined' | 'job_completed' | 'sync_failed' | 'payment_failed';
  job_id?: string;
  property_id?: string;
  cleaner_id?: string;
  message: string;
}

// iCal types
export interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

export interface ParsedCheckout {
  date: Date;
  event: ICalEvent;
  has_same_day_checkin: boolean;
  next_checkin_date?: Date;
}

// Stripe types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  property_count: number;
  stripe_price_id: string;
  description?: string;
  features?: string[];
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  is_default: boolean;
}

export interface StripeSubscription {
  id: string;
  customer_id: string;
  status: SubscriptionStatus;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  plan: {
    id: string;
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    product: string;
  };
  default_payment_method?: PaymentMethod;
}

export interface StripeInvoice {
  id: string;
  number: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  created: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: number;
  period_end: number;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  customerId: string;
}

export interface CreateSubscriptionResponse {
  subscriptionId: string;
  clientSecret?: string;
  status: SubscriptionStatus;
}

export interface StripeError {
  type: 'api_error' | 'card_error' | 'invalid_request_error' | 'authentication_error';
  message: string;
  code?: string;
  decline_code?: string;
  param?: string;
}

// Analytics types
export interface CleanerPaymentSummary {
  cleaner_id: string;
  cleaner_name: string;
  total_jobs: number;
  total_paid: number;
  total_unpaid: number;
  last_payment_date: string | null;
}

export interface PropertyStats {
  property_id: string;
  property_name: string;
  total_cleanings: number;
  total_cost: number;
  avg_cost_per_cleaning: number;
  last_cleaning_date: string | null;
}
