/**
 * Input validation utilities for the Airbnb Cleaner Scheduler app
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

/**
 * Validates an email address using RFC 5322 standard
 * @param email - Email address to validate
 * @returns True if email is valid
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmedEmail = email.trim();

  if (!emailRegex.test(trimmedEmail)) {
    return false;
  }

  // Additional checks for common issues
  if (trimmedEmail.length > 254) {
    return false; // Max email length
  }

  const [localPart, domain] = trimmedEmail.split('@');
  if (localPart.length > 64 || domain.length > 253) {
    return false;
  }

  return true;
}

/**
 * Validates a phone number using libphonenumber-js
 * Supports US and international formats
 * @param phone - Phone number to validate
 * @returns True if phone number is valid
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  try {
    const trimmedPhone = phone.trim();

    // Try to validate as international number first
    if (isValidPhoneNumber(trimmedPhone)) {
      return true;
    }

    // Try to validate as US number (default country)
    if (isValidPhoneNumber(trimmedPhone, 'US')) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Validates an iCal URL format and structure
 * @param url - iCal URL to validate
 * @returns True if URL is valid iCal format
 */
export function validateICalUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const trimmedUrl = url.trim();

    // Must be a valid URL
    const urlObj = new URL(trimmedUrl);

    // Must use http or https protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Common iCal URL patterns from major platforms
    const icalPatterns = [
      /\.ics$/i, // Ends with .ics
      /\/ical\//i, // Contains /ical/
      /airbnb\.com.*calendar/i, // Airbnb calendar
      /vrbo\.com.*calendar/i, // VRBO calendar
      /booking\.com.*calendar/i, // Booking.com calendar
      /webcal:\/\//i, // Webcal protocol (converted to http/https)
    ];

    // Check if URL matches any known iCal pattern
    const matchesPattern = icalPatterns.some(pattern => pattern.test(trimmedUrl));

    return matchesPattern;
  } catch (error) {
    return false;
  }
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a password against security requirements
 * Requirements: Minimum 8 characters, 1 uppercase letter, 1 number
 * @param password - Password to validate
 * @returns Validation result with errors array
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }

  // Check minimum length
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Optional: Check for common weak passwords
  const weakPasswords = [
    'password', 'password1', 'password123', '12345678', 'qwerty123',
    'welcome1', 'letmein1', 'admin123'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes potentially dangerous HTML/script tags and characters
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove script tags and their contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove other potentially dangerous tags
  const dangerousTags = [
    'iframe', 'embed', 'object', 'applet', 'meta', 'link', 'style',
    'img', 'video', 'audio', 'svg', 'math'
  ];

  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also remove self-closing tags
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  });

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');

  // Encode HTML special characters
  const htmlEntities: { [key: string]: string } = {
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  sanitized = sanitized.replace(/[<>"'\/]/g, (char) => htmlEntities[char] || char);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized.trim();
}
