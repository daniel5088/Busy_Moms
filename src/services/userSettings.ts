// src/services/userSettings.ts
import { supabase } from '../lib/supabase';

export interface UserSettings {
  user_id: string;
  preferred_retailer: string | null;
  updated_at: string | null;
}

/**
 * Returns the user's preferred Instacart retailer id, or null if not set.
 * Ensures a row exists (auto-creates if missing).
 */
export async function getPreferredRetailer(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('preferred_retailer')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('getPreferredRetailer error:', error);
      return null;
    }

    // If no row exists → create it
    if (!data) {
      await initializeUserSettings(userId);
      return null;
    }

    return data.preferred_retailer ?? null;
  } catch (e) {
    console.error('getPreferredRetailer exception:', e);
    return null;
  }
}

/**
 * Sets (or clears) the user's preferred Instacart retailer.
 * Uses upsert so the row is created if missing.
 */
export async function setPreferredRetailer(
  userId: string,
  retailerId: string | null
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        preferred_retailer: retailerId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

    if (error) {
      console.error('setPreferredRetailer error:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('setPreferredRetailer exception:', e);
    return false;
  }
}

/**
 * Initializes the row for a user if it does not exist.
 */
async function initializeUserSettings(userId: string): Promise<void> {
  try {
    await supabase.from('user_settings').insert({
      user_id: userId,
      preferred_retailer: null,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('initializeUserSettings error:', e);
  }
}
