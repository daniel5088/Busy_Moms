/**
 * Divider component - horizontal line separator
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface DividerProps {
  label?: string;
  style?: ViewStyle;
}

export function Divider({ label, style }: DividerProps) {
  const { theme } = useTheme();

  if (label) {
    return (
      <View style={[styles.containerWithLabel, style]}>
        <View
          style={[
            styles.line,
            {
              backgroundColor: theme.colors.border.default,
            },
          ]}
        />
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.text.tertiary,
              fontSize: theme.fontSize.sm,
              backgroundColor: theme.colors.background.primary,
              paddingHorizontal: theme.spacing.sm,
            },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.line,
            {
              backgroundColor: theme.colors.border.default,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: theme.colors.border.default,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
  containerWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  line: {
    flex: 1,
    height: 1,
  },
  label: {
    fontWeight: '500',
  },
});
