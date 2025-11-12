/**
 * iCal parsing utilities for calendar synchronization
 * Supports Airbnb, VRBO, Booking.com, and other iCal formats
 */

import ICAL from 'ical.js';
import { ICalEvent, ParsedCheckout } from '../types';

/**
 * Fetches and parses iCal data from a URL
 * @param url - iCal URL to fetch
 * @returns Array of parsed iCal events
 */
export async function parseICalFromUrl(url: string): Promise<ICalEvent[]> {
  try {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid iCal URL');
    }

    // Convert webcal:// to https://
    const fetchUrl = url.replace(/^webcal:\/\//i, 'https://');

    // Fetch the iCal data
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

    // Parse the iCal data
    return parseICalData(icalData);
  } catch (error) {
    console.error('Error parsing iCal from URL:', error);
    throw error;
  }
}

/**
 * Parses iCal data string into events
 * @param icalData - Raw iCal data string
 * @returns Array of parsed events
 */
export function parseICalData(icalData: string): ICalEvent[] {
  try {
    // Parse the iCal string
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events: ICalEvent[] = [];

    for (const vevent of vevents) {
      try {
        const event = new ICAL.Event(vevent);

        // Extract event properties
        const uid = event.uid || '';
        const summary = event.summary || 'Untitled Event';
        const description = event.description || '';
        const location = event.location || '';

        // Get start and end times
        let startDate: Date;
        let endDate: Date;

        if (event.startDate) {
          startDate = event.startDate.toJSDate();
        } else {
          // Skip events without start date
          continue;
        }

        if (event.endDate) {
          endDate = event.endDate.toJSDate();
        } else {
          // If no end date, assume same as start date
          endDate = new Date(startDate);
        }

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
        // Continue with other events
      }
    }

    return events;
  } catch (error) {
    console.error('Error parsing iCal data:', error);
    throw new Error('Failed to parse iCal data. Please check the format.');
  }
}

/**
 * Extracts checkout dates from iCal events
 * Identifies events that represent reservations/bookings
 * @param events - Array of iCal events
 * @returns Array of parsed checkouts with metadata
 */
export function extractCheckouts(events: ICalEvent[]): ParsedCheckout[] {
  try {
    if (!Array.isArray(events) || events.length === 0) {
      return [];
    }

    // Sort events by end date (checkout date)
    const sortedEvents = [...events].sort((a, b) => a.end.getTime() - b.end.getTime());

    const checkouts: ParsedCheckout[] = [];

    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];

      // Skip events that are not bookings
      // Typically, blocked dates or unavailable dates have specific keywords
      const summary = event.summary.toLowerCase();
      const isBlocked =
        summary.includes('blocked') ||
        summary.includes('unavailable') ||
        summary.includes('not available') ||
        summary === 'busy';

      if (isBlocked) {
        continue;
      }

      // The end date is the checkout date
      const checkoutDate = event.end;

      // Check if there's a same-day check-in (next reservation starts on checkout day)
      const hasSameDayCheckin = detectSameDayTurnaround(checkoutDate, sortedEvents);

      // Find the next check-in date
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
  } catch (error) {
    console.error('Error extracting checkouts:', error);
    return [];
  }
}

/**
 * Detects if there's a same-day turnaround (checkout and check-in on same day)
 * @param checkoutDate - Checkout date to check
 * @param events - All iCal events
 * @returns True if there's a same-day check-in
 */
export function detectSameDayTurnaround(checkoutDate: Date, events: ICalEvent[]): boolean {
  try {
    if (!checkoutDate || !Array.isArray(events)) {
      return false;
    }

    // Get the checkout date at midnight for comparison
    const checkoutDay = new Date(checkoutDate);
    checkoutDay.setHours(0, 0, 0, 0);

    // Check if any event starts on the same day
    for (const event of events) {
      const eventStartDay = new Date(event.start);
      eventStartDay.setHours(0, 0, 0, 0);

      // If an event starts on the same day as checkout
      if (eventStartDay.getTime() === checkoutDay.getTime()) {
        // Make sure it's not a blocked/unavailable event
        const summary = event.summary.toLowerCase();
        const isBlocked =
          summary.includes('blocked') ||
          summary.includes('unavailable') ||
          summary.includes('not available') ||
          summary === 'busy';

        if (!isBlocked) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error detecting same-day turnaround:', error);
    return false;
  }
}

/**
 * Filters checkouts to only include upcoming ones within specified days
 * @param checkouts - Array of parsed checkouts
 * @param days - Number of days to look ahead (default: 30)
 * @returns Filtered array of upcoming checkouts
 */
export function filterUpcomingCheckouts(
  checkouts: ParsedCheckout[],
  days: number = 30
): ParsedCheckout[] {
  try {
    if (!Array.isArray(checkouts) || checkouts.length === 0) {
      return [];
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);

    return checkouts.filter(checkout => {
      const checkoutDay = new Date(checkout.date);
      checkoutDay.setHours(0, 0, 0, 0);

      // Include checkouts from today onwards, up to specified days
      return checkoutDay >= now && checkoutDay <= futureDate;
    });
  } catch (error) {
    console.error('Error filtering upcoming checkouts:', error);
    return [];
  }
}

/**
 * Groups checkouts by month for display purposes
 * @param checkouts - Array of parsed checkouts
 * @returns Map of month keys to checkout arrays
 */
export function groupCheckoutsByMonth(
  checkouts: ParsedCheckout[]
): Map<string, ParsedCheckout[]> {
  const grouped = new Map<string, ParsedCheckout[]>();

  try {
    if (!Array.isArray(checkouts)) {
      return grouped;
    }

    for (const checkout of checkouts) {
      // Create a key like "2024-01" for January 2024
      const monthKey = `${checkout.date.getFullYear()}-${String(
        checkout.date.getMonth() + 1
      ).padStart(2, '0')}`;

      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, []);
      }

      grouped.get(monthKey)!.push(checkout);
    }

    // Sort each month's checkouts by date
    for (const [key, value] of grouped.entries()) {
      grouped.set(
        key,
        value.sort((a, b) => a.date.getTime() - b.date.getTime())
      );
    }

    return grouped;
  } catch (error) {
    console.error('Error grouping checkouts by month:', error);
    return grouped;
  }
}

/**
 * Validates if iCal data is properly formatted
 * @param icalData - Raw iCal data string
 * @returns True if valid iCal format
 */
export function validateICalFormat(icalData: string): boolean {
  try {
    if (!icalData || typeof icalData !== 'string') {
      return false;
    }

    // Check for required iCal headers
    const hasBeginCalendar = /BEGIN:VCALENDAR/i.test(icalData);
    const hasEndCalendar = /END:VCALENDAR/i.test(icalData);

    if (!hasBeginCalendar || !hasEndCalendar) {
      return false;
    }

    // Try to parse it
    try {
      ICAL.parse(icalData);
      return true;
    } catch (parseError) {
      return false;
    }
  } catch (error) {
    return false;
  }
}
