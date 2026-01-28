import { useEffect, useState } from 'react';
import { notificationService, NotificationSettings } from '../services/notificationService';

export function useNotificationManager() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeNotifications = async () => {
      try {
        const currentSettings = await notificationService.getSettings();
        if (mounted) {
          setSettings(currentSettings);
          setIsLoading(false);
        }

        if ('Notification' in window) {
          setPermission(Notification.permission);
        }

        notificationService.startNotificationChecker();
      } catch (error) {
        console.error('Error initializing notifications:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeNotifications();

    return () => {
      mounted = false;
      notificationService.stopNotificationChecker();
    };
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    const result = await notificationService.requestPermission();
    setPermission(result);
    return result;
  };

  const updateSettings = async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
    const success = await notificationService.updateSettings(newSettings);
    if (success) {
      const updatedSettings = await notificationService.getSettings();
      setSettings(updatedSettings);
    }
    return success;
  };

  const reloadSettings = async (): Promise<void> => {
    try {
      const currentSettings = await notificationService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error reloading notification settings:', error);
    }
  };

  const scheduleEventNotification = async (
    eventId: string,
    eventTitle: string,
    eventDate: string,
    eventTime: string | null,
    minutesBefore?: number
  ): Promise<string | null> => {
    return await notificationService.scheduleEventNotification(
      eventId,
      eventTitle,
      eventDate,
      eventTime,
      minutesBefore
    );
  };

  const scheduleReminderNotification = async (
    reminderId: string,
    reminderTitle: string,
    reminderDate: string,
    reminderTime: string | null
  ): Promise<string | null> => {
    return await notificationService.scheduleReminderNotification(
      reminderId,
      reminderTitle,
      reminderDate,
      reminderTime
    );
  };

  const scheduleTaskNotification = async (
    taskId: string,
    taskTitle: string,
    dueDate: string,
    dueTime: string | null
  ): Promise<string | null> => {
    return await notificationService.scheduleTaskNotification(
      taskId,
      taskTitle,
      dueDate,
      dueTime
    );
  };

  const scheduleBirthdayNotification = async (
    familyMemberId: string,
    memberName: string,
    birthday: string
  ): Promise<string | null> => {
    return await notificationService.scheduleBirthdayNotification(
      familyMemberId,
      memberName,
      birthday
    );
  };

  const cancelNotification = async (notificationId: string): Promise<boolean> => {
    return await notificationService.cancelNotification(notificationId);
  };

  const cancelNotificationsByRelatedId = async (
    relatedId: string,
    relatedTable: string
  ): Promise<boolean> => {
    return await notificationService.cancelNotificationsByRelatedId(relatedId, relatedTable);
  };

  return {
    settings,
    permission,
    isLoading,
    requestPermission,
    updateSettings,
    reloadSettings,
    scheduleEventNotification,
    scheduleReminderNotification,
    scheduleTaskNotification,
    scheduleBirthdayNotification,
    cancelNotification,
    cancelNotificationsByRelatedId,
  };
}
