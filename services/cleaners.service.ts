/**
 * Cleaners Service
 *
 * Handles all CRUD operations and business logic for cleaner management
 * including property assignments and payment statistics.
 */

import { supabase } from './supabase';
import type {
  Cleaner,
  CreateCleanerInput,
  UpdateCleanerInput,
  CleanerWithStats,
  Property,
  ApiError,
} from '../types';

interface ServiceResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Get all cleaners for a specific user
 *
 * @param userId - The user ID to fetch cleaners for
 * @returns Promise with cleaners array or error
 */
export async function getAllCleaners(
  userId: string
): Promise<ServiceResponse<Cleaner[]>> {
  try {
    const { data, error } = await supabase
      .from('cleaners')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

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
 * Get a single cleaner by ID
 *
 * @param id - The cleaner ID
 * @returns Promise with cleaner or error
 */
export async function getCleanerById(
  id: string
): Promise<ServiceResponse<Cleaner>> {
  try {
    const { data, error } = await supabase
      .from('cleaners')
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
          message: 'Cleaner not found',
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
 * Create a new cleaner
 *
 * @param userId - The user ID who owns the cleaner
 * @param cleanerData - The cleaner data to create
 * @returns Promise with created cleaner or error
 */
export async function createCleaner(
  userId: string,
  cleanerData: CreateCleanerInput
): Promise<ServiceResponse<Cleaner>> {
  try {
    const { data, error } = await supabase
      .from('cleaners')
      .insert({
        user_id: userId,
        name: cleanerData.name,
        phone: cleanerData.phone,
        hourly_rate: cleanerData.hourly_rate || null,
        active: true,
        sms_opt_out: false,
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
 * Update an existing cleaner
 *
 * @param id - The cleaner ID to update
 * @param cleanerData - The partial cleaner data to update
 * @returns Promise with updated cleaner or error
 */
export async function updateCleaner(
  id: string,
  cleanerData: UpdateCleanerInput
): Promise<ServiceResponse<Cleaner>> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (cleanerData.name !== undefined) {
      updateData.name = cleanerData.name;
    }
    if (cleanerData.phone !== undefined) {
      updateData.phone = cleanerData.phone;
    }
    if (cleanerData.hourly_rate !== undefined) {
      updateData.hourly_rate = cleanerData.hourly_rate;
    }
    if (cleanerData.active !== undefined) {
      updateData.active = cleanerData.active;
    }

    const { data, error } = await supabase
      .from('cleaners')
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
          message: 'Cleaner not found',
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
 * Delete a cleaner
 *
 * Note: This will cascade delete related property_cleaners based on database
 * foreign key constraints. Cleaning jobs will set cleaner_id to null.
 *
 * @param id - The cleaner ID to delete
 * @returns Promise with success status or error
 */
export async function deleteCleaner(
  id: string
): Promise<ServiceResponse<{ success: boolean }>> {
  try {
    const { error } = await supabase
      .from('cleaners')
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
 * Get cleaner with statistics including payment summary and job history
 *
 * @param id - The cleaner ID
 * @returns Promise with cleaner stats or error
 */
export async function getCleanerWithStats(
  id: string
): Promise<ServiceResponse<CleanerWithStats>> {
  try {
    // Fetch cleaner
    const { data: cleaner, error: cleanerError } = await supabase
      .from('cleaners')
      .select('*')
      .eq('id', id)
      .single();

    if (cleanerError) {
      return {
        data: null,
        error: {
          message: cleanerError.message,
          code: cleanerError.code,
          details: cleanerError.details,
        },
      };
    }

    if (!cleaner) {
      return {
        data: null,
        error: {
          message: 'Cleaner not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Fetch job statistics
    const { data: jobs, error: jobsError } = await supabase
      .from('cleaning_jobs')
      .select('amount_owed, payment_status, checkout_date')
      .eq('cleaner_id', id)
      .order('checkout_date', { ascending: false });

    if (jobsError) {
      return {
        data: null,
        error: {
          message: jobsError.message,
          code: jobsError.code,
          details: jobsError.details,
        },
      };
    }

    // Calculate statistics
    const totalJobs = jobs?.length || 0;
    const unpaidAmount = jobs
      ?.filter(job => job.payment_status === 'unpaid')
      .reduce((sum, job) => sum + (job.amount_owed || 0), 0) || 0;
    const lastJobDate = jobs && jobs.length > 0 ? jobs[0].checkout_date : null;

    // Fetch assigned properties
    const { data: propertyCleaners, error: propertiesError } = await supabase
      .from('property_cleaners')
      .select(`
        property:properties(*)
      `)
      .eq('cleaner_id', id);

    if (propertiesError) {
      return {
        data: null,
        error: {
          message: propertiesError.message,
          code: propertiesError.code,
          details: propertiesError.details,
        },
      };
    }

    const assignedProperties = propertyCleaners
      ?.map(pc => (pc as any).property)
      .filter(Boolean) || [];

    const cleanerWithStats: CleanerWithStats = {
      ...cleaner,
      total_jobs: totalJobs,
      unpaid_amount: unpaidAmount,
      last_job_date: lastJobDate,
      assigned_properties: assignedProperties as Property[],
    };

    return { data: cleanerWithStats, error: null };
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
 * Assign a cleaner to a property
 *
 * @param cleanerId - The cleaner ID
 * @param propertyId - The property ID
 * @param isPrimary - Whether this is the primary cleaner for the property
 * @returns Promise with assignment record or error
 */
export async function assignCleanerToProperty(
  cleanerId: string,
  propertyId: string,
  isPrimary: boolean = false
): Promise<ServiceResponse<{ success: boolean; id: string }>> {
  try {
    // Check if assignment already exists
    const { data: existing, error: existingError } = await supabase
      .from('property_cleaners')
      .select('id')
      .eq('cleaner_id', cleanerId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (existingError) {
      return {
        data: null,
        error: {
          message: existingError.message,
          code: existingError.code,
          details: existingError.details,
        },
      };
    }

    if (existing) {
      return {
        data: null,
        error: {
          message: 'Cleaner is already assigned to this property',
          code: 'ALREADY_EXISTS',
        },
      };
    }

    // If setting as primary, unset other primary cleaners for this property
    if (isPrimary) {
      const { error: updateError } = await supabase
        .from('property_cleaners')
        .update({ is_primary: false })
        .eq('property_id', propertyId)
        .eq('is_primary', true);

      if (updateError) {
        return {
          data: null,
          error: {
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
          },
        };
      }
    }

    // Create assignment
    const { data, error } = await supabase
      .from('property_cleaners')
      .insert({
        cleaner_id: cleanerId,
        property_id: propertyId,
        is_primary: isPrimary,
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

    return { data: { success: true, id: data.id }, error: null };
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
 * Remove a cleaner from a property
 *
 * @param cleanerId - The cleaner ID
 * @param propertyId - The property ID
 * @returns Promise with success status or error
 */
export async function removeCleanerFromProperty(
  cleanerId: string,
  propertyId: string
): Promise<ServiceResponse<{ success: boolean }>> {
  try {
    const { error } = await supabase
      .from('property_cleaners')
      .delete()
      .eq('cleaner_id', cleanerId)
      .eq('property_id', propertyId);

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
