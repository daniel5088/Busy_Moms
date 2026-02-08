import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Custom storage adapter that uses SecureStore for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important: disable for React Native
  },
  db: { schema: 'public' },
});

/**
 * Helper function to call Supabase Edge Functions
 * Automatically includes authentication headers
 */
export async function callEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>,
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${config.supabaseUrl}/functions/v1/${functionName}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': config.supabaseAnonKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Edge function error: ${response.status}`);
  }

  return response.json();
}
