import { supabase } from '../lib/supabase';

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
  private checkInterval: number | null = null;

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

  async scheduleNotification(
    type: NotificationQueueItem['notification_type'],
    title: string,
    body: string,
    scheduledFor: Date,
    relatedId?: string,
    relatedTable?: string,
    additionalData?: Record<string, any>
  ): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const settings = await this.getSettings();
      if (!settings) return null;

      const typeEnabledMap = {
        event: settings.events_enabled,
        reminder: settings.reminders_enabled,
        task: settings.tasks_enabled,
        shopping: settings.shopping_enabled,
        wellness: settings.wellness_enabled,
        birthday: settings.birthdays_enabled,
      };

      if (!typeEnabledMap[type]) {
        console.log(`Notifications for type ${type} are disabled`);
        return null;
      }

      const { data, error } = await supabase
        .from('notification_queue')
        .insert({
          user_id: user.id,
          notification_type: type,
          title,
          body,
          related_id: relatedId || null,
          related_table: relatedTable || null,
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          data: additionalData || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'cancelled' })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  async cancelNotificationsByRelatedId(relatedId: string, relatedTable: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'cancelled' })
        .eq('related_id', relatedId)
        .eq('related_table', relatedTable)
        .eq('status', 'pending');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      return false;
    }
  }

  async getPendingNotifications(): Promise<NotificationQueueItem[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lte('scheduled_for', now)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return (data as NotificationQueueItem[]) || [];
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  async markNotificationAsSent(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as sent:', error);
      return false;
    }
  }

  async markNotificationAsFailed(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_queue')
        .update({ status: 'failed' })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as failed:', error);
      return false;
    }
  }

  isInQuietHours(settings: NotificationSettings): boolean {
    if (!settings.quiet_hours_start || !settings.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = settings.quiet_hours_end.split(':').map(Number);

    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    if (quietStart < quietEnd) {
      return currentTime >= quietStart && currentTime < quietEnd;
    } else {
      return currentTime >= quietStart || currentTime < quietEnd;
    }
  }

  async showBrowserNotification(notification: NotificationQueueItem): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return false;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      const settings = await this.getSettings();
      if (settings && this.isInQuietHours(settings)) {
        console.log('Notification suppressed due to quiet hours');
        await this.markNotificationAsFailed(notification.id);
        return false;
      }

      const browserNotification = new Notification(notification.title, {
        body: notification.body,
        icon: '/bmalogo3.png',
        badge: '/bmalogo3.png',
        tag: notification.id,
        requireInteraction: false,
        silent: settings ? !settings.notification_sound_enabled : false,
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.data?.url) {
          window.location.href = notification.data.url;
        }
        browserNotification.close();
      };

      await this.markNotificationAsSent(notification.id);
      return true;
    } catch (error) {
      console.error('Error showing browser notification:', error);
      await this.markNotificationAsFailed(notification.id);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  async checkAndShowNotifications(): Promise<void> {
    try {
      const pendingNotifications = await this.getPendingNotifications();

      for (const notification of pendingNotifications) {
        await this.showBrowserNotification(notification);
      }
    } catch (error) {
      console.error('Error checking and showing notifications:', error);
    }
  }

  startNotificationChecker(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkAndShowNotifications();

    this.checkInterval = window.setInterval(() => {
      this.checkAndShowNotifications();
    }, 60000);
  }

  stopNotificationChecker(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
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
      const reminderMinutes = minutesBefore ?? settings?.default_event_reminder_minutes ?? 15;

      const eventDateTime = new Date(`${eventDate}T${eventTime || '00:00:00'}`);
      const notificationTime = new Date(eventDateTime.getTime() - reminderMinutes * 60000);

      if (notificationTime < new Date()) {
        console.log('Event notification time is in the past, skipping');
        return null;
      }

      const timeText = reminderMinutes < 60
        ? `${reminderMinutes} minutes`
        : `${Math.floor(reminderMinutes / 60)} hour${Math.floor(reminderMinutes / 60) > 1 ? 's' : ''}`;

      return await this.scheduleNotification(
        'event',
        `Upcoming Event: ${eventTitle}`,
        `Your event "${eventTitle}" starts in ${timeText}`,
        notificationTime,
        eventId,
        'events',
        { url: '/calendar' }
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
      const reminderDateTime = new Date(`${reminderDate}T${reminderTime || '09:00:00'}`);

      if (reminderDateTime < new Date()) {
        console.log('Reminder notification time is in the past, skipping');
        return null;
      }

      return await this.scheduleNotification(
        'reminder',
        `Reminder: ${reminderTitle}`,
        reminderTitle,
        reminderDateTime,
        reminderId,
        'reminders',
        { url: '/family-hub' }
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
      const taskDateTime = new Date(`${dueDate}T${dueTime || '09:00:00'}`);
      const notificationTime = new Date(taskDateTime.getTime() - 60 * 60000);

      if (notificationTime < new Date()) {
        console.log('Task notification time is in the past, skipping');
        return null;
      }

      return await this.scheduleNotification(
        'task',
        `Task Due Soon: ${taskTitle}`,
        `Your task "${taskTitle}" is due in 1 hour`,
        notificationTime,
        taskId,
        'tasks',
        { url: '/family-hub' }
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
      const birthdayDate = new Date(birthday);
      const currentYear = new Date().getFullYear();
      const upcomingBirthday = new Date(currentYear, birthdayDate.getMonth(), birthdayDate.getDate());

      if (upcomingBirthday < new Date()) {
        upcomingBirthday.setFullYear(currentYear + 1);
      }

      const notificationTime = new Date(upcomingBirthday);
      notificationTime.setHours(9, 0, 0, 0);

      return await this.scheduleNotification(
        'birthday',
        `Birthday Today: ${memberName}`,
        `Today is ${memberName}'s birthday!`,
        notificationTime,
        familyMemberId,
        'family_members',
        { url: '/family-hub' }
      );
    } catch (error) {
      console.error('Error scheduling birthday notification:', error);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
