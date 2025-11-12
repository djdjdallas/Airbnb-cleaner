/**
 * Centralized error handling utilities
 * Provides consistent error handling, logging, and user feedback
 */

import { ApiError } from '../types';

/**
 * Converts any error into a standardized ApiError format
 * @param error - Error object of any type
 * @returns Standardized ApiError object
 */
export function handleError(error: any): ApiError {
  // If it's already an ApiError, return as is
  if (error && typeof error === 'object' && 'message' in error && 'code' in error) {
    return error as ApiError;
  }

  // Handle network errors
  if (error?.name === 'NetworkError' || error?.message?.includes('network')) {
    return {
      message: 'Network error. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
      details: error,
    };
  }

  // Handle fetch errors
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return {
      message: 'Unable to connect to the server. Please try again later.',
      code: 'CONNECTION_ERROR',
      details: error,
    };
  }

  // Handle timeout errors
  if (error?.name === 'TimeoutError' || error?.message?.includes('timeout')) {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT_ERROR',
      details: error,
    };
  }

  // Handle Supabase errors
  if (error?.message && typeof error.message === 'string') {
    // Authentication errors
    if (error.message.includes('Invalid login credentials')) {
      return {
        message: 'Invalid email or password. Please try again.',
        code: 'AUTH_INVALID_CREDENTIALS',
        details: error,
      };
    }

    if (error.message.includes('Email not confirmed')) {
      return {
        message: 'Please verify your email address before signing in.',
        code: 'AUTH_EMAIL_NOT_CONFIRMED',
        details: error,
      };
    }

    if (error.message.includes('User already registered')) {
      return {
        message: 'An account with this email already exists.',
        code: 'AUTH_USER_EXISTS',
        details: error,
      };
    }

    // Database errors
    if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
      return {
        message: 'This record already exists. Please use a different value.',
        code: 'DB_DUPLICATE_KEY',
        details: error,
      };
    }

    if (error.message.includes('foreign key constraint')) {
      return {
        message: 'Cannot delete this record because it is being used by other records.',
        code: 'DB_FOREIGN_KEY_CONSTRAINT',
        details: error,
      };
    }

    if (error.message.includes('not found') || error.code === '404') {
      return {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        details: error,
      };
    }

    // Permission errors
    if (error.message.includes('permission denied') || error.message.includes('unauthorized')) {
      return {
        message: 'You do not have permission to perform this action.',
        code: 'PERMISSION_DENIED',
        details: error,
      };
    }
  }

  // Handle HTTP response errors
  if (error?.status || error?.statusCode) {
    const statusCode = error.status || error.statusCode;

    switch (statusCode) {
      case 400:
        return {
          message: 'Invalid request. Please check your input and try again.',
          code: 'BAD_REQUEST',
          details: error,
        };
      case 401:
        return {
          message: 'Your session has expired. Please sign in again.',
          code: 'UNAUTHORIZED',
          details: error,
        };
      case 403:
        return {
          message: 'You do not have permission to perform this action.',
          code: 'FORBIDDEN',
          details: error,
        };
      case 404:
        return {
          message: 'The requested resource was not found.',
          code: 'NOT_FOUND',
          details: error,
        };
      case 409:
        return {
          message: 'A conflict occurred. This resource may already exist.',
          code: 'CONFLICT',
          details: error,
        };
      case 422:
        return {
          message: 'Validation failed. Please check your input.',
          code: 'VALIDATION_ERROR',
          details: error,
        };
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMIT_EXCEEDED',
          details: error,
        };
      case 500:
        return {
          message: 'A server error occurred. Please try again later.',
          code: 'INTERNAL_SERVER_ERROR',
          details: error,
        };
      case 503:
        return {
          message: 'Service temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
          details: error,
        };
    }
  }

  // Handle validation errors
  if (error?.errors && Array.isArray(error.errors)) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    };
  }

  // Handle Stripe errors
  if (error?.type && error.type.includes('Stripe')) {
    return {
      message: error.message || 'Payment processing error. Please try again.',
      code: 'PAYMENT_ERROR',
      details: error,
    };
  }

  // Handle iCal parsing errors
  if (error?.message?.includes('iCal') || error?.message?.includes('calendar')) {
    return {
      message: 'Failed to sync calendar. Please check your iCal URL.',
      code: 'ICAL_PARSE_ERROR',
      details: error,
    };
  }

  // Handle SMS/Twilio errors
  if (error?.message?.includes('SMS') || error?.message?.includes('Twilio')) {
    return {
      message: 'Failed to send SMS. Please check the phone number.',
      code: 'SMS_ERROR',
      details: error,
    };
  }

  // Default error for unknown types
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }

  // Last resort for completely unknown errors
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    details: error,
  };
}

