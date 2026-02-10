import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { notificationService, NotificationSettings } from '../services/notificationService';
import { useAuth } from './useAuth';

export function useNotificationManager() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<Notifications.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await notificationService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const checkPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermission(status);
    } catch (error) {
      console.error('Error checking notification permission:', error);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<Notifications.PermissionStatus> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermission(status);

      if (status === 'granted') {
        const token = await notificationService.registerForPushNotifications();
        setPushToken(token);
      }

      return status;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied' as Notifications.PermissionStatus;
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
    try {
      const success = await notificationService.updateSettings(newSettings);
      if (success) {
        await loadSettings();
      }
      return success;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }, [loadSettings]);

  // Initialize notification manager
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const initialize = async () => {
      await checkPermission();
      await loadSettings();

      // Register for push notifications if permission is granted
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const token = await notificationService.registerForPushNotifications();
        setPushToken(token);
      }
    };

    initialize();
  }, [user, checkPermission, loadSettings]);

  // Handle notification taps (deep linking)
  useEffect(() => {
    const subscription = notificationService.addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;

      if (data && data.screen) {
        // Navigate to the appropriate screen
        switch (data.screen) {
          case 'calendar':
            router.push('/(tabs)/calendar');
            break;
          case 'family':
            router.push('/(tabs)/family');
            break;
          case 'dashboard':
            router.push('/(tabs)/dashboard');
            break;
          default:
            break;
        }
      }
    });

    return () => subscription.remove();
  }, []);

  // Handle foreground notifications
  useEffect(() => {
    const subscription = notificationService.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      // You can show an in-app banner or toast here if desired
    });

    return () => subscription.remove();
  }, []);

  return {
    settings,
    permission,
    isLoading,
    pushToken,
    requestPermission,
    updateSettings,
    loadSettings,
  };
}
