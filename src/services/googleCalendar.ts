// Google Calendar service for managing calendar integration
import { supabase } from '../lib/supabase';
import { getActiveSession } from '../lib/sessionHelper';
import type { Event } from '../lib/supabase';

export interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  htmlLink?: string;
  status?: string;
  created?: string;
  updated?: string;
}

export interface CalendarListOptions {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  q?: string;
}

/** Maps local Event → Google-ish payload (kept in sync with calendarSyncService.localEventToGoogle) */
export function mapLocalToGoogle(local: Event): Partial<GoogleCalendarEvent> {
  const out: Partial<GoogleCalendarEvent> = {
    summary: local.title,
    description: local.description || undefined,
    location: local.location || undefined,
    start: {},
    end: {},
    attendees: Array.isArray(local.participants)
      ? local.participants.map(p => ({
          email: p.includes('@') ? p : undefined,
          displayName: !p.includes('@') ? p : undefined,
        }))
      : undefined,
  };

  if (local.start_time) {
    out.start = {
      dateTime: `${local.event_date}T${local.start_time}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    out.end = local.end_time
      ? {
          dateTime: `${local.event_date}T${local.end_time}`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      : out.start; // server can set default duration if needed
  } else {
    // All-day
    out.start = { date: local.event_date };
    const nextDay = new Date(local.event_date);
    nextDay.setDate(nextDay.getDate() + 1);
    out.end = { date: nextDay.toISOString().split('T')[0] };
  }

  return out;
}

class GoogleCalendarService {
  private baseUrl: string;
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private available = false;
  private ready = false;
  private signedIn = false;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.error('❌ VITE_SUPABASE_URL not configured');
      this.baseUrl = '';
    } else {
      this.baseUrl = `${supabaseUrl}/functions/v1`;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = this.doInitialize();
    await this.initializePromise;
    this.initializePromise = null;
  }

  private async doInitialize(): Promise<void> {
    if (!this.baseUrl) {
      console.error('❌ Supabase URL not configured. Set VITE_SUPABASE_URL environment variable.');
      this.available = false;
      this.ready = false;
      this.signedIn = false;
      this.initialized = true;
      return;
    }

    try {
      const session = await getActiveSession();

      if (!session || !session.user) {
        console.log('ℹ️ No active session - Google Calendar service unavailable until sign in');
        this.available = false;
        this.ready = false;
        this.signedIn = false;
        this.initialized = true;
        return;
      }

      const user = session.user;

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        console.error('❌ VITE_SUPABASE_ANON_KEY not configured');
        this.available = false;
        this.ready = false;
        this.signedIn = false;
        this.initialized = true;
        return;
      }

      const response = await fetch(`${this.baseUrl}/google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          action: 'isConnected',
          userId: user.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.signedIn = data.connected || false;
        this.available = true;
        this.ready = true;
        console.log(`✅ Google Calendar service initialized. Connected: ${this.signedIn}`);
      } else {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        console.error(`❌ Google Calendar Edge Function error: ${errorMessage}`);

        if (response.status === 500 && errorMessage.includes('Google Calendar not configured')) {
          console.error('💡 Setup Required: Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured');
          console.error('💡 These must be set in Supabase Dashboard → Project Settings → Edge Functions → Secrets');
          console.error(`💡 Run diagnostics to check setup: ${this.baseUrl}/google-diagnostics`);
        }

        this.available = false;
        this.ready = false;
        this.signedIn = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Calendar service:', error);
      console.error('💡 Possible causes:');
      console.error('   1. Edge Functions not deployed or not responding');
      console.error('   2. Network connectivity issues');
      console.error('   3. Invalid Supabase configuration');
      console.error(`💡 Run diagnostics: ${this.baseUrl}/google-diagnostics`);
      this.available = false;
      this.ready = false;
      this.signedIn = false;
    }

    this.initialized = true;
  }

  isAvailable(): boolean {
    return this.available;
  }

  isReady(): boolean {
    return this.ready;
  }

  isSignedIn(): boolean {
    return this.signedIn;
  }

  async isConnected(userId: string): Promise<boolean> {
    if (!this.baseUrl) {
      console.log('⚠️ Supabase URL not configured');
      return false;
    }

    try {
      const session = await getActiveSession();

      if (!session) {
        console.log('⚠️ No active session');
        return false;
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        console.log('⚠️ Supabase anon key not configured');
        return false;
      }

      const response = await fetch(`${this.baseUrl}/google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          action: 'isConnected',
          userId
        })
      });

      if (!response.ok) {
        console.log('⚠️ Could not check Google Calendar connection status');
        return false;
      }

      const data = await response.json();
      const connected = data.connected || false;

      console.log(`🔍 Google Calendar connection status for user ${userId}:`, connected ? '✅ Connected' : '⭕ Not connected');
      return connected;
    } catch (error) {
      console.log('⚠️ Error checking Google Calendar connection:', error);
      return false;
    }
  }

  async disconnect(userId: string): Promise<boolean> {
    if (!this.baseUrl) {
      console.log('⚠️ Supabase URL not configured');
      return false;
    }

    try {
      const session = await getActiveSession();

      if (!session) {
        console.log('⚠️ No active session');
        return false;
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        console.log('⚠️ Supabase anon key not configured');
        return false;
      }

      const response = await fetch(`${this.baseUrl}/google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          action: 'disconnect',
          userId
        })
      });

      if (!response.ok) {
        console.error('❌ Failed to disconnect Google Calendar');
        return false;
      }

      this.signedIn = false;
      console.log('✅ Google Calendar disconnected successfully');
      return true;
    } catch (error) {
      console.error('❌ Error disconnecting Google Calendar:', error);
      return false;
    }
  }

  async signIn(): Promise<void> {
    throw new Error('Use ConnectGoogleCalendarButton component for Google OAuth sign-in');
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async makeApiCall(action: string, params: any = {}): Promise<any> {
    await this.ensureInitialized();

    if (!this.available) {
      throw new Error(
        'Google Calendar service not available. ' +
        'Possible causes: (1) Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) not configured in Supabase Edge Functions Secrets, ' +
        '(2) Edge Functions not deployed or not responding, ' +
        '(3) Network connectivity issues. ' +
        `Run diagnostics: ${this.baseUrl}/google-diagnostics`
      );
    }

    if (!this.baseUrl) {
      throw new Error('Supabase URL not configured');
    }

    try {
      const session = await getActiveSession();

      if (!session || !session.user) {
        throw new Error('User not authenticated. Please sign in first.');
      }

      const user = session.user;

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        throw new Error('Supabase anon key not configured');
      }

      console.log(`📡 Making API call: ${action} for user ${user.id}`);

      const response = await fetch(`${this.baseUrl}/google-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': anonKey
        },
        body: JSON.stringify({
          action,
          userId: user.id,
          ...params
        })
      });

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        } else {
          const errorText = await response.text();
          errorData = { error: `Server error: ${errorText || response.statusText}` };
        }

        const errorMessage = errorData.error || errorData.message || errorData.details || `API call failed with status ${response.status}`;
        console.error(`❌ API call failed (${action}):`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log(`✅ API call succeeded (${action})`);
      return result;
    } catch (error) {
      console.error(`❌ Google Calendar API call failed (${action}):`, error);
      throw error;
    }
  }

  async listUpcoming(maxResults: number = 10): Promise<GoogleCalendarEvent[]> {
    try {
      const data = await this.makeApiCall('listUpcoming', { maxResults });
      return data.items || [];
    } catch (error) {
      console.error('❌ Failed to list upcoming events:', error);
      throw error;
    }
  }

  async getEvents(options: CalendarListOptions = {}): Promise<GoogleCalendarEvent[]> {
    try {
      const data = await this.makeApiCall('getEvents', options);
      return data.items || [];
    } catch (error) {
      console.error('❌ Failed to get events:', error);
      throw error;
    }
  }

  async insertEvent(event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    try {
      const createdEvent = await this.makeApiCall('insertEvent', { event });
      return createdEvent;
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    try {
      const updatedEvent = await this.makeApiCall('updateEvent', { eventId, event });
    return updatedEvent;
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Upsert helper used by the orchestrator when restoring remote from local.
   * Decides to insert or update based on whether the payload has an id.
   */
  async upsertEvent(userId: string, localEvent: Event): Promise<GoogleCalendarEvent> {
    // Build Google payload on the client to keep the Edge Function simple
    const payload = mapLocalToGoogle(localEvent);
    const hasId = Boolean((payload as any).id);

    const result = await this.makeApiCall(
      hasId ? 'updateEvent' : 'insertEvent',
      hasId
        ? { eventId: (payload as any).id, event: payload }
        : { event: payload }
    );

    // Edge Function returns the event directly in current implementation
    return result as GoogleCalendarEvent;
  }

  // Overloads so callers can use deleteEvent(eventId) or deleteEvent(userId, eventId)
  async deleteEvent(eventId: string): Promise<void>;
  async deleteEvent(userId: string, eventId: string): Promise<void>;
  async deleteEvent(a: string, b?: string): Promise<void> {
    const eventId = b ?? a; // if two args, second is eventId; if one arg, it's the eventId
    try {
      await this.makeApiCall('deleteEvent', { eventId });
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