/**
 * Logs an error to the console with context
 * In production, this could be extended to send to error tracking service (Sentry, etc.)
 * @param error - ApiError to log
 * @param context - Optional context string (e.g., function name, screen name)
 */
export function logError(error: ApiError, context?: string): void {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` [${context}]` : '';

  console.error(`[${timestamp}]${contextStr} Error:`, {
    message: error.message,
    code: error.code,
    details: error.details,
  });

  // In production, send to error tracking service
  // Example: Sentry.captureException(error, { contexts: { custom: { context } } });
}

/**
 * Shows an error toast/snackbar to the user
 * Note: This is a placeholder that returns the error message
 * The actual Snackbar should be triggered from a React component
 * @param error - ApiError to display
 * @returns Error message to display
 */
export function showErrorToast(error: ApiError): string {
  // Log the error
  logError(error, 'showErrorToast');

  // Return the user-friendly message
  // The calling component should use this with react-native-paper's Snackbar
  return error.message;
}

/**
 * Determines if an error is recoverable (user can retry)
 * @param error - ApiError to check
 * @returns True if error is likely recoverable
 */
export function isRecoverableError(error: ApiError): boolean {
  const recoverableCodes = [
    'NETWORK_ERROR',
    'CONNECTION_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_EXCEEDED',
    'SERVICE_UNAVAILABLE',
    'INTERNAL_SERVER_ERROR',
  ];

  return recoverableCodes.includes(error.code || '');
}

/**
 * Determines if an error requires authentication
 * @param error - ApiError to check
 * @returns True if user needs to re-authenticate
 */
export function requiresAuth(error: ApiError): boolean {
  const authCodes = ['UNAUTHORIZED', 'AUTH_INVALID_CREDENTIALS', 'AUTH_EMAIL_NOT_CONFIRMED'];

  return authCodes.includes(error.code || '');
}

/**
 * Extracts field-specific validation errors from error details
 * @param error - ApiError with validation details
 * @returns Map of field names to error messages
 */
export function extractValidationErrors(error: ApiError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!error.details) {
    return fieldErrors;
  }

  // Handle array of validation errors
  if (Array.isArray(error.details)) {
    for (const detail of error.details) {
      if (detail.field && detail.message) {
        fieldErrors[detail.field] = detail.message;
      } else if (detail.path && detail.message) {
        // Some validators use 'path' instead of 'field'
        fieldErrors[detail.path] = detail.message;
      }
    }
  }

  // Handle object with field keys
  if (typeof error.details === 'object' && !Array.isArray(error.details)) {
    for (const [field, message] of Object.entries(error.details)) {
      if (typeof message === 'string') {
        fieldErrors[field] = message;
      }
    }
  }

  return fieldErrors;
}

/**
 * Creates a user-friendly error message from validation errors
 * @param validationErrors - Map of field names to error messages
 * @returns Formatted error message
 */
export function formatValidationErrors(validationErrors: Record<string, string>): string {
  const errors = Object.entries(validationErrors);

  if (errors.length === 0) {
    return 'Validation failed';
  }

  if (errors.length === 1) {
    return errors[0][1];
  }

  // Multiple errors - format as bullet points
  const formattedErrors = errors.map(([field, message]) => `• ${message}`).join('\n');

  return `Please fix the following errors:\n${formattedErrors}`;
}

/**
 * Retries an async operation with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds (will be exponentially increased)
 * @returns Result of the async function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      const apiError = handleError(error);

      // Don't retry if error is not recoverable
      if (!isRecoverableError(apiError)) {
        throw apiError;
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);

      // Log retry attempt
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // All retries failed
  throw handleError(lastError);
}
