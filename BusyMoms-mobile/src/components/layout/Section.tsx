/**
 * Section component - content section with title and optional "See All" button
 */

import React, { type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SectionProps {
  title: string;
  onSeeAll?: () => void;
  children: ReactNode;
  style?: ViewStyle;
}

export function Section({ title, onSeeAll, children, style }: SectionProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginBottom: theme.spacing.lg,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.header,
          {
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.lg,
              fontWeight: theme.fontWeight.semibold,
            },
          ]}
        >
          {title}
        </Text>
        {onSeeAll && (
          <Pressable
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
            onPress={onSeeAll}
          >
            <Text
              style={[
                styles.seeAllText,
                {
                  color: theme.colors.primary.main,
                  fontSize: theme.fontSize.sm,
                  fontWeight: theme.fontWeight.medium,
                },
              ]}
            >
              See All
            </Text>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {},
  seeAllText: {},
});
