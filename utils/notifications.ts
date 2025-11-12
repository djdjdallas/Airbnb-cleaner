/**
 * Push notification utilities using Expo Notifications
 * Handles push token registration, local notifications, and notification responses
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configure notification handler for foreground notifications
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers the device for push notifications and returns the Expo push token
 * @returns Expo push token or null if registration fails
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if running on a physical device
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If permissions not granted, return null
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.error('Project ID not found in app config');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;

    // Platform-specific setup
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create channels for different notification types
      await Notifications.setNotificationChannelAsync('cleaning-jobs', {
        name: 'Cleaning Jobs',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4A90E2',
        description: 'Notifications about cleaning job updates',
      });

      await Notifications.setNotificationChannelAsync('payments', {
        name: 'Payments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#50C878',
        description: 'Notifications about payment updates',
      });

      await Notifications.setNotificationChannelAsync('sync', {
        name: 'Calendar Sync',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: '#FFA500',
        description: 'Notifications about calendar synchronization',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Schedules and displays a local notification
 * @param title - Notification title
 * @param body - Notification body text
 * @param data - Optional data payload to include
 * @returns Promise that resolves when notification is scheduled
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    if (!title || !body) {
      throw new Error('Title and body are required for notifications');
    }

    // Determine notification channel based on data type
    let channelId = 'default';
    if (data?.type) {
      switch (data.type) {
        case 'job_confirmed':
        case 'job_declined':
        case 'job_completed':
          channelId = 'cleaning-jobs';
          break;
        case 'payment_failed':
          channelId = 'payments';
          break;
        case 'sync_failed':
          channelId = 'sync';
          break;
      }
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: null, // null means show immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
    throw error;
  }
}

/**
 * Schedules a notification for a future time
 * @param title - Notification title
 * @param body - Notification body text
 * @param triggerDate - Date when notification should be shown
 * @param data - Optional data payload
 * @returns Notification identifier
 */
export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: any
): Promise<string> {
  try {
    if (!title || !body || !triggerDate) {
      throw new Error('Title, body, and trigger date are required');
    }

    // Determine notification channel
    let channelId = 'default';
    if (data?.type) {
      switch (data.type) {
        case 'job_confirmed':
        case 'job_declined':
        case 'job_completed':
          channelId = 'cleaning-jobs';
          break;
        case 'payment_failed':
          channelId = 'payments';
          break;
        case 'sync_failed':
          channelId = 'sync';
          break;
      }
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' && { channelId }),
      },
      trigger: triggerDate,
    });

    return identifier;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
}

/**
 * Cancels a scheduled notification
 * @param notificationId - Notification identifier to cancel
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    if (!notificationId) {
      throw new Error('Notification ID is required');
    }

    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
    throw error;
  }
}

/**
 * Cancels all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    throw error;
  }
}

/**
 * Handles notification response (when user taps on a notification)
 * Routes to appropriate screen based on notification data
 * @param response - Notification response object from Expo
 */
export function handleNotificationResponse(response: any): void {
  try {
    if (!response || !response.notification) {
      return;
    }

    const data = response.notification.request.content.data;

    if (!data) {
      return;
    }

    // Log the notification tap for analytics
    console.log('Notification tapped:', {
      type: data.type,
      timestamp: new Date().toISOString(),
    });

    // Handle different notification types
    // Note: Actual navigation should be handled by the caller using React Navigation
    switch (data.type) {
      case 'job_confirmed':
      case 'job_declined':
      case 'job_completed':
        if (data.job_id) {
          // Return job_id for navigation
          return data.job_id;
        }
        break;

      case 'payment_failed':
        if (data.cleaner_id) {
          // Return cleaner_id for navigation to cleaner payments
          return data.cleaner_id;
        }
        break;

      case 'sync_failed':
        if (data.property_id) {
          // Return property_id for navigation to property details
          return data.property_id;
        }
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  } catch (error) {
    console.error('Error handling notification response:', error);
  }
}

/**
 * Gets all scheduled notifications
 * @returns Array of scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Clears all delivered notifications from the notification tray
 */
export async function clearAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error clearing notifications:', error);
    throw error;
  }
}

/**
 * Gets the notification badge count
 * @returns Current badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return count;
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Sets the notification badge count
 * @param count - Badge count to set
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    if (typeof count !== 'number' || count < 0) {
      throw new Error('Badge count must be a non-negative number');
    }

    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
    throw error;
  }
}
