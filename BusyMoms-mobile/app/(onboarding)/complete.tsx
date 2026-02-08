import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { Button } from '../../src/components/ui/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';
import { completeOnboarding } from '../../src/services/profileService';

export default function OnboardingCompleteScreen() {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const handleGetStarted = async () => {
    if (!user) {
      showToast('User not found', 'error');
      return;
    }

    setLoading(true);
    try {
      // Mark onboarding as completed
      const success = await completeOnboarding(user.id);

      if (!success) {
        throw new Error('Failed to complete onboarding');
      }

      // Refresh profile to update onboarding_completed flag
      await refreshProfile();

      showToast('Welcome to Busy Moms!', 'success');

      // Navigation will be handled by AuthGuard which checks onboarding_completed
      // Just need to trigger a navigation event
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      showToast(error.message || 'Failed to complete onboarding', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.colors.background.primary }}>
      <View style={styles.content}>
        <View style={styles.celebration}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>
            You're All Set!
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            Welcome to Busy Moms Assistant
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            emoji="📅"
            title="Organize Your Calendar"
            description="Sync with Google Calendar and never miss an event"
            textColor={theme.colors.text}
          />
          <FeatureItem
            emoji="🛒"
            title="Smart Shopping Lists"
            description="Browse recipes and send to Instacart with one tap"
            textColor={theme.colors.text}
          />
          <FeatureItem
            emoji="✅"
            title="Manage Tasks"
            description="Assign tasks to family members and stay organized"
            textColor={theme.colors.text}
          />
          <FeatureItem
            emoji="💡"
            title="AI-Powered Assistant"
            description="Get personalized help and daily affirmations"
            textColor={theme.colors.text}
          />
        </View>

        <Button
          title="Get Started"
          onPress={handleGetStarted}
          loading={loading}
          fullWidth
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

interface FeatureItemProps {
  emoji: string;
  title: string;
  description: string;
  textColor: { primary: string; secondary: string };
}

function FeatureItem({ emoji, title, description, textColor }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: textColor.primary }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: textColor.secondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  celebration: {
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  features: {
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  featureEmoji: {
    fontSize: 32,
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    marginTop: 24,
  },
});
