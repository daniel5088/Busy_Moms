/**
 * Header component - screen header with title, back button, and optional right action
 */

import React, { type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  style?: ViewStyle;
}

export function Header({ title, onBack, rightAction, style }: HeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: theme.spacing.base,
          paddingVertical: theme.spacing.md,
          backgroundColor: theme.colors.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border.default,
        },
        style,
      ]}
    >
      <View style={styles.leftSection}>
        {onBack && (
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? 0.6 : 1,
                marginRight: theme.spacing.sm,
              },
            ]}
            onPress={onBack}
          >
            <Text
              style={{
                color: theme.colors.primary.main,
                fontSize: theme.fontSize.lg,
              }}
            >
              ←
            </Text>
          </Pressable>
        )}
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.bold,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <View style={styles.rightSection}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  leftSection: {
    width: 40,
    justifyContent: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  rightSection: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
