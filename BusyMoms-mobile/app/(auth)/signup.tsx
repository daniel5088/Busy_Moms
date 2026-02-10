import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { KeyboardAvoid } from '../../src/components/layout/KeyboardAvoid';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { FormField } from '../../src/components/forms/FormField';
import { Divider } from '../../src/components/ui/Divider';
import { useAuth } from '../../src/hooks/useAuth';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { signUp, signInWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignUp = async () => {
    // Validation
    if (!email || !password || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUp(email, password);

      if (error) {
        if (error.message.includes('User already registered')) {
          showToast('Email already registered. Please sign in.', 'error');
          router.replace('/(auth)/login');
        } else {
          showToast(error.message || 'Sign up failed', 'error');
        }
        return;
      }

      // Check if email confirmation is required
      if (data?.user && !data.session) {
        showToast(
          'Account created! Please check your email to confirm.',
          'success'
        );
        // Redirect to login after showing message
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2000);
        return;
      }

      // If we have a session, user is logged in
      // Navigation will be handled by AuthGuard
      showToast('Account created successfully!', 'success');
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
              Create Account
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Join Busy Moms Assistant today
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
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password-new"
              />
            </FormField>

            <FormField label="Confirm Password" required>
              <Input
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="password-new"
              />
            </FormField>

            <Button
              title="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
            />

            <Divider label="OR" />

            <Button
              title="Sign up with Google"
              onPress={handleGoogleSignIn}
              variant="outline"
              loading={googleLoading}
              fullWidth
            />

            <View style={styles.signinPrompt}>
              <Text style={[styles.signinText, { color: theme.colors.text.secondary }]}>
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={[styles.signinLink, { color: theme.colors.primary.main }]}>
                    Sign In
                  </Text>
                </Pressable>
              </Link>
            </View>

            <Text style={[styles.emailNotice, { color: theme.colors.text.tertiary }]}>
              You'll receive an email verification link after signing up.
            </Text>
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
  signinPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  signinText: {
    fontSize: 14,
  },
  signinLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  emailNotice: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
