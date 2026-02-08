/**
 * KeyboardAvoid component - KeyboardAvoidingView wrapper with platform-specific behavior
 */

import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';

export interface KeyboardAvoidProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function KeyboardAvoid({ children, style }: KeyboardAvoidProps) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
