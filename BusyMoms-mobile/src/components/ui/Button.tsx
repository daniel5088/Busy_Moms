/**
 * Button component with multiple variants and sizes
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { theme } = useTheme();

  const getBackgroundColor = (): string => {
    if (disabled) return theme.colors.gray[300];

    switch (variant) {
      case 'primary':
        return theme.colors.primary.main;
      case 'secondary':
        return theme.colors.secondary.main;
      case 'danger':
        return theme.colors.status.error;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.primary.main;
    }
  };

  const getTextColor = (): string => {
    if (disabled) return theme.colors.gray[500];

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return '#FFFFFF';
      case 'outline':
        return theme.colors.primary.main;
      case 'ghost':
        return theme.colors.text.primary;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = (): string => {
    if (variant === 'outline') {
      return disabled ? theme.colors.gray[300] : theme.colors.primary.main;
    }
    return 'transparent';
  };

  const getPadding = (): { vertical: number; horizontal: number } => {
    switch (size) {
      case 'sm':
        return { vertical: theme.spacing.sm, horizontal: theme.spacing.md };
      case 'lg':
        return { vertical: theme.spacing.base, horizontal: theme.spacing.xl };
      case 'md':
      default:
        return { vertical: theme.spacing.md, horizontal: theme.spacing.lg };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return theme.fontSize.sm;
      case 'lg':
        return theme.fontSize.lg;
      case 'md':
      default:
        return theme.fontSize.base;
    }
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderColor: getBorderColor(),
    borderWidth: variant === 'outline' ? 1 : 0,
    paddingVertical: getPadding().vertical,
    paddingHorizontal: getPadding().horizontal,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.6 : 1,
  };

  const textStyle: TextStyle = {
    color: getTextColor(),
    fontSize: getFontSize(),
    fontWeight: theme.fontWeight.semibold,
    textAlign: 'center',
  };

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    marginRight: 8,
  },
});
