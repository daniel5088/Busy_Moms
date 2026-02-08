/**
 * Card component - container with background, border, and optional shadow
 */

import React, { type ReactNode } from 'react';
import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  noPadding?: boolean;
  noShadow?: boolean;
}

export function Card({ children, style, onPress, noPadding = false, noShadow = false }: CardProps) {
  const { theme } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: noPadding ? 0 : theme.spacing.base,
    ...(!noShadow && theme.getShadow('base')),
  };

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          cardStyle,
          style,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
});
