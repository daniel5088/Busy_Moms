import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export type AIVoice = 'ash' | 'echo' | 'coral' | 'sage' | 'marin' | 'shimmer';
export type AIPersonality = 'friendly' | 'professional' | 'humorous';

export interface AIVoicePreferences {
  id: string;
  user_id: string;
  voice: AIVoice;
  personality: AIPersonality;
  created_at: string;
  updated_at: string;
}

export const VOICE_OPTIONS: Array<{ value: AIVoice; label: string; description: string }> = [
  { value: 'ash', label: 'Ash', description: 'Neutral and balanced' },
  { value: 'echo', label: 'Echo', description: 'Calm and steady' },
  { value: 'coral', label: 'Coral', description: 'Warm and expressive' },
  { value: 'sage', label: 'Sage', description: 'Deep and authoritative' },
  { value: 'marin', label: 'Marin', description: 'Energetic and bright' },
  { value: 'shimmer', label: 'Shimmer', description: 'Soft and gentle' },
];

export const PERSONALITY_OPTIONS: Array<{ value: AIPersonality; label: string; description: string }> = [
  { value: 'friendly', label: 'Friendly', description: 'Warm, supportive, and encouraging' },
  { value: 'professional', label: 'Professional', description: 'Direct, efficient, and businesslike' },
  { value: 'humorous', label: 'Humorous', description: 'Light-hearted, playful, and fun' },
];

class AIVoicePreferencesService {
  async getUserPreferences(userId: string): Promise<AIVoicePreferences | null> {
    try {
      const { data, error } = await supabase
        .from('ai_voice_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        logger.error('[AIVoicePreferences] Error fetching preferences:', error);
        return null;
      }

      return data;
    } catch (error: unknown) {
      logger.error('[AIVoicePreferences] Error in getUserPreferences:', error);
      return null;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: { voice?: AIVoice; personality?: AIPersonality }
  ): Promise<AIVoicePreferences | null> {
    try {
      const existing = await this.getUserPreferences(userId);

      if (existing) {
        const { data, error } = await supabase
          .from('ai_voice_preferences')
          .update(preferences)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          logger.error('[AIVoicePreferences] Error updating preferences:', error);
          return null;
        }

        return data;
      } else {
        const { data, error } = await supabase
          .from('ai_voice_preferences')
          .insert({
            user_id: userId,
            voice: preferences.voice || 'shimmer',
            personality: preferences.personality || 'friendly',
          })
          .select()
          .single();

        if (error) {
          logger.error('[AIVoicePreferences] Error creating preferences:', error);
          return null;
        }

        return data;
      }
    } catch (error: unknown) {
      logger.error('[AIVoicePreferences] Error in updatePreferences:', error);
      return null;
    }
  }

  async getOrCreatePreferences(userId: string): Promise<AIVoicePreferences> {
    try {
      const existing = await this.getUserPreferences(userId);

      if (existing) {
        return existing;
      }

      const { data, error } = await supabase
        .from('ai_voice_preferences')
        .insert({
          user_id: userId,
          voice: 'shimmer',
          personality: 'friendly',
        })
        .select()
        .single();

      if (error) {
        logger.error('[AIVoicePreferences] Error creating default preferences:', error);
        throw error;
      }

      return data;
    } catch (error: unknown) {
      logger.error('[AIVoicePreferences] Error in getOrCreatePreferences:', error);
      throw error;
    }
  }

  getPersonalityInstructions(personality: AIPersonality): string {
    switch (personality) {
      case 'friendly':
        return 'You are warm, supportive, and encouraging. Use a caring, empathetic tone and show genuine interest in helping busy parents manage their daily lives. Be conversational and friendly while remaining helpful.';

      case 'professional':
        return 'You are direct, efficient, and businesslike. Keep responses concise and focused on getting tasks done. Use a professional tone that respects the user\'s time and emphasizes productivity and organization.';

      case 'humorous':
        return 'You are light-hearted, playful, and fun. Add appropriate humor and wit to your responses while still being helpful. Make parenting tasks feel less overwhelming with your upbeat, cheerful personality.';

      default:
        return '';
    }
  }
}

export const aiVoicePreferencesService = new AIVoicePreferencesService();
