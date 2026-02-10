import { supabase, callEdgeFunction } from '../lib/supabase';
import { logger } from '../utils/logger';
import type { Affirmation, AffirmationSettings } from '../types/database';

class AffirmationService {
  /**
   * Generate a new affirmation via edge function
   */
  async generateAffirmation(forceRegenerate = false): Promise<Affirmation> {
    try {
      const response = await callEdgeFunction<Affirmation>('generate-affirmation', {
        date: new Date().toISOString().split('T')[0],
        forceRegenerate,
      });

      return response;
    } catch (error: unknown) {
      logger.error('[AffirmationService] Error generating affirmation:', error);
      throw new Error('Unable to generate affirmation. Please try again later.');
    }
  }

  /**
   * Get today's affirmation from the database
   */
  async getTodaysAffirmation(userId: string): Promise<Affirmation | null> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('affirmations')
      .select('*')
      .eq('user_id', userId)
      .eq('generated_date', today)
      .maybeSingle();

    if (error) {
      logger.error('[AffirmationService] Error fetching today\'s affirmation:', error);
      return null;
    }

    return data;
  }

  /**
   * Get affirmation history
   */
  async getAffirmationHistory(userId: string, limit = 30): Promise<Affirmation[]> {
    const { data, error } = await supabase
      .from('affirmations')
      .select('*')
      .eq('user_id', userId)
      .order('generated_date', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('[AffirmationService] Error fetching affirmation history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Mark an affirmation as viewed
   */
  async markAsViewed(affirmationId: string): Promise<void> {
    const { error } = await supabase
      .from('affirmations')
      .update({ viewed: true, updated_at: new Date().toISOString() })
      .eq('id', affirmationId);

    if (error) {
      logger.error('[AffirmationService] Error marking affirmation as viewed:', error);
    }
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(affirmationId: string, favorited: boolean): Promise<void> {
    const { error } = await supabase
      .from('affirmations')
      .update({ favorited, updated_at: new Date().toISOString() })
      .eq('id', affirmationId);

    if (error) {
      logger.error('[AffirmationService] Error toggling favorite:', error);
      throw error;
    }
  }

  /**
   * Get affirmation settings, creating defaults if needed
   */
  async getSettings(userId: string): Promise<AffirmationSettings | null> {
    const { data, error } = await supabase
      .from('affirmation_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      logger.error('[AffirmationService] Error fetching settings:', error);
      return null;
    }

    if (!data) {
      return await this.createDefaultSettings(userId);
    }

    return data;
  }

  /**
   * Create default settings for a user
   */
  async createDefaultSettings(userId: string): Promise<AffirmationSettings | null> {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { data, error } = await supabase
      .from('affirmation_settings')
      .insert({
        user_id: userId,
        enabled: true,
        frequency: 'once_daily',
        preferred_time: '08:00:00',
        secondary_time: '20:00:00',
        timezone: userTimezone,
        include_calendar: true,
        include_tasks: true,
        include_family: true,
        include_shopping: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('[AffirmationService] Error creating default settings:', error);
      return null;
    }

    return data;
  }

  /**
   * Update affirmation settings
   */
  async updateSettings(
    userId: string,
    settings: Partial<AffirmationSettings>
  ): Promise<AffirmationSettings | null> {
    const { data, error } = await supabase
      .from('affirmation_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('[AffirmationService] Error updating settings:', error);
      throw error;
    }

    return data;
  }

  /**
   * Determine if it's time to show an affirmation
   */
  shouldShowAffirmation(settings: AffirmationSettings | null): boolean {
    if (!settings?.enabled || !settings.preferred_time) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const prefParts = settings.preferred_time.split(':').map(Number);
    const prefHour = prefParts[0] ?? 8;
    const prefMinute = prefParts[1] ?? 0;
    const isPreferredTime = currentHour === prefHour && currentMinute === prefMinute;

    if (settings.frequency === 'twice_daily' && settings.secondary_time) {
      const secParts = settings.secondary_time.split(':').map(Number);
      const secHour = secParts[0] ?? 20;
      const secMinute = secParts[1] ?? 0;
      const isSecondaryTime = currentHour === secHour && currentMinute === secMinute;
      return isPreferredTime || isSecondaryTime;
    }

    return isPreferredTime;
  }

  /**
   * Get time until next affirmation in milliseconds
   */
  getTimeUntilNextAffirmation(settings: AffirmationSettings | null): number | null {
    if (!settings?.enabled || !settings.preferred_time) {
      return null;
    }

    const now = new Date();
    const nextParts = settings.preferred_time.split(':').map(Number);
    const prefHour = nextParts[0] ?? 8;
    const prefMinute = nextParts[1] ?? 0;

    const nextAffirmation = new Date();
    nextAffirmation.setHours(prefHour, prefMinute, 0, 0);

    if (nextAffirmation <= now) {
      nextAffirmation.setDate(nextAffirmation.getDate() + 1);
    }

    return nextAffirmation.getTime() - now.getTime();
  }
}

export const affirmationService = new AffirmationService();
