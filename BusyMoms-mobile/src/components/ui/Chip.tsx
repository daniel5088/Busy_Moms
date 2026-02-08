/**
 * Chip component - small rounded tag, optionally pressable
 */

import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ChipProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  variant?: 'default' | 'primary' | 'secondary';
  style?: ViewStyle;
}

export function Chip({
  label,
  onPress,
  selected = false,
  variant = 'default',
  style,
}: ChipProps) {
  const { theme } = useTheme();

  const getBackgroundColor = (): string => {
    if (selected) {
      return variant === 'secondary'
        ? theme.colors.secondary.main
        : theme.colors.primary.main;
    }

    switch (variant) {
      case 'primary':
        return theme.colors.primary.light;
      case 'secondary':
        return theme.colors.secondary.light;
      default:
        return theme.colors.gray[200];
    }
  };

  const getTextColor = (): string => {
    if (selected) {
      return '#FFFFFF';
    }

    switch (variant) {
      case 'primary':
        return theme.colors.primary.dark;
      case 'secondary':
        return theme.colors.secondary.dark;
      default:
        return theme.colors.text.primary;
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          opacity: pressed && onPress ? 0.7 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text
        style={[
          styles.label,
          {
            color: getTextColor(),
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.medium,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  label: {},
});
