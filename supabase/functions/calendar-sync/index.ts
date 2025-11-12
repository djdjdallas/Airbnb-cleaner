/**
 * Calendar Sync Cron Job Edge Function
 * Runs every 6 hours to sync iCal calendars and create cleaning jobs
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import * as ICAL from 'https://esm.sh/ical.js@1.5.0';
import { corsHeaders, jsonResponse, errorResponse, handleCors } from '../_shared/cors.ts';

// Types
interface Property {
  id: string;
  user_id: string;
  name: string;
  ical_url: string;
  last_synced: string | null;
}

interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

interface ParsedCheckout {
  date: Date;
  event: ICalEvent;
  has_same_day_checkin: boolean;
  next_checkin_date?: Date;
}

interface PropertyCleaner {
  cleaner_id: string;
  is_primary: boolean;
}

interface SyncResult {
  property_id: string;
  property_name: string;
  success: boolean;
  jobs_created: number;
  error?: string;
}

/**
 * Parse iCal data from URL
 */
async function parseICalFromUrl(url: string): Promise<ICalEvent[]> {
  try {
    // Convert webcal:// to https://
    const fetchUrl = url.replace(/^webcal:\/\//i, 'https://');

    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/calendar, application/ics, text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();

    if (!icalData || icalData.trim().length === 0) {
      throw new Error('iCal data is empty');
    }

    return parseICalData(icalData);
  } catch (error) {
    console.error('Error parsing iCal from URL:', error);
    throw error;
  }
}

/**
 * Parse iCal data string
 */
function parseICalData(icalData: string): ICalEvent[] {
  try {
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events: ICalEvent[] = [];

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent);
        const uid = event.uid || '';
        const summary = event.summary || 'Untitled Event';
        const description = event.description || '';
        const location = event.location || '';

        if (!event.startDate) continue;

        const startDate = event.startDate.toJSDate();
        const endDate = event.endDate ? event.endDate.toJSDate() : new Date(startDate);

        events.push({
          uid,
          summary,
          description,
          start: startDate,
          end: endDate,
          location,
        });
      } catch (eventError) {
        console.error('Error parsing individual event:', eventError);
      }
    }

    return events;
  } catch (error) {
    console.error('Error parsing iCal data:', error);
    throw new Error('Failed to parse iCal data');
  }
}

/**
 * Extract checkouts from events
 */
function extractCheckouts(events: ICalEvent[]): ParsedCheckout[] {
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }

  const sortedEvents = [...events].sort((a, b) => a.end.getTime() - b.end.getTime());
  const checkouts: ParsedCheckout[] = [];

  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const summary = event.summary.toLowerCase();
    const isBlocked =
      summary.includes('blocked') ||
      summary.includes('unavailable') ||
      summary.includes('not available') ||
      summary === 'busy';

    if (isBlocked) continue;

    const checkoutDate = event.end;
    const hasSameDayCheckin = detectSameDayTurnaround(checkoutDate, sortedEvents);

    let nextCheckinDate: Date | undefined;
    for (let j = i + 1; j < sortedEvents.length; j++) {
      const nextEvent = sortedEvents[j];
      const nextSummary = nextEvent.summary.toLowerCase();
      const isNextBlocked =
        nextSummary.includes('blocked') ||
        nextSummary.includes('unavailable') ||
        nextSummary.includes('not available') ||
        nextSummary === 'busy';

      if (!isNextBlocked) {
        nextCheckinDate = nextEvent.start;
        break;
      }
    }

    checkouts.push({
      date: checkoutDate,
      event,
      has_same_day_checkin: hasSameDayCheckin,
      next_checkin_date: nextCheckinDate,
    });
  }

  return checkouts;
}

/**
 * Detect same-day turnaround
 */
function detectSameDayTurnaround(checkoutDate: Date, events: ICalEvent[]): boolean {
  const checkoutDay = new Date(checkoutDate);
  checkoutDay.setHours(0, 0, 0, 0);

  for (const event of events) {
    const eventStartDay = new Date(event.start);
    eventStartDay.setHours(0, 0, 0, 0);

    if (eventStartDay.getTime() === checkoutDay.getTime()) {
      const summary = event.summary.toLowerCase();
      const isBlocked =
        summary.includes('blocked') ||
        summary.includes('unavailable') ||
        summary.includes('not available') ||
        summary === 'busy';

      if (!isBlocked) return true;
    }
  }

  return false;
}

