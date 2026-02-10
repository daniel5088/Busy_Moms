/**
 * Lightweight logger that gates debug output behind __DEV__.
 * console.warn and console.error are allowed by ESLint config,
 * so this utility mainly replaces console.log calls.
 */

export const logger = {
  debug: (...args: unknown[]) => {
    if (__DEV__) console.warn('[BMA:debug]', ...args);
  },
  info: (...args: unknown[]) => {
    if (__DEV__) console.warn('[BMA:info]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[BMA:warn]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[BMA:error]', ...args);
  },
};
