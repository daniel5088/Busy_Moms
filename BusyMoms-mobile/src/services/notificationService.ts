import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationSettings {
  id: string;
  user_id: string;
  events_enabled: boolean;
  reminders_enabled: boolean;
  tasks_enabled: boolean;
  shopping_enabled: boolean;
  wellness_enabled: boolean;
  birthdays_enabled: boolean;
  default_event_reminder_minutes: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  notification_sound_enabled: boolean;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueueItem {
  id: string;
  user_id: string;
  notification_type: 'event' | 'reminder' | 'task' | 'shopping' | 'wellness' | 'birthday';
  title: string;
  body: string;
  related_id: string | null;
  related_table: string | null;
  scheduled_for: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  data: Record<string, any>;
  created_at: string;
}

class NotificationService {
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push token:', token);

      // Save token to database
      await this.savePushToken(token);

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  async savePushToken(token: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          push_token: token,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  }

  async getSettings(): Promise<NotificationSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return await this.createDefaultSettings();
      }

      return data as NotificationSettings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  async createDefaultSettings(): Promise<NotificationSettings | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_settings')
        .insert({
          user_id: user.id,
          events_enabled: true,
          reminders_enabled: true,
          tasks_enabled: true,
          shopping_enabled: true,
          wellness_enabled: true,
          birthdays_enabled: true,
          default_event_reminder_minutes: 15,
          notification_sound_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data as NotificationSettings;
    } catch (error) {
      console.error('Error creating default notification settings:', error);
      return null;
    }
  }

  async updateSettings(settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('notification_settings')
        .update(settings)
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Date | number,
    data?: Record<string, any>
  ): Promise<string | null> {
    try {
      let triggerInput: Notifications.NotificationTriggerInput;
      if (typeof trigger === 'number') {
        triggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger,
          repeats: false,
        };
      } else {
        triggerInput = {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger,
        };
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: triggerInput,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  async cancelAllNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return true;
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      return false;
    }
  }

  async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  isInQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const startParts = settings.quiet_hours_start.split(':').map(Number);
    const endParts = settings.quiet_hours_end.split(':').map(Number);

    const startHour = startParts[0] ?? 0;
    const startMin = startParts[1] ?? 0;
    const endHour = endParts[0] ?? 0;
    const endMin = endParts[1] ?? 0;

    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    // Handle overnight quiet hours
    if (quietStart < quietEnd) {
      return currentTime >= quietStart && currentTime < quietEnd;
    } else {
      return currentTime >= quietStart || currentTime < quietEnd;
    }
  }

  async scheduleEventNotification(
    eventId: string,
    eventTitle: string,
    eventDate: string,
    eventTime: string | null,
    minutesBefore?: number
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.events_enabled) {
        return null;
      }

      const reminderMinutes = minutesBefore ?? settings.default_event_reminder_minutes;

      const eventDateTime = new Date(`${eventDate}T${eventTime || '00:00:00'}`);
      const notificationTime = new Date(eventDateTime.getTime() - reminderMinutes * 60000);

      if (notificationTime < new Date()) {
        console.log('Event notification time is in the past, skipping');
        return null;
      }

      // Check quiet hours
      if (this.isInQuietHours(settings)) {
        console.log('Notification suppressed due to quiet hours');
        return null;
      }

      const timeText = reminderMinutes < 60
        ? `${reminderMinutes} minutes`
        : `${Math.floor(reminderMinutes / 60)} hour${Math.floor(reminderMinutes / 60) > 1 ? 's' : ''}`;

      return await this.scheduleLocalNotification(
        `Upcoming Event: ${eventTitle}`,
        `Your event "${eventTitle}" starts in ${timeText}`,
        notificationTime,
        {
          type: 'event',
          eventId,
          screen: 'calendar',
        }
      );
    } catch (error) {
      console.error('Error scheduling event notification:', error);
      return null;
    }
  }

  async scheduleReminderNotification(
    reminderId: string,
    reminderTitle: string,
    reminderDate: string,
    reminderTime: string | null
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.reminders_enabled) {
        return null;
      }

      const reminderDateTime = new Date(`${reminderDate}T${reminderTime || '09:00:00'}`);

      if (reminderDateTime < new Date()) {
        console.log('Reminder notification time is in the past, skipping');
        return null;
      }

      if (this.isInQuietHours(settings)) {
        console.log('Notification suppressed due to quiet hours');
        return null;
      }

      return await this.scheduleLocalNotification(
        `Reminder: ${reminderTitle}`,
        reminderTitle,
        reminderDateTime,
        {
          type: 'reminder',
          reminderId,
          screen: 'family',
        }
      );
    } catch (error) {
      console.error('Error scheduling reminder notification:', error);
      return null;
    }
  }

  async scheduleTaskNotification(
    taskId: string,
    taskTitle: string,
    dueDate: string,
    dueTime: string | null
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.tasks_enabled) {
        return null;
      }

      const taskDateTime = new Date(`${dueDate}T${dueTime || '09:00:00'}`);
      const notificationTime = new Date(taskDateTime.getTime() - 60 * 60000); // 1 hour before

      if (notificationTime < new Date()) {
        console.log('Task notification time is in the past, skipping');
        return null;
      }

      if (this.isInQuietHours(settings)) {
        console.log('Notification suppressed due to quiet hours');
        return null;
      }

      return await this.scheduleLocalNotification(
        `Task Due Soon: ${taskTitle}`,
        `Your task "${taskTitle}" is due in 1 hour`,
        notificationTime,
        {
          type: 'task',
          taskId,
          screen: 'family',
        }
      );
    } catch (error) {
      console.error('Error scheduling task notification:', error);
      return null;
    }
  }

  async scheduleBirthdayNotification(
    familyMemberId: string,
    memberName: string,
    birthday: string
  ): Promise<string | null> {
    try {
      const settings = await this.getSettings();
      if (!settings || !settings.birthdays_enabled) {
        return null;
      }

      const birthdayDate = new Date(birthday);
      const currentYear = new Date().getFullYear();
      const upcomingBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());

      if (upcomingBirthday < new Date()) {
        upcomingBirthday.setFullYear(currentYear + 1);
      }

      const notificationTime = new Date(upcomingBirthday);
      notificationTime.setHours(9, 0, 0, 0);

      return await this.scheduleLocalNotification(
        `Birthday Today: ${memberName}`,
        `Today is ${memberName}'s birthday! 🎉`,
        notificationTime,
        {
          type: 'birthday',
          familyMemberId,
          screen: 'family',
        }
      );
    } catch (error) {
      console.error('Error scheduling birthday notification:', error);
      return null;
    }
  }

  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}

export const notificationService = new NotificationService();
