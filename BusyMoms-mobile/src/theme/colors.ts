/**
 * Color palette for Busy Moms Mobile
 * Supports light and dark modes
 */

export interface ColorPalette {
  // Primary brand colors
  primary: string;
  primaryDark: string;
  primaryLight: string;

  // Secondary colors
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;

  // Background colors
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHighlight: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Border colors
  border: string;
  borderLight: string;

  // Status colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;
  info: string;
  infoLight: string;

  // Instacart brand colors (for integrations)
  instacart: {
    kale: string;
    cashew: string;
    green: string;
    orange: string;
  };

  // Family member pastel colors
  pastel: {
    red: string;
    orange: string;
    peach: string;
    yellow: string;
    lime: string;
    green: string;
    mint: string;
    teal: string;
    cyan: string;
    sky: string;
    blue: string;
    lavender: string;
    purple: string;
    pink: string;
    rose: string;
    gray: string;
  };
}

export const lightColors: ColorPalette = {
  // Primary (blue)
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#93C5FD',

  // Secondary (green)
  secondary: '#10B981',
  secondaryDark: '#059669',
  secondaryLight: '#6EE7B7',

  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceHighlight: '#F3F4F6',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Instacart
  instacart: {
    kale: '#003D29',
    cashew: '#FAF1E5',
    green: '#0AAD0A',
    orange: '#FF7009',
  },

  // Pastel family colors
  pastel: {
    red: '#F8B4B4',
    orange: '#FBC9A9',
    peach: '#FBD1B7',
    yellow: '#FAE3A0',
    lime: '#D7F5A3',
    green: '#A8E6CF',
    mint: '#B2F2BB',
    teal: '#A0E7E5',
    cyan: '#99E9F2',
    sky: '#A5D8FF',
    blue: '#B5C7F2',
    lavender: '#CDB4DB',
    purple: '#D0BFFF',
    pink: '#FFAFCC',
    rose: '#F4C2C2',
    gray: '#E2E2E2',
  },
};

export const darkColors: ColorPalette = {
  // Primary (blue)
  primary: '#60A5FA',
  primaryDark: '#3B82F6',
  primaryLight: '#93C5FD',

  // Secondary (green)
  secondary: '#34D399',
  secondaryDark: '#10B981',
  secondaryLight: '#6EE7B7',

  // Backgrounds
  background: '#111827',
  backgroundSecondary: '#1F2937',
  surface: '#1F2937',
  surfaceHighlight: '#374151',

  // Text
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  textInverse: '#111827',

  // Borders
  border: '#374151',
  borderLight: '#4B5563',

  // Status
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#78350F',
  error: '#F87171',
  errorLight: '#7F1D1D',
  info: '#60A5FA',
  infoLight: '#1E3A8A',

  // Instacart (same as light)
  instacart: {
    kale: '#003D29',
    cashew: '#FAF1E5',
    green: '#0AAD0A',
    orange: '#FF7009',
  },

  // Pastel family colors (slightly adjusted for dark mode)
  pastel: {
    red: '#F8B4B4',
    orange: '#FBC9A9',
    peach: '#FBD1B7',
    yellow: '#FAE3A0',
    lime: '#D7F5A3',
    green: '#A8E6CF',
    mint: '#B2F2BB',
    teal: '#A0E7E5',
    cyan: '#99E9F2',
    sky: '#A5D8FF',
    blue: '#B5C7F2',
    lavender: '#CDB4DB',
    purple: '#D0BFFF',
    pink: '#FFAFCC',
    rose: '#F4C2C2',
    gray: '#E2E2E2',
  },
};
