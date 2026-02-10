import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { affirmationService } from '../services/affirmationService';
import { useAuth } from './useAuth';
import { logger } from '../utils/logger';
import type { Affirmation, AffirmationSettings } from '../types/database';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useAffirmationNotifier() {
  const { user } = useAuth();
  const [pendingAffirmation, setPendingAffirmation] = useState<Affirmation | null>(null);
  const [settings, setSettings] = useState<AffirmationSettings | null>(null);

  /**
   * Request notification permissions
   */
  const requestNotificationPermission = useCallback(async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
      }
      return true;
    } catch (error: unknown) {
      logger.error('[AffirmationNotifier] Error requesting permissions:', error);
      return false;
    }
  }, []);

  /**
   * Schedule local notifications for affirmation times
   */
  const scheduleNotifications = useCallback(async (settingsData: AffirmationSettings) => {
    if (!settingsData.enabled || !settingsData.preferred_time) return;

    try {
      // Cancel existing affirmation notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      const prefParts = settingsData.preferred_time.split(':').map(Number);
      const prefHour = prefParts[0] ?? 8;
      const prefMinute = prefParts[1] ?? 0;

      // Schedule primary notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Daily Affirmation',
          body: 'Your daily encouragement is ready!',
          data: { type: 'affirmation' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: prefHour,
          minute: prefMinute,
        },
      });

      // Schedule secondary notification if twice daily
      if (settingsData.frequency === 'twice_daily' && settingsData.secondary_time) {
        const secParts = settingsData.secondary_time.split(':').map(Number);
        const secHour = secParts[0] ?? 20;
        const secMinute = secParts[1] ?? 0;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Evening Affirmation',
            body: 'Take a moment for your evening encouragement.',
            data: { type: 'affirmation' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: secHour,
            minute: secMinute,
          },
        });
      }

      logger.debug('[AffirmationNotifier] Notifications scheduled');
    } catch (error: unknown) {
      logger.error('[AffirmationNotifier] Error scheduling notifications:', error);
    }
  }, [requestNotificationPermission]);

  /**
   * Check if we should show an affirmation now
   */
  const checkForAffirmation = useCallback(async () => {
    if (!user) return;

    try {
      const todayAffirmation = await affirmationService.getTodaysAffirmation(user.id);

      if (todayAffirmation && !todayAffirmation.viewed) {
        setPendingAffirmation(todayAffirmation);
        await affirmationService.markAsViewed(todayAffirmation.id);
      }
    } catch (error: unknown) {
      logger.error('[AffirmationNotifier] Error checking affirmation:', error);
    }
  }, [user]);

  /**
   * Load settings and set up notifications
   */
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    let intervalId: ReturnType<typeof setInterval>;

    const initialize = async () => {
      try {
        const settingsData = await affirmationService.getSettings(user.id);
        if (mounted) {
          setSettings(settingsData);
          if (settingsData) {
            await scheduleNotifications(settingsData);
          }
        }
      } catch (error: unknown) {
        logger.error('[AffirmationNotifier] Error loading settings:', error);
      }

      // Check for pending affirmation
      await checkForAffirmation();
    };

    initialize();

    // Check every minute for due affirmations
    intervalId = setInterval(() => {
      checkForAffirmation();
    }, 60000);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [user, checkForAffirmation, scheduleNotifications]);

  const dismissNotification = useCallback(() => {
    setPendingAffirmation(null);
  }, []);

  const reloadSettings = useCallback(async () => {
    if (!user) return;

    try {
      const data = await affirmationService.getSettings(user.id);
      setSettings(data);

      if (data) {
        await scheduleNotifications(data);
      }

      if (data && !data.enabled) {
        setPendingAffirmation(null);
        await Notifications.cancelAllScheduledNotificationsAsync();
      }

      logger.debug('[AffirmationNotifier] Settings reloaded');
    } catch (error: unknown) {
      logger.error('[AffirmationNotifier] Error reloading settings:', error);
    }
  }, [user, scheduleNotifications]);

  return {
    pendingAffirmation,
    settings,
    dismissNotification,
    reloadSettings,
  };
}