/**
 * Filter upcoming checkouts (next 30 days)
 */
function filterUpcomingCheckouts(checkouts: ParsedCheckout[], days: number = 30): ParsedCheckout[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);

  return checkouts.filter(checkout => {
    const checkoutDay = new Date(checkout.date);
    checkoutDay.setHours(0, 0, 0, 0);
    return checkoutDay >= now && checkoutDay <= futureDate;
  });
}

/**
 * Sync a single property
 */
async function syncProperty(property: Property, supabase: any): Promise<SyncResult> {
  const result: SyncResult = {
    property_id: property.id,
    property_name: property.name,
    success: false,
    jobs_created: 0,
  };

  try {
    // Parse iCal
    const events = await parseICalFromUrl(property.ical_url);
    const checkouts = extractCheckouts(events);
    const upcomingCheckouts = filterUpcomingCheckouts(checkouts, 30);

    // Get primary cleaner for this property
    const { data: propertyCleaners, error: cleanerError } = await supabase
      .from('property_cleaners')
      .select('cleaner_id, is_primary')
      .eq('property_id', property.id)
      .order('is_primary', { ascending: false });

    if (cleanerError) {
      throw new Error(`Failed to fetch cleaners: ${cleanerError.message}`);
    }

    const primaryCleaner = propertyCleaners?.find((pc: PropertyCleaner) => pc.is_primary);
    const assignedCleanerId = primaryCleaner?.cleaner_id || propertyCleaners?.[0]?.cleaner_id || null;

    // Process each checkout
    for (const checkout of upcomingCheckouts) {
      const checkoutDateStr = checkout.date.toISOString().split('T')[0];
      const checkinDateStr = checkout.next_checkin_date
        ? checkout.next_checkin_date.toISOString().split('T')[0]
        : null;

      // Check if job already exists
      const { data: existingJobs, error: checkError } = await supabase
        .from('cleaning_jobs')
        .select('id')
        .eq('property_id', property.id)
        .eq('checkout_date', checkoutDateStr);

      if (checkError) {
        console.error('Error checking existing job:', checkError);
        continue;
      }

      if (existingJobs && existingJobs.length > 0) {
        // Job already exists, skip
        continue;
      }

      // Create new cleaning job
      const { error: insertError } = await supabase
        .from('cleaning_jobs')
        .insert({
          property_id: property.id,
          cleaner_id: assignedCleanerId,
          checkout_date: checkoutDateStr,
          checkin_date: checkinDateStr,
          status: 'pending',
          is_same_day_turnaround: checkout.has_same_day_checkin,
        });

      if (insertError) {
        console.error('Error creating job:', insertError);
        continue;
      }

      result.jobs_created++;
    }

    // Update last_synced timestamp
    await supabase
      .from('properties')
      .update({
        last_synced: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', property.id);

    result.success = true;
  } catch (error: any) {
    result.error = error.message || 'Unknown error';

    // Update sync_error in database
    await supabase
      .from('properties')
      .update({
        sync_error: result.error,
      })
      .eq('id', property.id);
  }

  return result;
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse('Missing Supabase configuration', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('active', true);

    if (propertiesError) {
      throw new Error(`Failed to fetch properties: ${propertiesError.message}`);
    }

    if (!properties || properties.length === 0) {
      return jsonResponse({
        message: 'No active properties to sync',
        synced: 0,
        errors: 0,
        jobs_created: 0,
      });
    }

    // Sync each property
    const results: SyncResult[] = [];
    for (const property of properties) {
      const result = await syncProperty(property, supabase);
      results.push(result);
    }

    // Calculate summary
    const synced = results.filter(r => r.success).length;
    const errors = results.filter(r => !r.success).length;
    const jobs_created = results.reduce((sum, r) => sum + r.jobs_created, 0);

    // Log results
    console.log('Calendar sync completed:', {
      synced,
      errors,
      jobs_created,
      results,
    });

    return jsonResponse({
      message: 'Calendar sync completed',
      synced,
      errors,
      jobs_created,
      details: results,
    });
  } catch (error: any) {
    console.error('Calendar sync error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
