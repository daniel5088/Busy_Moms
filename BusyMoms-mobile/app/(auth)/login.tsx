import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { KeyboardAvoid } from '../../src/components/layout/KeyboardAvoid';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { FormField } from '../../src/components/forms/FormField';
import { Divider } from '../../src/components/ui/Divider';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signIn, signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();

  const handleSignIn = async () => {
    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showToast('Invalid email or password', 'error');
        } else if (error.message.includes('Email not confirmed')) {
          showToast('Please confirm your email before signing in', 'warning');
        } else {
          showToast(error.message || 'Sign in failed', 'error');
        }
        return;
      }

      // Navigation will be handled by AuthGuard
      showToast('Welcome back!', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        showToast(error.message || 'Google sign in not available yet', 'warning');
      }
    } catch {
      showToast('Google sign in failed', 'error');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scrollable style={{ backgroundColor: theme.colors.background.primary }}>
      <KeyboardAvoid>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              Busy Moms
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Welcome back! Sign in to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <FormField label="Email" required>
              <Input
                placeholder="email@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </FormField>

            <FormField label="Password" required>
              <Input
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </FormField>

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: theme.colors.primary.main }]}>
                  Forgot password?
                </Text>
              </Pressable>
            </Link>

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              fullWidth
            />

            <Divider label="OR" />

            <Button
              title="Sign in with Google"
              onPress={handleGoogleSignIn}
              variant="outline"
              loading={googleLoading}
              fullWidth
            />

            <View style={styles.signupPrompt}>
              <Text style={[styles.signupText, { color: theme.colors.text.secondary }]}>
                Don't have an account?{' '}
              </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text style={[styles.signupLink, { color: theme.colors.primary.main }]}>
                    Sign Up
                  </Text>
                </Pressable>
              </Link>
            </View>
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
    paddingVertical: 48,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -12,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
