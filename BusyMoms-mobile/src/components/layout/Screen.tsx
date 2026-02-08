/**
 * Screen component - SafeAreaView wrapper with theme background
 */

import React, { type ReactNode } from 'react';
import { View, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

export interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export function Screen({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  scrollable = false,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { theme } = useTheme();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  };

  if (scrollable) {
    return (
      <SafeAreaView style={[containerStyle, style]} edges={edges}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[containerStyle, style]} edges={edges}>
      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
