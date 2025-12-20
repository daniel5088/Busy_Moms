import { supabase, Affirmation, AffirmationSettings } from '../lib/supabase';

export interface AuthDiagnostics {
  hasSession: boolean;
  hasAccessToken: boolean;
  tokenExpired: boolean;
  expiresAt: string | null;
  userId: string | null;
  error: string | null;
}

export class AffirmationService {
  /**
   * Diagnose authentication state for debugging
   */
  async diagnoseAuth(): Promise<AuthDiagnostics> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        return {
          hasSession: false,
          hasAccessToken: false,
          tokenExpired: true,
          expiresAt: null,
          userId: null,
          error: error.message,
        };
      }

      if (!session) {
        return {
          hasSession: false,
          hasAccessToken: false,
          tokenExpired: true,
          expiresAt: null,
          userId: null,
          error: 'No active session found. Please sign in.',
        };
      }

      const expiresAt = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null;
      const tokenExpired = session.expires_at
        ? Date.now() >= session.expires_at * 1000
        : false;

      return {
        hasSession: true,
        hasAccessToken: !!session.access_token,
        tokenExpired,
        expiresAt,
        userId: session.user?.id || null,
        error: tokenExpired ? 'Session expired. Please sign in again.' : null,
      };
    } catch (err) {
      return {
        hasSession: false,
        hasAccessToken: false,
        tokenExpired: true,
        expiresAt: null,
        userId: null,
        error: err instanceof Error ? err.message : 'Unknown error checking auth state',
      };
    }
  }

  /**
   * Attempt to refresh the session if expired
   */
  async refreshSessionIfNeeded(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.warn('[AffirmationService] No session to refresh');
        return false;
      }

      // Check if token is expired or will expire in the next 5 minutes
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

      if (expiresAt < fiveMinutesFromNow) {
        console.log('[AffirmationService] Token expired or expiring soon, refreshing...');
        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
          console.error('[AffirmationService] Failed to refresh session:', error.message);
          return false;
        }

        if (data.session) {
          console.log('[AffirmationService] Session refreshed successfully');
          return true;
        }
      }

      return true;
    } catch (err) {
      console.error('[AffirmationService] Error refreshing session:', err);
      return false;
    }
  }

  async generateAffirmation(forceRegenerate: boolean = false): Promise<Affirmation> {
    // Attempt to refresh session if needed
    const sessionValid = await this.refreshSessionIfNeeded();
    if (!sessionValid) {
      const diagnostics = await this.diagnoseAuth();
      console.error('[AffirmationService] Auth diagnostics:', diagnostics);
      throw new Error(diagnostics.error || 'User not authenticated');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[AffirmationService] Session error:', sessionError.message);
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session) {
      console.error('[AffirmationService] No session found after refresh attempt');
      throw new Error('User not authenticated. Please sign in.');
    }

    if (!session.access_token) {
      console.error('[AffirmationService] Session exists but no access token');
      throw new Error('Invalid session state. Please sign in again.');
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-affirmation`;
    console.log('[AffirmationService] Calling generate-affirmation API:', {
      url: apiUrl,
      hasToken: !!session.access_token,
      tokenLength: session.access_token.length,
      userId: session.user?.id,
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        forceRegenerate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AffirmationService] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      // Provide more specific error messages
      if (response.status === 401) {
        const diagnostics = await this.diagnoseAuth();
        console.error('[AffirmationService] 401 Auth diagnostics:', diagnostics);
        throw new Error(
          errorData.error === 'Missing authorization header'
            ? 'Authorization header not received by server. Please try signing out and back in.'
            : `Authentication failed: ${errorData.error || 'Please sign in again.'}`
        );
      }

      if (response.status === 403) {
        throw new Error('Access denied. Affirmations may be disabled for your account.');
      }

      if (response.status >= 500) {
        throw new Error('Server error generating affirmation. Please try again later.');
      }

      throw new Error(errorData.error || 'Failed to generate affirmation');
    }

    const affirmation = await response.json();
    console.log('[AffirmationService] Affirmation generated successfully:', affirmation.id);
    return affirmation;
  }

  async getTodaysAffirmation(): Promise<Affirmation | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('affirmations')
      .select('*')
      .eq('user_id', user.id)
      .eq('generated_date', today)
      .maybeSingle();

    if (error) {
      console.error("Error fetching today's affirmation:", error);
      return null;
    }

    return data;
  }

  async getAffirmationHistory(limit: number = 30): Promise<Affirmation[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('affirmations')
      .select('*')
      .eq('user_id', user.id)
      .order('generated_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching affirmation history:', error);
      return [];
    }

    return data || [];
  }

  async markAsViewed(affirmationId: string): Promise<void> {
    const { error } = await supabase
      .from('affirmations')
      .update({ viewed: true, updated_at: new Date().toISOString() })
      .eq('id', affirmationId);

    if (error) {
      console.error('Error marking affirmation as viewed:', error);
    }
  }

  async toggleFavorite(affirmationId: string, favorited: boolean): Promise<void> {
    const { error } = await supabase
      .from('affirmations')
      .update({ favorited, updated_at: new Date().toISOString() })
      .eq('id', affirmationId);

    if (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }

  async getSettings(): Promise<AffirmationSettings | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('affirmation_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching affirmation settings:', error);
      return null;
    }

    if (!data) {
      return await this.createDefaultSettings();
    }

    return data;
  }

  async createDefaultSettings(): Promise<AffirmationSettings | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const { data, error } = await supabase
      .from('affirmation_settings')
      .insert({
        user_id: user.id,
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
      console.error('Error creating default settings:', error);
      return null;
    }

    return data;
  }

  async updateSettings(
    settings: Partial<AffirmationSettings>
  ): Promise<AffirmationSettings | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('affirmation_settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating affirmation settings:', error);
      throw error;
    }

    return data;
  }

  shouldShowAffirmation(settings: AffirmationSettings | null): boolean {
    if (!settings || !settings.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (!settings.preferred_time) {
      return false;
    }

    const [prefHour, prefMinute] = settings.preferred_time.split(':').map(Number);

    const isPreferredTime = currentHour === prefHour && currentMinute === prefMinute;

    if (settings.frequency === 'twice_daily' && settings.secondary_time) {
      const [secHour, secMinute] = settings.secondary_time.split(':').map(Number);
      const isSecondaryTime = currentHour === secHour && currentMinute === secMinute;
      return isPreferredTime || isSecondaryTime;
    }

    return isPreferredTime;
  }

  async checkAndShowAffirmation(): Promise<Affirmation | null> {
    const settings = await this.getSettings();

    if (!this.shouldShowAffirmation(settings)) {
      return null;
    }

    let affirmation = await this.getTodaysAffirmation();

    if (!affirmation) {
      try {
        affirmation = await this.generateAffirmation(false);
      } catch (error) {
        console.error('Error generating affirmation:', error);
        return null;
      }
    }

    if (affirmation && !affirmation.viewed) {
      await this.markAsViewed(affirmation.id);
    }

    return affirmation;
  }

  getTimeUntilNextAffirmation(settings: AffirmationSettings | null): number | null {
    if (!settings || !settings.enabled || !settings.preferred_time) {
      return null;
    }

    const now = new Date();
    const [prefHour, prefMinute] = settings.preferred_time.split(':').map(Number);

    const nextAffirmation = new Date();
    nextAffirmation.setHours(prefHour, prefMinute, 0, 0);

    if (nextAffirmation <= now) {
      nextAffirmation.setDate(nextAffirmation.getDate() + 1);
    }

    return nextAffirmation.getTime() - now.getTime();
  }

  formatTimeUntilNext(milliseconds: number): string {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

export const affirmationService = new AffirmationService();
