import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ServingsAdjusterProps {
  servings: number;
  onServingsChange: (servings: number) => void;
  minServings?: number;
  maxServings?: number;
}

export function ServingsAdjuster({
  servings,
  onServingsChange,
  minServings = 1,
  maxServings = 20,
}: ServingsAdjusterProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleDecrease = () => {
    if (servings > minServings) {
      onServingsChange(servings - 1);
    }
  };

  const handleIncrease = () => {
    if (servings < maxServings) {
      onServingsChange(servings + 1);
    }
  };

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <Text style={[styles.label, isDark && styles.labelDark]}>Servings</Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            isDark && styles.buttonDark,
            servings <= minServings && styles.buttonDisabled,
          ]}
          onPress={handleDecrease}
          disabled={servings <= minServings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="remove"
            size={20}
            color={
              servings <= minServings
                ? isDark
                  ? '#4b5563'
                  : '#9ca3af'
                : isDark
                ? '#60a5fa'
                : '#3b82f6'
            }
          />
        </TouchableOpacity>

        <View style={[styles.servingsDisplay, isDark && styles.servingsDisplayDark]}>
          <Text style={[styles.servingsText, isDark && styles.servingsTextDark]}>
            {servings}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            isDark && styles.buttonDark,
            servings >= maxServings && styles.buttonDisabled,
          ]}
          onPress={handleIncrease}
          disabled={servings >= maxServings}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="add"
            size={20}
            color={
              servings >= maxServings
                ? isDark
                  ? '#4b5563'
                  : '#9ca3af'
                : isDark
                ? '#60a5fa'
                : '#3b82f6'
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  containerDark: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  labelDark: {
    color: '#f9fafb',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDark: {
    backgroundColor: '#1e3a8a',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  servingsDisplay: {
    minWidth: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  servingsDisplayDark: {
    backgroundColor: '#111827',
    borderColor: '#4b5563',
  },
  servingsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  servingsTextDark: {
    color: '#f9fafb',
  },
});
