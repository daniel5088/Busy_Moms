/**
 * Modal component - full-screen overlay with centered content
 */

import React, { type ReactNode, useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  Pressable,
  type ViewStyle,
  BackHandler,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function Modal({ visible, onClose, title, children, style }: ModalProps) {
  const { theme } = useTheme();

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.background.card,
              ...theme.getShadow('xl'),
            },
            style,
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {title && (
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text.primary,
                  fontSize: theme.fontSize.xl,
                  fontWeight: theme.fontWeight.bold,
                  marginBottom: theme.spacing.base,
                },
              ]}
            >
              {title}
            </Text>
          )}
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    borderRadius: 12,
    padding: 24,
    maxWidth: '90%',
    maxHeight: '80%',
  },
  title: {},
});
