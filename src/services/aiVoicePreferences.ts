import { supabase } from '../lib/supabase';

export type AIVoice = 'ash' | 'echo' | 'coral' | 'sage' | 'verse' | 'shimmer';
export type AIPersonality = 'friendly' | 'professional' | 'humorous';

export interface AIVoicePreferences {
  id: string;
  user_id: string;
  voice: AIVoice;
  personality: AIPersonality;
  created_at: string;
  updated_at: string;
}

export const VOICE_OPTIONS = [
  { value: 'ash' as AIVoice, label: 'Ash', description: 'Neutral and balanced' },
  { value: 'echo' as AIVoice, label: 'Echo', description: 'Calm and steady' },
  { value: 'coral' as AIVoice, label: 'Coral', description: 'Warm and expressive' },
  { value: 'sage' as AIVoice, label: 'Sage', description: 'Deep and authoritative' },
  { value: 'verse' as AIVoice, label: 'Verse', description: 'Energetic and bright' },
  { value: 'shimmer' as AIVoice, label: 'Shimmer', description: 'Soft and gentle' },
];

export const PERSONALITY_OPTIONS = [
  { value: 'friendly' as AIPersonality, label: 'Friendly', description: 'Warm, supportive, and encouraging' },
  { value: 'professional' as AIPersonality, label: 'Professional', description: 'Direct, efficient, and businesslike' },
  { value: 'humorous' as AIPersonality, label: 'Humorous', description: 'Light-hearted, playful, and fun' },
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
        console.error('Error fetching AI voice preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return null;
    }
  }

  async updatePreferences(
    userId: string,
    preferences: { voice?: AIVoice; personality?: AIPersonality }
  ): Promise<AIVoicePreferences | null> {
    try {
      const existingPrefs = await this.getUserPreferences(userId);

      if (existingPrefs) {
        const { data, error } = await supabase
          .from('ai_voice_preferences')
          .update(preferences)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          console.error('Error updating AI voice preferences:', error);
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
          console.error('Error creating AI voice preferences:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error in updatePreferences:', error);
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
        console.error('Error creating default AI voice preferences:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getOrCreatePreferences:', error);
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
