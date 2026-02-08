/**
 * Badge component - small colored label
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface BadgeProps {
  text: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  style?: ViewStyle;
}

export function Badge({ text, variant = 'primary', style }: BadgeProps) {
  const { theme } = useTheme();

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary.light;
      case 'success':
        return theme.colors.status.success;
      case 'warning':
        return theme.colors.status.warning;
      case 'danger':
        return theme.colors.status.error;
      case 'neutral':
        return theme.colors.gray[300];
      default:
        return theme.colors.primary.light;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary.dark;
      case 'success':
      case 'warning':
      case 'danger':
        return '#FFFFFF';
      case 'neutral':
        return theme.colors.text.primary;
      default:
        return theme.colors.primary.dark;
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: getTextColor(),
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
          },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    textTransform: 'uppercase',
  },
});
