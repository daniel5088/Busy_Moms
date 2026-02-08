/**
 * Avatar component - circular image with fallback initials
 */

import React from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

export interface AvatarProps {
  imageUrl?: string | null;
  name: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ imageUrl, name, size = 40, style }: AvatarProps) {
  const { theme } = useTheme();

  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0]?.charAt(0).toUpperCase() || '?';
    }
    return (
      (parts[0]?.charAt(0) || '') + (parts[parts.length - 1]?.charAt(0) || '')
    ).toUpperCase();
  };

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  return (
    <View style={[containerStyle, style]}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              color: theme.colors.primary.dark,
              fontSize: size * 0.4,
              fontWeight: theme.fontWeight.semibold,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {},
});
