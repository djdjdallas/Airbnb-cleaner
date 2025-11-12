/**
 * Jobs Service
 *
 * Handles all CRUD operations and business logic for cleaning job management
 * including job filtering, status updates, and payment tracking.
 */

import { supabase } from './supabase';
import type {
  CleaningJob,
  CreateJobInput,
  UpdateJobInput,
  JobWithDetails,
  Property,
  Cleaner,
  SmsLog,
  ApiError,
  JobStatus,
} from '../types';

interface ServiceResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Filters for job queries
 */
export interface JobFilters {
  status?: JobStatus | JobStatus[];
  propertyId?: string;
  cleanerId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: 'paid' | 'unpaid';
}

/**
 * Get all jobs for a specific user with optional filters
 *
 * @param userId - The user ID to fetch jobs for
 * @param filters - Optional filters to apply
 * @returns Promise with jobs array or error
 */
export async function getAllJobs(
  userId: string,
  filters?: JobFilters
): Promise<ServiceResponse<CleaningJob[]>> {
  try {
    let query = supabase
      .from('cleaning_jobs')
      .select(`
        *,
        property:properties!inner(*)
      `)
      .eq('property.user_id', userId)
      .order('checkout_date', { ascending: false });

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.propertyId) {
      query = query.eq('property_id', filters.propertyId);
    }

    if (filters?.cleanerId) {
      query = query.eq('cleaner_id', filters.cleanerId);
    }

    if (filters?.startDate) {
      query = query.gte('checkout_date', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('checkout_date', filters.endDate);
    }

    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus);
    }

    const { data, error } = await query;

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

    return { data: data || [], error: null };
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
 * Get a single job by ID
 *
 * @param id - The job ID
 * @returns Promise with job or error
 */
export async function getJobById(
  id: string
): Promise<ServiceResponse<CleaningJob>> {
  try {
    const { data, error } = await supabase
      .from('cleaning_jobs')
      .select('*')
      .eq('id', id)
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
          message: 'Job not found',
          code: 'NOT_FOUND',
        },
      };
    }

    return { data, error: null };
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
 * Create a new cleaning job
 *
 * @param jobData - The job data to create
 * @returns Promise with created job or error
 */
export async function createJob(
  jobData: CreateJobInput
): Promise<ServiceResponse<CleaningJob>> {
  try {
    // Check if property exists
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', jobData.property_id)
      .single();

    if (propertyError || !property) {
      return {
        data: null,
        error: {
          message: 'Property not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Determine if same-day turnaround
    const isSameDayTurnaround = jobData.checkin_date
      ? new Date(jobData.checkout_date).toDateString() ===
        new Date(jobData.checkin_date).toDateString()
      : false;

    const { data, error } = await supabase
      .from('cleaning_jobs')
      .insert({
        property_id: jobData.property_id,
        cleaner_id: jobData.cleaner_id || null,
        checkout_date: jobData.checkout_date,
        checkin_date: jobData.checkin_date || null,
        notes: jobData.notes || null,
        status: 'pending',
        payment_status: 'unpaid',
        is_same_day_turnaround: isSameDayTurnaround,
      })
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

    return { data, error: null };
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
 * Update an existing job
 *
 * @param id - The job ID to update
 * @param jobData - The partial job data to update
 * @returns Promise with updated job or error
 */
export async function updateJob(
  id: string,
  jobData: UpdateJobInput
): Promise<ServiceResponse<CleaningJob>> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (jobData.cleaner_id !== undefined) {
      updateData.cleaner_id = jobData.cleaner_id;
    }
    if (jobData.status !== undefined) {
      updateData.status = jobData.status;

      // Set timestamp based on status
      if (jobData.status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString();
      } else if (jobData.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (jobData.status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }
    }
    if (jobData.notes !== undefined) {
      updateData.notes = jobData.notes;
    }
    if (jobData.amount_owed !== undefined) {
      updateData.amount_owed = jobData.amount_owed;
    }
    if (jobData.payment_status !== undefined) {
      updateData.payment_status = jobData.payment_status;
    }

    const { data, error } = await supabase
      .from('cleaning_jobs')
      .update(updateData)
      .eq('id', id)
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
          message: 'Job not found',
          code: 'NOT_FOUND',
        },
      };
    }

    return { data, error: null };
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
 * Delete a job
 *
 * Note: This will cascade delete related SMS logs based on database
 * foreign key constraints
 *
 * @param id - The job ID to delete
 * @returns Promise with success status or error
 */
export async function deleteJob(
  id: string
): Promise<ServiceResponse<{ success: boolean }>> {
  try {
    const { error } = await supabase
      .from('cleaning_jobs')
      .delete()
      .eq('id', id);

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

    return { data: { success: true }, error: null };
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
 * Get job with full details including property, cleaner, and SMS logs
 *
 * @param id - The job ID
 * @returns Promise with job details or error
 */
export async function getJobWithDetails(
  id: string
): Promise<ServiceResponse<JobWithDetails>> {
  try {
    // Fetch job with property and cleaner
    const { data: job, error: jobError } = await supabase
      .from('cleaning_jobs')
      .select(`
        *,
        property:properties(*),
        cleaner:cleaners(*)
      `)
      .eq('id', id)
      .single();

    if (jobError) {
      return {
        data: null,
        error: {
          message: jobError.message,
          code: jobError.code,
          details: jobError.details,
        },
      };
    }

    if (!job) {
      return {
        data: null,
        error: {
          message: 'Job not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Fetch SMS logs
    const { data: smsLogs, error: smsError } = await supabase
      .from('sms_logs')
      .select('*')
      .eq('cleaning_job_id', id)
      .order('created_at', { ascending: false });

    if (smsError) {
      return {
        data: null,
        error: {
          message: smsError.message,
          code: smsError.code,
          details: smsError.details,
        },
      };
    }

    const jobWithDetails: JobWithDetails = {
      ...(job as any),
      property: (job as any).property as Property,
      cleaner: (job as any).cleaner as Cleaner | null,
      sms_logs: (smsLogs || []) as SmsLog[],
    };

    return { data: jobWithDetails, error: null };
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
 * Mark a job as paid
 *
 * @param id - The job ID
 * @param paymentDate - Optional payment date (defaults to now)
 * @returns Promise with updated job or error
 */
export async function markJobAsPaid(
  id: string,
  paymentDate?: Date
): Promise<ServiceResponse<CleaningJob>> {
  try {
    const { data, error } = await supabase
      .from('cleaning_jobs')
      .update({
        payment_status: 'paid',
        payment_date: (paymentDate || new Date()).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
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
          message: 'Job not found',
          code: 'NOT_FOUND',
        },
      };
    }

    return { data, error: null };
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
 * Get upcoming jobs for a user
 *
 * @param userId - The user ID
 * @param days - Number of days to look ahead (default: 7)
 * @returns Promise with upcoming jobs array or error
 */
export async function getUpcomingJobs(
  userId: string,
  days: number = 7
): Promise<ServiceResponse<CleaningJob[]>> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const { data, error } = await supabase
      .from('cleaning_jobs')
      .select(`
        *,
        property:properties!inner(*),
        cleaner:cleaners(*)
      `)
      .eq('property.user_id', userId)
      .gte('checkout_date', today.toISOString())
      .lte('checkout_date', futureDate.toISOString())
      .in('status', ['pending', 'confirmed'])
      .order('checkout_date', { ascending: true });

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

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}
