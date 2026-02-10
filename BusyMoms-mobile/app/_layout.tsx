import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { ToastContainer } from '../src/components/ui/Toast';
import { NetworkBanner } from '../src/components/ui/NetworkBanner';
import { queryClient } from '../src/lib/queryClient';
import { syncEngine } from '../src/lib/syncEngine';
import { useAuth } from '../src/hooks/useAuth';
import { logger } from '../src/utils/logger';

export default function RootLayout() {
  // Initialize sync engine
  useEffect(() => {
    syncEngine.initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <NotificationProvider>
                <StatusBar style="auto" />
                <NetworkBanner />
                <AuthGuard />
                <ToastContainer />
              </NotificationProvider>
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * AuthGuard component that handles authentication routing
 * - Redirects unauthenticated users to login
 * - Redirects users without completed onboarding to onboarding flow
 * - Allows authenticated users with completed onboarding to access app
 */
function AuthGuard() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    logger.debug('AuthGuard:', {
      user: user?.id,
      onboardingCompleted: profile?.onboarding_completed,
      currentSegment: segments[0],
    });

    // No user - redirect to auth
    if (!user && !inAuthGroup) {
      logger.debug('→ Redirecting to login (no user)');
      router.replace('/(auth)/login');
    }
    // User exists but onboarding not completed - redirect to onboarding
    else if (user && profile && !profile.onboarding_completed && !inOnboarding && !inAuthGroup) {
      logger.debug('→ Redirecting to onboarding (onboarding not completed)');
      router.replace('/(onboarding)/profile');
    }
    // User exists and onboarding completed - redirect to main app if in auth or onboarding
    else if (user && profile?.onboarding_completed && (inAuthGroup || inOnboarding)) {
      logger.debug('→ Redirecting to dashboard (onboarding complete)');
      router.replace('/(tabs)/dashboard');
    }
    // User exists but profile not loaded yet - wait for profile
    else if (user && !profile && !inAuthGroup && !inOnboarding) {
      logger.debug('⏳ Waiting for profile to load...');
      // Don't navigate yet, wait for profile to load
    }
  }, [user, profile, loading, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="voice-chat"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="cycle-tracker"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="life-receipts"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="gift-finder"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="quick-links"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
