import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InstacartButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  itemCount?: number;
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
}

export function InstacartButton({
  onPress,
  disabled = false,
  loading = false,
  itemCount,
  variant = 'primary',
  fullWidth = false,
}: InstacartButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        fullWidth && styles.buttonFullWidth,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Ionicons
            name="cart"
            size={20}
            color={isPrimary ? '#fff' : '#047857'}
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <Text style={[isPrimary ? styles.textPrimary : styles.textSecondary]}>
              Send to Instacart
            </Text>
            {itemCount !== undefined && itemCount > 0 && (
              <Text
                style={[
                  isPrimary ? styles.countTextPrimary : styles.countTextSecondary,
                ]}
              >
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonPrimary: {
    backgroundColor: '#10b981',
  },
  buttonSecondary: {
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonFullWidth: {
    width: '100%',
  },
  icon: {
    marginRight: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  textPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
  },
  countTextPrimary: {
    fontSize: 12,
    color: '#d1fae5',
    marginTop: 2,
  },
  countTextSecondary: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
});
