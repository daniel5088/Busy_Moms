import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { KeyboardAvoid } from '../../src/components/layout/KeyboardAvoid';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { FormField } from '../../src/components/forms/FormField';
import { Select } from '../../src/components/ui/Select';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';
import { updateProfile } from '../../src/services/profileService';

const USER_TYPES = [
  { label: 'Mom', value: 'Mom' },
  { label: 'Dad', value: 'Dad' },
  { label: 'Guardian', value: 'Guardian' },
  { label: 'Other', value: 'Other' },
];

const AI_PERSONALITIES = [
  { label: 'Friendly', value: 'Friendly' },
  { label: 'Professional', value: 'Professional' },
  { label: 'Humorous', value: 'Humorous' },
];

export default function ProfileOnboardingScreen() {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [userType, setUserType] = useState<string>('Mom');
  const [aiPersonality, setAiPersonality] = useState<string>('Friendly');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) {
      showToast('Please enter your name', 'error');
      return;
    }

    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(user.id, {
        full_name: name.trim(),
        user_type: userType as any,
        ai_personality: aiPersonality as any,
      });

      await refreshProfile();
      showToast('Profile updated!', 'success');
      router.push('/(onboarding)/family');
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable style={{ backgroundColor: theme.colors.background.primary }}>
      <KeyboardAvoid>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Welcome! Let's get to know you
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Tell us a bit about yourself
            </Text>
          </View>

          <View style={styles.form}>
            <FormField label="What's your name?" required>
              <Input
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />
            </FormField>

            <FormField label="I am a..." required>
              <Select
                options={USER_TYPES}
                value={userType}
                onChange={setUserType}
                placeholder="Select user type"
              />
            </FormField>

            <FormField label="AI Personality Preference" required>
              <Select
                options={AI_PERSONALITIES}
                value={aiPersonality}
                onChange={setAiPersonality}
                placeholder="Select AI personality"
              />
              <Text style={[styles.helperText, { color: theme.colors.text.tertiary }]}>
                Choose how you'd like the AI assistant to interact with you
              </Text>
            </FormField>

            <Button
              title="Next"
              onPress={handleNext}
              loading={loading}
              fullWidth
              style={styles.nextButton}
            />
          </View>
        </View>
      </KeyboardAvoid>
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
  nextButton: {
    marginTop: 16,
  },
});
