import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Screen } from '../../src/components/layout/Screen';
import { Button } from '../../src/components/ui/Button';
import { FormField } from '../../src/components/forms/FormField';
import { Switch } from '../../src/components/ui/Switch';
import { Select } from '../../src/components/ui/Select';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';

const MEASUREMENT_SYSTEMS = [
  { label: 'Metric (kg, cm)', value: 'metric' },
  { label: 'Imperial (lb, ft)', value: 'imperial' },
];

export default function PreferencesOnboardingScreen() {
  const { showToast } = useToast();
  const { theme, themeMode, setThemeMode } = useTheme();
  const router = useRouter();

  const [measurementSystem, setMeasurementSystem] = useState<string>('imperial');
  const [loading, setLoading] = useState(false);

  const isDarkMode = themeMode === 'dark';

  const handleToggleDarkMode = () => {
    setThemeMode(isDarkMode ? 'light' : 'dark');
  };

  const handleRequestNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Notifications Disabled',
          'You can enable notifications later in your device settings.',
          [{ text: 'OK' }]
        );
      } else {
        showToast('Notifications enabled!', 'success');
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      showToast('Failed to request notification permissions', 'error');
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      // Request notification permissions
      await handleRequestNotifications();

      // In a real implementation, save measurement preference to database
      // For now, we'll just proceed
      router.push('/(onboarding)/complete');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable style={{ backgroundColor: theme.colors.background.primary }}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            Set Your Preferences
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Customize your experience
          </Text>
        </View>

        <View style={styles.form}>
          <FormField label="Dark Mode">
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleDarkMode}
              label={isDarkMode ? 'Enabled' : 'Disabled'}
            />
            <Text style={[styles.helperText, { color: theme.colors.text.tertiary }]}>
              Dark mode is easier on your eyes in low light
            </Text>
          </FormField>

          <FormField label="Measurement System">
            <Select
              options={MEASUREMENT_SYSTEMS}
              value={measurementSystem}
              onChange={setMeasurementSystem}
              placeholder="Select measurement system"
            />
            <Text style={[styles.helperText, { color: theme.colors.text.tertiary }]}>
              Used for recipes and shopping lists
            </Text>
          </FormField>

          <View style={styles.notificationInfo}>
            <Text style={[styles.notificationTitle, { color: theme.colors.text.primary }]}>
              Enable Notifications
            </Text>
            <Text style={[styles.notificationText, { color: theme.colors.text.secondary }]}>
              Get reminders for events, tasks, and daily affirmations. We'll ask for permission on the next screen.
            </Text>
          </View>

          <Button
            title="Continue"
            onPress={handleNext}
            loading={loading}
            fullWidth
            style={styles.nextButton}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 24,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  notificationInfo: {
    gap: 8,
    marginTop: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  notificationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  nextButton: {
    marginTop: 16,
  },
});
