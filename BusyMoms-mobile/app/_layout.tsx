import { useEffect } from 'react';
import { Stack, Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { ToastProvider } from '../src/contexts/ToastContext';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ToastContainer } from '../src/components/ui/Toast';
import { NetworkBanner } from '../src/components/ui/NetworkBanner';
import { queryClient } from '../src/lib/queryClient';
import { useAuth } from '../src/hooks/useAuth';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              <StatusBar style="auto" />
              <NetworkBanner />
              <AuthGuard />
              <ToastContainer />
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
    const inTabs = segments[0] === '(tabs)';

    console.log('AuthGuard:', {
      user: user?.id,
      onboardingCompleted: profile?.onboarding_completed,
      currentSegment: segments[0],
    });

    // No user - redirect to auth
    if (!user && !inAuthGroup) {
      console.log('→ Redirecting to login (no user)');
      router.replace('/(auth)/login');
    }
    // User exists but onboarding not completed - redirect to onboarding
    else if (user && profile && !profile.onboarding_completed && !inOnboarding && !inAuthGroup) {
      console.log('→ Redirecting to onboarding (onboarding not completed)');
      router.replace('/(onboarding)/profile');
    }
    // User exists and onboarding completed - redirect to main app if in auth or onboarding
    else if (user && profile?.onboarding_completed && (inAuthGroup || inOnboarding)) {
      console.log('→ Redirecting to dashboard (onboarding complete)');
      router.replace('/(tabs)/dashboard');
    }
    // User exists but profile not loaded yet - wait for profile
    else if (user && !profile && !inAuthGroup && !inOnboarding) {
      console.log('⏳ Waiting for profile to load...');
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
    </Stack>
  );
}
