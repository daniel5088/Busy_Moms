/**
 * Shadow definitions for elevation
 * Platform-specific shadow configurations
 */

import { Platform, ViewStyle } from 'react-native';

export interface Shadow {
  ios: ViewStyle;
  android: ViewStyle;
}

export const shadows = {
  none: {
    ios: {},
    android: {},
  },
  sm: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  },
  base: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
  },
  md: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
    },
    android: {
      elevation: 6,
    },
  },
  lg: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
    },
    android: {
      elevation: 12,
    },
  },
  xl: {
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    android: {
      elevation: 16,
    },
  },
} as const;

/**
 * Get platform-specific shadow styles
 */
export function getShadow(size: keyof typeof shadows): ViewStyle {
  return Platform.select({
    ios: shadows[size].ios,
    android: shadows[size].android,
    default: {},
  });
}

export type ShadowKey = keyof typeof shadows;
