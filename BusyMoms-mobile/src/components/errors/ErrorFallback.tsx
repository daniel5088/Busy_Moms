/**
 * ErrorFallback - error display with "Try Again" button
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';

export interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.primary,
        },
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[
            styles.emoji,
            {
              fontSize: theme.fontSize['4xl'],
            },
          ]}
        >
          😞
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.xl,
              fontWeight: theme.fontWeight.bold,
              marginTop: theme.spacing.lg,
            },
          ]}
        >
          Oops! Something went wrong
        </Text>
        <Text
          style={[
            styles.message,
            {
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.base,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          We encountered an unexpected error. Please try again.
        </Text>
        {__DEV__ && error && (
          <View
            style={[
              styles.errorDetails,
              {
                backgroundColor: theme.colors.gray[100],
                marginTop: theme.spacing.lg,
                padding: theme.spacing.md,
                borderRadius: 8,
              },
            ]}
          >
            <Text
              style={[
                styles.errorText,
                {
                  color: theme.colors.status.error,
                  fontSize: theme.fontSize.sm,
                },
              ]}
            >
              {error.message}
            </Text>
          </View>
        )}
        <View style={{ marginTop: theme.spacing.xl }}>
          <Button title="Try Again" onPress={resetError} variant="primary" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  emoji: {},
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  errorDetails: {
    width: '100%',
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
