import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Bell, Clock, Moon, Volume2, AlertCircle, CheckCircle } from 'lucide-react-native';
import { Screen } from '../../src/components/layout/Screen';
import { useTheme } from '../../src/hooks/useTheme';
import { useNotifications } from '../../src/contexts/NotificationContext';
import type { NotificationSettings } from '../../src/services/notificationService';

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const {
    settings,
    permission,
    isLoading,
    requestPermission,
    updateSettings,
  } = useNotifications();

  const [localSettings, setLocalSettings] = useState<Partial<NotificationSettings>>({});
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
      Alert.alert('Success', 'Notification permission granted!');
    } else if (result === 'denied') {
      Alert.alert(
        'Permission Denied',
        'Please enable notifications in your device settings.'
      );
    }
  };

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
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
        Alert.alert('Error', 'Failed to save notification settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'An error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const notificationTypes = [
    { key: 'events_enabled', label: 'Event Reminders', description: 'Get notified before events start' },
    { key: 'reminders_enabled', label: 'Reminders', description: 'Personal and family reminders' },
    { key: 'tasks_enabled', label: 'Task Notifications', description: 'Get notified when tasks are due' },
    { key: 'shopping_enabled', label: 'Shopping Alerts', description: 'Shopping list and auto-reorder reminders' },
    { key: 'wellness_enabled', label: 'Wellness Reminders', description: 'Cycle tracker and wellness check-ins' },
    { key: 'birthdays_enabled', label: 'Birthday Alerts', description: 'Never forget a family birthday' },
  ];

  const reminderOptions = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 1440, label: '1 day' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notification Settings',
          headerStyle: { backgroundColor: theme.colors.background.primary },
          headerTintColor: theme.colors.text.primary,
        }}
      />
      <Screen>
        <ScrollView className="flex-1 p-4" style={{ backgroundColor: theme.colors.background.primary }}>
          {permission !== 'granted' && (
            <View className="mb-4 p-4 rounded-xl border-2" style={{ backgroundColor: theme.colors.gray[200], borderColor: theme.colors.status.warning }}>
              <View className="flex-row items-start">
                <AlertCircle size={20} color={theme.colors.status.warning} style={{ marginRight: 12, marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="font-semibold mb-1" style={{ color: theme.colors.text.primary }}>
                    Notifications Permission Required
                  </Text>
                  <Text className="text-sm mb-2" style={{ color: theme.colors.text.secondary }}>
                    {permission === 'denied'
                      ? 'Notifications are blocked. Please enable them in your device settings.'
                      : 'Allow notifications to receive reminders and alerts.'}
                  </Text>
                  {permission !== 'denied' && (
                    <TouchableOpacity
                      onPress={handleRequestPermission}
                      className="mt-2"
                    >
                      <Text className="text-sm font-semibold underline" style={{ color: theme.colors.status.warning }}>
                        Enable Notifications
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}

          {saveSuccess && (
            <View className="mb-4 p-4 rounded-xl border-2" style={{ backgroundColor: theme.colors.gray[200], borderColor: theme.colors.status.success }}>
              <View className="flex-row items-center">
                <CheckCircle size={20} color={theme.colors.status.success} style={{ marginRight: 12 }} />
                <Text className="text-sm" style={{ color: theme.colors.text.primary }}>
                  Settings saved successfully!
                </Text>
              </View>
            </View>
          )}

          {/* Notification Types */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Bell size={20} color={theme.colors.text.primary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                Notification Types
              </Text>
            </View>
            <View className="space-y-3">
              {notificationTypes.map(({ key, label, description }) => (
                <View
                  key={key}
                  className="p-4 rounded-xl"
                  style={{ backgroundColor: theme.colors.background.secondary }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 mr-4">
                      <Text className="font-medium mb-1" style={{ color: theme.colors.text.primary }}>
                        {label}
                      </Text>
                      <Text className="text-sm" style={{ color: theme.colors.text.secondary }}>
                        {description}
                      </Text>
                    </View>
                    <Switch
                      value={localSettings[key as keyof NotificationSettings] as boolean ?? false}
                      onValueChange={(value) => handleToggle(key as keyof NotificationSettings, value)}
                      trackColor={{ false: theme.colors.background.input, true: theme.colors.primary.light }}
                      thumbColor={theme.colors.background.primary}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Default Event Reminder */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Clock size={20} color={theme.colors.text.primary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                Default Event Reminder
              </Text>
            </View>
            <Text className="text-sm mb-3" style={{ color: theme.colors.text.secondary }}>
              Notify me before events:
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setLocalSettings(prev => ({ ...prev, default_event_reminder_minutes: option.value }))}
                  className="px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: localSettings.default_event_reminder_minutes === option.value
                      ? theme.colors.primary.main
                      : theme.colors.background.secondary,
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: localSettings.default_event_reminder_minutes === option.value
                        ? '#FFFFFF'
                        : theme.colors.text.primary,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sound */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Volume2 size={20} color={theme.colors.text.primary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold" style={{ color: theme.colors.text.primary }}>
                Sound
              </Text>
            </View>
            <View
              className="p-4 rounded-xl"
              style={{ backgroundColor: theme.colors.background.secondary }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 mr-4">
                  <Text className="font-medium mb-1" style={{ color: theme.colors.text.primary }}>
                    Notification Sound
                  </Text>
                  <Text className="text-sm" style={{ color: theme.colors.text.secondary }}>
                    Play sound with notifications
                  </Text>
                </View>
                <Switch
                  value={localSettings.notification_sound_enabled ?? true}
                  onValueChange={(value) => handleToggle('notification_sound_enabled', value)}
                  trackColor={{ false: theme.colors.background.input, true: theme.colors.primary.light }}
                  thumbColor={theme.colors.background.primary}
                />
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className="py-4 rounded-xl mb-8"
            style={{
              backgroundColor: isSaving ? theme.colors.text.secondary : theme.colors.primary.main,
            }}
          >
            <Text className="text-center text-white font-semibold text-base">
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Screen>
    </>
  );
}
