import { Stack, useSegments } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../src/hooks/useTheme';
import { ProgressBar } from '../../src/components/ui/ProgressBar';

export default function OnboardingLayout() {
  const segments = useSegments();
  const { theme } = useTheme();

  // Determine current step based on route
  const getCurrentStep = () => {
    const route = segments[segments.length - 1];
    switch (route) {
      case 'profile':
        return 1;
      case 'family':
        return 2;
      case 'preferences':
        return 3;
      case 'complete':
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = getCurrentStep();
  const totalSteps = 4;
  const progress = currentStep / totalSteps;

  return (
    <>
      <View style={[styles.progressContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ProgressBar progress={progress} color={theme.colors.primary.main} />
        <Text style={[styles.progressText, { color: theme.colors.text.secondary }]}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="profile" />
        <Stack.Screen name="family" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="complete" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingTop: 50, // Safe area top
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
