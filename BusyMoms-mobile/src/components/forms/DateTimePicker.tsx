/**
 * DateTimePicker component - date/time picker
 * Note: Requires @react-native-community/datetimepicker to be installed
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { format } from 'date-fns';

export interface DateTimePickerProps {
  mode: 'date' | 'time' | 'datetime';
  value: Date;
  onChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  style?: ViewStyle;
}

export function DateTimePicker({
  mode,
  value,
  onChange: _onChange,
  label,
  minimumDate: _minimumDate,
  maximumDate: _maximumDate,
  style,
}: DateTimePickerProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const getDisplayValue = (): string => {
    switch (mode) {
      case 'date':
        return format(value, 'MMM dd, yyyy');
      case 'time':
        return format(value, 'h:mm a');
      case 'datetime':
        return format(value, 'MMM dd, yyyy h:mm a');
      default:
        return format(value, 'MMM dd, yyyy');
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: theme.colors.text.secondary,
              fontSize: theme.fontSize.sm,
              marginBottom: theme.spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <Pressable
        style={[
          styles.picker,
          {
            backgroundColor: theme.colors.background.input,
            borderWidth: 1,
            borderColor: theme.colors.border.default,
            borderRadius: 8,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
        onPress={() => setShowPicker(true)}
      >
        <Text
          style={[
            styles.pickerText,
            {
              color: theme.colors.text.primary,
              fontSize: theme.fontSize.base,
            },
          ]}
        >
          {getDisplayValue()}
        </Text>
      </Pressable>

      {/* DateTimePicker will be implemented after installing @react-native-community/datetimepicker */}
      {showPicker && (
        <Text style={{ color: theme.colors.text.tertiary, marginTop: 8 }}>
          Native date picker will be available after installing @react-native-community/datetimepicker
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontWeight: '500',
  },
  picker: {
    justifyContent: 'center',
  },
  pickerText: {},
});
