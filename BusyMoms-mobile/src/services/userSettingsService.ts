import { supabase } from '../lib/supabase';

export interface UserSettings {
  id: string;
  user_id: string;
  dark_mode: boolean;
  measurement_system: 'metric' | 'imperial';
  temperature_unit: 'fahrenheit' | 'celsius';
  created_at: string;
  updated_at: string;
}

class UserSettingsService {
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return await this.createDefaultSettings(userId);
      }

      return data;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  async createDefaultSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          dark_mode: false,
          measurement_system: 'imperial',
          temperature_unit: 'fahrenheit',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default user settings:', error);
      return null;
    }
  }

  async updateUserSettings(userId: string, settings: Partial<UserSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_settings')
        .update(settings)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating user settings:', error);
      return false;
    }
  }

  async resetTutorials(userId: string): Promise<boolean> {
    try {
      // Delete all tutorial progress for this user
      const { error } = await supabase
        .from('user_tutorials')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resetting tutorials:', error);
      return false;
    }
  }

  async resetTutorial(userId: string, screen: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_tutorials')
        .delete()
        .eq('user_id', userId)
        .eq('screen', screen);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error resetting tutorial:', error);
      return false;
    }
  }
}

export const userSettingsService = new UserSettingsService();
