import { supabase } from '../lib/supabase';
import { getActiveSession } from '../lib/sessionHelper';

export interface GoogleContact {
  resourceName?: string;
  etag?: string;
  metadata?: {
    sources?: Array<{
      type: string;
      id: string;
      etag?: string;
      updateTime?: string;
    }>;
  };
  names?: Array<{
    displayName?: string;
    familyName?: string;
    givenName?: string;
    displayNameLastFirst?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
    formattedType?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
    formattedType?: string;
  }>;
  photos?: Array<{
    url: string;
    default?: boolean;
  }>;
}

export interface ContactsListResponse {
  connections?: GoogleContact[];
  nextPageToken?: string;
  nextSyncToken?: string;
  totalPeople?: number;
  totalItems?: number;
}

class GoogleContactsService {
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
        console.log('ℹ️ No active session - Google Contacts service unavailable until sign in');
        this.available = false;
        this.ready = false;
        this.signedIn = false;
        this.initialized = true;
        return;
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        console.error('❌ VITE_SUPABASE_ANON_KEY not configured');
        this.available = false;
        this.ready = false;
        this.signedIn = false;
        this.initialized = true;
        return;
      }

      const response = await fetch(`${this.baseUrl}/google-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action: 'isConnected',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.signedIn = data.connected || false;
        this.available = true;
        this.ready = true;
        console.log(`✅ Google Contacts service initialized. Connected: ${this.signedIn}`);
      } else {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        console.error(`❌ Google Contacts Edge Function error: ${errorMessage}`);
        this.available = false;
        this.ready = false;
        this.signedIn = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Contacts service:', error);
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

  async isConnected(): Promise<boolean> {
    try {
      const data = await this.makeApiCall('isConnected');
      return data?.connected === true;
    } catch (error) {
      console.error('Error checking Google Contacts connection:', error);
      return false;
    }
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
        'Google Contacts service not available. Please ensure Google OAuth is configured and you are signed in.'
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

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!anonKey) {
        throw new Error('Supabase anon key not configured');
      }

      console.log(`📡 Making API call: ${action}`);

      const response = await fetch(`${this.baseUrl}/google-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
        },
        body: JSON.stringify({
          action,
          ...params,
        }),
      });

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          errorData = await response
            .json()
            .catch(() => ({ error: 'Failed to parse error response' }));
        } else {
          const errorText = await response.text();
          errorData = { error: `Server error: ${errorText || response.statusText}` };
        }

        const errorMessage =
          errorData.details ||
          errorData.error ||
          errorData.message ||
          `API call failed with status ${response.status}`;

        const errorCode = errorData.code || 'UNKNOWN_ERROR';

        console.error(`❌ API call failed (${action}):`, {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          errorMessage,
          errorCode,
        });

        const error = new Error(errorMessage);
        throw error;
      }

      const result = await response.json();
      console.log(`✅ API call succeeded (${action})`);
      return result;
    } catch (error) {
      console.error(`❌ Google Contacts API call failed (${action}):`, error);
      throw error;
    }
  }

  async listContacts(params?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<ContactsListResponse> {
    try {
      const data = await this.makeApiCall('listContacts', {
        pageSize: params?.pageSize || 1000,
        pageToken: params?.pageToken,
      });
      return data;
    } catch (error) {
      console.error('❌ Failed to list contacts:', error);
      throw error;
    }
  }

  async getContact(resourceName: string): Promise<GoogleContact> {
    try {
      const contact = await this.makeApiCall('getContact', { resourceName });
      return contact;
    } catch (error) {
      console.error('❌ Failed to get contact:', error);
      throw error;
    }
  }

  async createContact(contact: Partial<GoogleContact>): Promise<GoogleContact> {
    try {
      console.log('📤 Creating contact in Google Contacts');
      const createdContact = await this.makeApiCall('createContact', { contact });
      console.log('✅ Contact created successfully');
      return createdContact;
    } catch (error: any) {
      console.error('❌ Failed to create contact:', {
        error: error?.message || String(error),
      });
      throw error;
    }
  }

  async updateContact(
    resourceName: string,
    contact: Partial<GoogleContact>,
    updatePersonFields?: string
  ): Promise<GoogleContact> {
    try {
      const updatedContact = await this.makeApiCall('updateContact', {
        resourceName,
        contact,
        updatePersonFields,
      });
      return updatedContact;
    } catch (error) {
      console.error('❌ Failed to update contact:', error);
      throw error;
    }
  }

  async deleteContact(resourceName: string): Promise<void> {
    try {
      await this.makeApiCall('deleteContact', { resourceName });
    } catch (error) {
      console.error('❌ Failed to delete contact:', error);
      throw error;
    }
  }
}

export const googleContactsService = new GoogleContactsService();
