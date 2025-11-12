/**
 * Utility functions for the Airbnb Cleaner Scheduler app
 * Central export point for all utility modules
 */

// Validation utilities
export {
  validateEmail,
  validatePhone,
  validateICalUrl,
  validatePassword,
  sanitizeInput,
  type PasswordValidationResult,
} from './validation';

// Formatting utilities
export {
  formatDate,
  formatCurrency,
  formatPhone,
  formatRelativeTime,
  truncateText,
  formatDateRange,
} from './formatting';

// iCal parsing utilities
export {
  parseICalFromUrl,
  parseICalData,
  extractCheckouts,
  detectSameDayTurnaround,
  filterUpcomingCheckouts,
  groupCheckoutsByMonth,
  validateICalFormat,
} from './ical-parser';

// Notification utilities
export {
  registerForPushNotifications,
  sendLocalNotification,
  scheduleNotification,
  cancelNotification,
  cancelAllNotifications,
  handleNotificationResponse,
  getAllScheduledNotifications,
  clearAllNotifications,
  getBadgeCount,
  setBadgeCount,
} from './notifications';

// Error handling utilities
export {
  handleError,
  logError,
  showErrorToast,
  isRecoverableError,
  requiresAuth,
  extractValidationErrors,
  formatValidationErrors,
  retryWithBackoff,
} from './error-handler';
