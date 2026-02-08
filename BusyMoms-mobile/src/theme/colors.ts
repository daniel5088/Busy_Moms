/**
 * Color palette for Busy Moms Mobile
 * Supports light and dark modes
 */

export interface ColorPalette {
  // Primary brand colors
  primary: {
    main: string;
    dark: string;
    light: string;
  };

  // Secondary colors
  secondary: {
    main: string;
    dark: string;
    light: string;
  };

  // Background colors
  background: {
    primary: string;
    secondary: string;
    card: string;
    input: string;
  };

  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };

  // Border colors
  border: {
    default: string;
    light: string;
  };

  // Status colors
  status: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };

  // Gray scale
  gray: {
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };

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
  primary: {
    main: '#3B82F6',
    dark: '#2563EB',
    light: '#93C5FD',
  },

  // Secondary (green)
  secondary: {
    main: '#10B981',
    dark: '#059669',
    light: '#6EE7B7',
  },

  // Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    card: '#FFFFFF',
    input: '#FFFFFF',
  },

  // Text
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  // Borders
  border: {
    default: '#E5E7EB',
    light: '#F3F4F6',
  },

  // Status
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Gray scale
  gray: {
    100: '#F9FAFB',
    200: '#F3F4F6',
    300: '#E5E7EB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

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
  primary: {
    main: '#60A5FA',
    dark: '#3B82F6',
    light: '#93C5FD',
  },

  // Secondary (green)
  secondary: {
    main: '#34D399',
    dark: '#10B981',
    light: '#6EE7B7',
  },

  // Backgrounds
  background: {
    primary: '#111827',
    secondary: '#1F2937',
    card: '#1F2937',
    input: '#374151',
  },

  // Text
  text: {
    primary: '#F9FAFB',
    secondary: '#D1D5DB',
    tertiary: '#9CA3AF',
    inverse: '#111827',
  },

  // Borders
  border: {
    default: '#374151',
    light: '#4B5563',
  },

  // Status
  status: {
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },

  // Gray scale
  gray: {
    100: '#111827',
    200: '#1F2937',
    300: '#374151',
    400: '#4B5563',
    500: '#6B7280',
    600: '#9CA3AF',
    700: '#D1D5DB',
    800: '#E5E7EB',
    900: '#F9FAFB',
  },

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
