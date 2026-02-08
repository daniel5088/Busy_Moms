/**
 * FormField component - wraps any input with label, required indicator, and error message
 */

import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function FormField({
  label,
  required = false,
  error,
  helperText,
  children,
  style,
}: FormFieldProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.text.secondary,
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.medium,
                marginBottom: theme.spacing.xs,
              },
            ]}
          >
            {label}
            {required && (
              <Text style={{ color: theme.colors.status.error }}> *</Text>
            )}
          </Text>
        </View>
      )}
      {children}
      {error && (
        <Text
          style={[
            styles.errorText,
            {
              color: theme.colors.status.error,
              fontSize: theme.fontSize.sm,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      )}
      {helperText && !error && (
        <Text
          style={[
            styles.helperText,
            {
              color: theme.colors.text.tertiary,
              fontSize: theme.fontSize.sm,
              marginTop: theme.spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {},
  errorText: {},
  helperText: {},
});
