/**
 * Toast component - displays toast notifications
 * Should be placed at root level to overlay all content
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { useToast } from '../../hooks/useToast';
import type { ToastType } from '../../contexts/ToastContext';

export function ToastContainer() {
  const { toasts, hideToast } = useToast();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const getBackgroundColor = (type: ToastType): string => {
    switch (type) {
      case 'success':
        return theme.colors.status.success;
      case 'warning':
        return theme.colors.status.warning;
      case 'error':
        return theme.colors.status.error;
      case 'info':
        return theme.colors.primary.main;
      default:
        return theme.colors.primary.main;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          top: insets.top + theme.spacing.md,
        },
      ]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Pressable
          key={toast.id}
          onPress={() => hideToast(toast.id)}
          style={[
            styles.toast,
            {
              backgroundColor: getBackgroundColor(toast.type),
              marginBottom: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              ...theme.getShadow('md'),
            },
          ]}
        >
          <Text
            style={[
              styles.toastText,
              {
                fontSize: theme.fontSize.base,
                color: '#FFFFFF',
              },
            ]}
          >
            {toast.message}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  toastText: {
    fontWeight: '500',
    textAlign: 'center',
  },
});
