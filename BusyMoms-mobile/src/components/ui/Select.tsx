/**
 * Select component - dropdown selector (opens as modal on mobile)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Modal } from './Modal';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  style?: ViewStyle;
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select an option',
  style,
}: SelectProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setModalVisible(false);
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
          styles.selector,
          {
            backgroundColor: theme.colors.background.input,
            borderWidth: 1,
            borderColor: theme.colors.border.default,
            borderRadius: 8,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text
          style={[
            styles.selectorText,
            {
              color: selectedOption
                ? theme.colors.text.primary
                : theme.colors.text.tertiary,
              fontSize: theme.fontSize.base,
            },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={label || 'Select an option'}
      >
        <ScrollView style={styles.optionsList}>
          {options.map((option) => (
            <Pressable
              key={option.value}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: pressed
                    ? theme.colors.gray[200]
                    : 'transparent',
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.base,
                  borderRadius: 8,
                },
                option.value === value && {
                  backgroundColor: theme.colors.primary.light,
                },
              ]}
              onPress={() => handleSelect(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  {
                    color:
                      option.value === value
                        ? theme.colors.primary.dark
                        : theme.colors.text.primary,
                    fontSize: theme.fontSize.base,
                    fontWeight:
                      option.value === value
                        ? theme.fontWeight.semibold
                        : theme.fontWeight.normal,
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Modal>
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
  selector: {
    justifyContent: 'center',
  },
  selectorText: {},
  optionsList: {
    maxHeight: 400,
  },
  option: {},
  optionText: {},
});
