import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { useTheme, ThemeProvider } from '../../hooks/useTheme';

describe('useTheme', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  it('should provide theme object', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBeDefined();
    expect(result.current.theme.colors).toBeDefined();
    expect(result.current.theme.spacing).toBeDefined();
  });

  it('should provide isDark boolean', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(typeof result.current.isDark).toBe('boolean');
  });

  it('should provide toggleTheme function', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(typeof result.current.toggleTheme).toBe('function');
  });

  it('should have color definitions', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    const { colors } = result.current.theme;
    expect(colors.primary).toBeDefined();
    expect(colors.background).toBeDefined();
    expect(colors.text).toBeDefined();
  });
});
