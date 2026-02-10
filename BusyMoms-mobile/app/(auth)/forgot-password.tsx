import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/layout/Screen';
import { Header } from '../../src/components/layout/Header';
import { KeyboardAvoid } from '../../src/components/layout/KeyboardAvoid';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { FormField } from '../../src/components/forms/FormField';
import { useToast } from '../../src/hooks/useToast';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { showToast } = useToast();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSendResetLink = async () => {
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'busymoms://reset-password',
      });

      if (error) {
        showToast(error.message || 'Failed to send reset link', 'error');
        return;
      }

      setSent(true);
      showToast('Password reset link sent! Check your email.', 'success');

      // Redirect back to login after 3 seconds
      setTimeout(() => {
        router.back();
      }, 3000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: theme.colors.background.primary }}>
      <Header title="Forgot Password" onBack={() => router.back()} />
      <KeyboardAvoid>
        <View style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>

          {!sent ? (
            <>
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

              <Button
                title="Send Reset Link"
                onPress={handleSendResetLink}
                loading={loading}
                fullWidth
              />
            </>
          ) : (
            <View style={styles.successContainer}>
              <Text style={[styles.successTitle, { color: theme.colors.status.success }]}>
                ✓ Email Sent
              </Text>
              <Text style={[styles.successText, { color: theme.colors.text.secondary }]}>
                Check your inbox for a password reset link.
              </Text>
              <Text style={[styles.successSubtext, { color: theme.colors.text.tertiary }]}>
                Returning to login in 3 seconds...
              </Text>
            </View>
          )}
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
    gap: 20,
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 24,
  },
  successContainer: {
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
