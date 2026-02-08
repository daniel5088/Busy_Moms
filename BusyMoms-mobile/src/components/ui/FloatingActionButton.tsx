/**
 * FloatingActionButton - circular button positioned bottom-right
 */

import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface FloatingActionButtonProps {
  icon: ReactNode;
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
}

export function FloatingActionButton({
  icon,
  onPress,
  color,
  style,
}: FloatingActionButtonProps) {
  const { theme } = useTheme();

  const backgroundColor = color || theme.colors.primary.main;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor,
          ...theme.getShadow('lg'),
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
      onPress={onPress}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
