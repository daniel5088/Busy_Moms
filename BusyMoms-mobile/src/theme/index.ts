/**
 * Design system exports
 * Centralized theme tokens for the entire application
 */

export * from './colors';
export * from './spacing';
export * from './typography';
export * from './shadows';

import { lightColors, darkColors, type ColorPalette } from './colors';
import { spacing } from './spacing';
import { fontSize, fontWeight, lineHeight } from './typography';
import { shadows, getShadow } from './shadows';

export interface Theme {
  colors: ColorPalette;
  spacing: typeof spacing;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  shadows: typeof shadows;
  getShadow: typeof getShadow;
}

export const lightTheme: Theme = {
  colors: lightColors,
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  getShadow,
};

export const darkTheme: Theme = {
  colors: darkColors,
  spacing,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  getShadow,
};
