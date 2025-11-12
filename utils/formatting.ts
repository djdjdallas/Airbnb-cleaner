/**
 * Data formatting utilities for the Airbnb Cleaner Scheduler app
 */

import { format as dateFnsFormat, formatDistanceToNow, parseISO } from 'date-fns';
import { parsePhoneNumber } from 'libphonenumber-js';

/**
 * Formats a date using date-fns
 * @param date - Date string or Date object
 * @param format - Optional format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, format: string = 'MMM d, yyyy'): string {
  try {
    if (!date) {
      return '';
    }

    let dateObj: Date;

    if (typeof date === 'string') {
      // Try to parse ISO string
      dateObj = parseISO(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    return dateFnsFormat(dateObj, format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Formats a number as currency in USD format
 * @param amount - Amount to format
 * @returns Formatted currency string (e.g., "$25.00")
 */
export function formatCurrency(amount: number): string {
  try {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }

    // Handle negative amounts
    const isNegative = amount < 0;
    const absoluteAmount = Math.abs(amount);

    // Format to 2 decimal places
    const formatted = absoluteAmount.toFixed(2);

    // Add commas for thousands
    const [dollars, cents] = formatted.split('.');
    const dollarsWithCommas = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const result = `$${dollarsWithCommas}.${cents}`;

    return isNegative ? `-${result}` : result;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0.00';
  }
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 * Falls back to original string if parsing fails
 * @param phone - Phone number to format
 * @returns Formatted phone number
 */
export function formatPhone(phone: string): string {
  try {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    const trimmedPhone = phone.trim();

    // Try to parse as US number first
    try {
      const phoneNumber = parsePhoneNumber(trimmedPhone, 'US');
      if (phoneNumber) {
        // Format as (XXX) XXX-XXXX for US numbers
        const national = phoneNumber.formatNational();
        return national;
      }
    } catch (e) {
      // If US parsing fails, try international
    }

    // Try international parsing
    try {
      const phoneNumber = parsePhoneNumber(trimmedPhone);
      if (phoneNumber) {
        // Use international format for non-US numbers
        return phoneNumber.formatInternational();
      }
    } catch (e) {
      // If all parsing fails, return cleaned original
    }

    // Fallback: Return cleaned version of original
    // Remove all non-digit characters except +
    const cleaned = trimmedPhone.replace(/[^\d+]/g, '');

    // If it looks like a US number (10 digits), format it
    const digitsOnly = cleaned.replace(/\+/g, '');
    if (digitsOnly.length === 10) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }

    return cleaned || trimmedPhone;
  } catch (error) {
    console.error('Error formatting phone:', error);
    return phone;
  }
}

/**
 * Formats a date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param date - Date string or Date object
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  try {
    if (!date) {
      return '';
    }

    let dateObj: Date;

    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    // Get relative time
    const relativeTime = formatDistanceToNow(dateObj, { addSuffix: true });

    return relativeTime;
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

/**
 * Truncates text to a maximum length and adds ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length (including ellipsis)
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  try {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (typeof maxLength !== 'number' || maxLength < 1) {
      return text;
    }

    // If text is already shorter than maxLength, return as is
    if (text.length <= maxLength) {
      return text;
    }

    // Truncate and add ellipsis
    // Reserve 3 characters for ellipsis
    const truncateAt = Math.max(0, maxLength - 3);
    const truncated = text.slice(0, truncateAt).trim();

    return `${truncated}...`;
  } catch (error) {
    console.error('Error truncating text:', error);
    return text;
  }
}

/**
 * Formats a date range as a string
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range (e.g., "Jan 1 - Jan 5, 2024")
 */
export function formatDateRange(startDate: string | Date, endDate: string | Date): string {
  try {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '';
    }

    // If same day, just show one date
    if (dateFnsFormat(start, 'yyyy-MM-dd') === dateFnsFormat(end, 'yyyy-MM-dd')) {
      return dateFnsFormat(start, 'MMM d, yyyy');
    }

    // If same month and year
    if (
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return `${dateFnsFormat(start, 'MMM d')} - ${dateFnsFormat(end, 'd, yyyy')}`;
    }

    // If same year
    if (start.getFullYear() === end.getFullYear()) {
      return `${dateFnsFormat(start, 'MMM d')} - ${dateFnsFormat(end, 'MMM d, yyyy')}`;
    }

    // Different years
    return `${dateFnsFormat(start, 'MMM d, yyyy')} - ${dateFnsFormat(end, 'MMM d, yyyy')}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return '';
  }
}
