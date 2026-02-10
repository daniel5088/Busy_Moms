import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';
import { logger } from '../utils/logger';

/**
 * Get user profile by ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('❌ Profile fetch error:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }

    logger.debug('✅ Profile updated successfully');
    return data;
  } catch (error) {
    logger.error('❌ Profile update error:', error);
    return null;
  }
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error completing onboarding:', error);
      throw error;
    }

    logger.debug('✅ Onboarding marked as completed');
    return true;
  } catch (error) {
    logger.error('❌ Complete onboarding error:', error);
    return false;
  }
}

/**
 * Create a new profile
 */
export async function createProfile(profileData: Partial<Profile>): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating profile:', error);
      throw error;
    }

    logger.debug('✅ Profile created successfully');
    return data;
  } catch (error) {
    logger.error('❌ Profile create error:', error);
    return null;
  }
}
