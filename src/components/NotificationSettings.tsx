import React, { useState, useEffect } from 'react';
import { X, Bell, Clock, Volume2, Moon, AlertCircle, CheckCircle } from 'lucide-react';
import { useNotificationManager } from '../hooks/useNotificationManager';
import { NotificationSettings as NotificationSettingsType } from '../services/notificationService';

interface NotificationSettingsProps {
  onClose: () => void;
}

export function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const {
    settings,
    permission,
    isLoading,
    requestPermission,
    updateSettings,
  } = useNotificationManager();

  const [localSettings, setLocalSettings] = useState<Partial<NotificationSettingsType>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        events_enabled: settings.events_enabled,
        reminders_enabled: settings.reminders_enabled,
        tasks_enabled: settings.tasks_enabled,
        shopping_enabled: settings.shopping_enabled,
        wellness_enabled: settings.wellness_enabled,
        birthdays_enabled: settings.birthdays_enabled,
        default_event_reminder_minutes: settings.default_event_reminder_minutes,
        quiet_hours_start: settings.quiet_hours_start,
        quiet_hours_end: settings.quiet_hours_end,
        notification_sound_enabled: settings.notification_sound_enabled,
      });
    }
  }, [settings]);

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      alert('Notification permission granted!');
    } else if (result === 'denied') {
      alert('Notification permission denied. Please enable notifications in your browser settings.');
    }
  };

  const handleToggle = (key: keyof NotificationSettingsType, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleTimeChange = (key: 'quiet_hours_start' | 'quiet_hours_end', value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value || null }));
  };

  const handleReminderMinutesChange = (value: number) => {
    setLocalSettings(prev => ({ ...prev, default_event_reminder_minutes: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const success = await updateSettings(localSettings);
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('An error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {permission !== 'granted' && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Notifications Permission Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {permission === 'denied'
                    ? 'Notifications are blocked. Please enable them in your browser settings.'
                    : 'Allow notifications to receive reminders and alerts.'}
                </p>
                {permission !== 'denied' && (
                  <button
                    onClick={handleRequestPermission}
                    className="mt-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mr-3" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Settings saved successfully!
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notification Types
            </h3>
            <div className="space-y-3">
              {[
                { key: 'events_enabled', label: 'Event Reminders', description: 'Get notified before events start' },
                { key: 'reminders_enabled', label: 'Reminders', description: 'Personal and family reminders' },
                { key: 'tasks_enabled', label: 'Task Notifications', description: 'Get notified when tasks are due' },
                { key: 'shopping_enabled', label: 'Shopping Alerts', description: 'Shopping list and auto-reorder reminders' },
                { key: 'wellness_enabled', label: 'Wellness Reminders', description: 'Cycle tracker and wellness check-ins' },
                { key: 'birthdays_enabled', label: 'Birthday Alerts', description: 'Never forget a family birthday' },
              ].map(({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{label}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings[key as keyof NotificationSettingsType] as boolean ?? false}
                    onChange={(e) => handleToggle(key as keyof NotificationSettingsType, e.target.checked)}
                    className="w-5 h-5 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Default Event Reminder
            </h3>
            <div className="space-y-2">
              <label className="block text-sm text-gray-700 dark:text-gray-300">
                Notify me before events:
              </label>
              <select
                value={localSettings.default_event_reminder_minutes ?? 15}
                onChange={(e) => handleReminderMinutesChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white"
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={1440}>1 day</option>
              </select>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Moon className="w-5 h-5 mr-2" />
              Quiet Hours
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Suppress notifications during these hours
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={localSettings.quiet_hours_start ?? ''}
                  onChange={(e) => handleTimeChange('quiet_hours_start', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={localSettings.quiet_hours_end ?? ''}
                  onChange={(e) => handleTimeChange('quiet_hours_end', e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Volume2 className="w-5 h-5 mr-2" />
              Sound
            </h3>
            <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600">
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">Notification Sound</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Play sound with notifications</div>
              </div>
              <input
                type="checkbox"
                checked={localSettings.notification_sound_enabled ?? true}
                onChange={(e) => handleToggle('notification_sound_enabled', e.target.checked)}
                className="w-5 h-5 text-pink-500 focus:ring-pink-500 border-gray-300 rounded"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
