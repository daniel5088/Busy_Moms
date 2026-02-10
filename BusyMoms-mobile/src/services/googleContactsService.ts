/**
 * Google Contacts Service
 * Handles synchronization with Google Contacts via Edge Function
 * Adapted from web app for React Native
 */

import { supabase } from '../lib/supabase';
import type { Contact } from '../types/database';

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
  /**
   * Call Google Contacts edge function
   */
  private async callGoogleContactsEdgeFunction(action: string, data: Record<string, unknown> = {}) {
    try {
      const { data: result, error } = await supabase.functions.invoke('google-contacts', {
        body: { action, ...data },
      });

      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Error calling Google Contacts edge function (${action}):`, error);
      throw error;
    }
  }

  /**
   * Check if Google Contacts is connected/available
   */
  async isConnected(): Promise<boolean> {
    try {
      const result = await this.callGoogleContactsEdgeFunction('checkConnection');
      return result?.connected || false;
    } catch (error) {
      console.error('Error checking Google Contacts connection:', error);
      return false;
    }
  }

  /**
   * List all Google Contacts
   */
  async listContacts(options?: {
    pageSize?: number;
    pageToken?: string;
  }): Promise<ContactsListResponse> {
    try {
      const result = await this.callGoogleContactsEdgeFunction('listContacts', {
        pageSize: options?.pageSize || 100,
        pageToken: options?.pageToken,
      });

      return result as ContactsListResponse;
    } catch (error) {
      console.error('Error listing Google Contacts:', error);
      return { connections: [] };
    }
  }

  /**
   * Convert Google Contact to local contact format
   */
  googleContactToLocal(googleContact: GoogleContact, userId: string): Partial<Contact> {
    const name =
      googleContact.names?.[0]?.displayName ||
      `${googleContact.names?.[0]?.givenName || ''} ${googleContact.names?.[0]?.familyName || ''}`.trim() ||
      'Unknown';

    const email = googleContact.emailAddresses?.[0]?.value || null;
    const phone = googleContact.phoneNumbers?.[0]?.value || null;

    return {
      user_id: userId,
      name,
      role: '', // Will need to be set manually or categorized
      phone,
      email,
      category: 'other', // Default category
      google_resource_name: googleContact.resourceName,
      google_etag: googleContact.etag,
      sync_status: 'synced',
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Sync contacts from Google to local database
   */
  async syncContactsFromGoogle(
    userId: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ imported: number; updated: number; errors: number }> {
    try {
      let pageToken: string | undefined;
      let imported = 0;
      let updated = 0;
      let errors = 0;
      let processedCount = 0;
      let totalCount = 0;

      do {
        const response = await this.listContacts({ pageToken });

        if (!response.connections || response.connections.length === 0) {
          break;
        }

        if (totalCount === 0 && response.totalPeople) {
          totalCount = response.totalPeople;
        }

        for (const googleContact of response.connections) {
          try {
            processedCount++;
            if (onProgress) {
              onProgress(processedCount, totalCount || processedCount);
            }

            // Check if contact already exists
            const { data: existingContact } = await supabase
              .from('contacts')
              .select('id')
              .eq('user_id', userId)
              .eq('google_resource_name', googleContact.resourceName)
              .maybeSingle();

            const contactData = this.googleContactToLocal(googleContact, userId);

            if (existingContact) {
              // Update existing contact
              await supabase
                .from('contacts')
                .update({
                  ...contactData,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingContact.id);
              updated++;
            } else {
              // Insert new contact
              await supabase.from('contacts').insert([contactData]);
              imported++;
            }
          } catch (error) {
            console.error('Error syncing contact:', error);
            errors++;
          }
        }

        pageToken = response.nextPageToken;
      } while (pageToken);

      return { imported, updated, errors };
    } catch (error) {
      console.error('Error syncing contacts from Google:', error);
      throw error;
    }
  }

  /**
   * Create a contact in Google Contacts
   */
  async createGoogleContact(contact: Contact): Promise<GoogleContact | null> {
    try {
      const googleContact = {
        names: [
          {
            displayName: contact.name,
          },
        ],
        phoneNumbers: contact.phone
          ? [
              {
                value: contact.phone,
              },
            ]
          : undefined,
        emailAddresses: contact.email
          ? [
              {
                value: contact.email,
              },
            ]
          : undefined,
      };

      const result = await this.callGoogleContactsEdgeFunction('createContact', {
        contact: googleContact,
      });

      return result as GoogleContact;
    } catch (error) {
      console.error('Error creating Google contact:', error);
      return null;
    }
  }

  /**
   * Update a contact in Google Contacts
   */
  async updateGoogleContact(
    resourceName: string,
    contact: Partial<Contact>
  ): Promise<GoogleContact | null> {
    try {
      const googleContact: Partial<GoogleContact> = {};

      if (contact.name) {
        googleContact.names = [{ displayName: contact.name }];
      }

      if (contact.phone) {
        googleContact.phoneNumbers = [{ value: contact.phone }];
      }

      if (contact.email) {
        googleContact.emailAddresses = [{ value: contact.email }];
      }

      const result = await this.callGoogleContactsEdgeFunction('updateContact', {
        resourceName,
        contact: googleContact,
      });

      return result as GoogleContact;
    } catch (error) {
      console.error('Error updating Google contact:', error);
      return null;
    }
  }

  /**
   * Delete a contact from Google Contacts
   */
  async deleteGoogleContact(resourceName: string): Promise<boolean> {
    try {
      await this.callGoogleContactsEdgeFunction('deleteContact', {
        resourceName,
      });
      return true;
    } catch (error) {
      console.error('Error deleting Google contact:', error);
      return false;
    }
  }

  /**
   * Sync a single local contact to Google
   */
  async syncContactToGoogle(contact: Contact): Promise<boolean> {
    try {
      if (contact.google_resource_name) {
        // Update existing Google contact
        const result = await this.updateGoogleContact(contact.google_resource_name, contact);
        if (result) {
          // Update local contact with new etag
          await supabase
            .from('contacts')
            .update({
              google_etag: result.etag,
              sync_status: 'synced',
              synced_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
          return true;
        }
      } else {
        // Create new Google contact
        const result = await this.createGoogleContact(contact);
        if (result) {
          // Update local contact with Google resource name
          await supabase
            .from('contacts')
            .update({
              google_resource_name: result.resourceName,
              google_etag: result.etag,
              sync_status: 'synced',
              synced_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error syncing contact to Google:', error);
      return false;
    }
  }
}

export const googleContactsService = new GoogleContactsService();
