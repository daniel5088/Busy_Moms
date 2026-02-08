/**
 * SearchInput component - text input with search icon and clear button
 */

import React from 'react';
import { View, TextInput, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
}: SearchInputProps) {
  const { theme } = useTheme();

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.input,
          borderWidth: 1,
          borderColor: theme.colors.border.default,
          borderRadius: 8,
          paddingHorizontal: theme.spacing.md,
        },
        style,
      ]}
    >
      <View style={styles.searchIcon}>
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: theme.colors.text.tertiary,
          }}
        />
      </View>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.colors.text.primary,
            fontSize: theme.fontSize.base,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
      />
      {value.length > 0 && (
        <Pressable
          style={({ pressed }) => ({
            opacity: pressed ? 0.6 : 1,
          })}
          onPress={handleClear}
        >
          <View
            style={[
              styles.clearButton,
              {
                backgroundColor: theme.colors.gray[400],
              },
            ]}
          >
            <View
              style={[
                styles.clearIcon,
                {
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
  },
  clearButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    width: 10,
    height: 2,
  },
});
