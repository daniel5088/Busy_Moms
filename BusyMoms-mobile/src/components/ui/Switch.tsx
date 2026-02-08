/**
 * Switch component - toggle switch with optional label
 */

import React from 'react';
import { View, Text, Switch as RNSwitch, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Switch({ value, onValueChange, label, disabled = false, style }: SwitchProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary,
              fontSize: theme.fontSize.base,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: theme.colors.gray[400],
          true: theme.colors.primary.light,
        }}
        thumbColor={value ? theme.colors.primary.main : theme.colors.gray[100]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    flex: 1,
    marginRight: 12,
  },
});
