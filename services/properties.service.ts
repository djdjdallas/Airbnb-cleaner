/**
 * Properties Service
 *
 * Handles all CRUD operations and business logic for property management
 * including calendar syncing and property-cleaner relationships.
 */

import { supabase } from './supabase';
import type {
  Property,
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyWithCleaners,
  ApiError,
  CleaningJob,
  PropertyCleaner,
} from '../types';

interface ServiceResponse<T> {
  data: T | null;
  error: ApiError | null;
}

/**
 * Get all properties for a specific user
 *
 * @param userId - The user ID to fetch properties for
 * @returns Promise with properties array or error
 */
export async function getAllProperties(
  userId: string
): Promise<ServiceResponse<Property[]>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

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
 * Get a single property by ID
 *
 * @param id - The property ID
 * @returns Promise with property or error
 */
export async function getPropertyById(
  id: string
): Promise<ServiceResponse<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
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
          message: 'Property not found',
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
 * Create a new property
 *
 * @param userId - The user ID who owns the property
 * @param propertyData - The property data to create
 * @returns Promise with created property or error
 */
export async function createProperty(
  userId: string,
  propertyData: CreatePropertyInput
): Promise<ServiceResponse<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .insert({
        user_id: userId,
        name: propertyData.name,
        address: propertyData.address || null,
        ical_url: propertyData.ical_url,
        active: true,
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
 * Update an existing property
 *
 * @param id - The property ID to update
 * @param propertyData - The partial property data to update
 * @returns Promise with updated property or error
 */
export async function updateProperty(
  id: string,
  propertyData: UpdatePropertyInput
): Promise<ServiceResponse<Property>> {
  try {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (propertyData.name !== undefined) {
      updateData.name = propertyData.name;
    }
    if (propertyData.address !== undefined) {
      updateData.address = propertyData.address;
    }
    if (propertyData.ical_url !== undefined) {
      updateData.ical_url = propertyData.ical_url;
    }
    if (propertyData.active !== undefined) {
      updateData.active = propertyData.active;
    }

    const { data, error } = await supabase
      .from('properties')
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
          message: 'Property not found',
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
 * Delete a property
 *
 * Note: This will cascade delete related property_cleaners and cleaning_jobs
 * based on database foreign key constraints
 *
 * @param id - The property ID to delete
 * @returns Promise with success status or error
 */
export async function deleteProperty(
  id: string
): Promise<ServiceResponse<{ success: boolean }>> {
  try {
    const { error } = await supabase
      .from('properties')
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
 * Trigger a manual calendar sync for a property
 *
 * This updates the last_synced timestamp and clears any previous sync errors.
 * The actual iCal parsing and job creation should be handled by a background job.
 *
 * @param propertyId - The property ID to sync
 * @returns Promise with updated property or error
 */
export async function syncPropertyCalendar(
  propertyId: string
): Promise<ServiceResponse<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({
        last_synced: new Date().toISOString(),
        sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
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
          message: 'Property not found',
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
 * Get property with full details including assigned cleaners and upcoming jobs
 *
 * @param id - The property ID
 * @returns Promise with property details or error
 */
export async function getPropertyWithDetails(
  id: string
): Promise<ServiceResponse<PropertyWithCleaners>> {
  try {
    // Fetch property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();

    if (propertyError) {
      return {
        data: null,
        error: {
          message: propertyError.message,
          code: propertyError.code,
          details: propertyError.details,
        },
      };
    }

    if (!property) {
      return {
        data: null,
        error: {
          message: 'Property not found',
          code: 'NOT_FOUND',
        },
      };
    }

    // Fetch assigned cleaners
    const { data: propertyCleaners, error: cleanersError } = await supabase
      .from('property_cleaners')
      .select(`
        *,
        cleaner:cleaners(*)
      `)
      .eq('property_id', id);

    if (cleanersError) {
      return {
        data: null,
        error: {
          message: cleanersError.message,
          code: cleanersError.code,
          details: cleanersError.details,
        },
      };
    }

    // Fetch upcoming jobs (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: upcomingJobs, error: jobsError } = await supabase
      .from('cleaning_jobs')
      .select(`
        *,
        cleaner:cleaners(*)
      `)
      .eq('property_id', id)
      .gte('checkout_date', new Date().toISOString())
      .lte('checkout_date', thirtyDaysFromNow.toISOString())
      .order('checkout_date', { ascending: true });

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

    const propertyWithDetails: PropertyWithCleaners = {
      ...property,
      cleaners: (propertyCleaners || []) as PropertyCleaner[],
      upcoming_jobs: (upcomingJobs || []) as CleaningJob[],
    };

    return { data: propertyWithDetails, error: null };
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      },
    };
  }
}
