/**
 * Contact Service
 * Handles CRUD operations for contacts in the local Supabase database
 */

import { supabase } from '../lib/supabase';
import type { Contact } from '../types/database';

export interface ContactFilters {
  category?: string;
  search?: string;
}

export interface CreateContactInput {
  name: string;
  role: string;
  phone?: string;
  email?: string;
  category?: string;
  rating?: number;
  notes?: string;
  verified?: boolean;
  background_check_date?: string;
  background_check_status?: string;
  available?: boolean;
  last_contact?: string;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {}

class ContactService {
  /**
   * Get contacts for the current user with optional filters
   */
  async getContacts(userId: string, filters?: ContactFilters): Promise<Contact[]> {
    try {
      let query = supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,role.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Contact[];
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(contactId: string, userId: string): Promise<Contact | null> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data as Contact | null;
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   */
  async createContact(userId: string, input: CreateContactInput): Promise<Contact> {
    try {
      const contactData = {
        user_id: userId,
        name: input.name,
        role: input.role,
        phone: input.phone || null,
        email: input.email || null,
        category: input.category || 'other',
        rating: input.rating || null,
        notes: input.notes || null,
        verified: input.verified || false,
        background_check_date: input.background_check_date || null,
        background_check_status: input.background_check_status || null,
        available: input.available !== undefined ? input.available : true,
        last_contact: input.last_contact || null,
        sync_status: 'local_only' as const,
      };

      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;

      return data as Contact;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    contactId: string,
    userId: string,
    updates: UpdateContactInput
  ): Promise<Contact> {
    try {
      const updateData: Partial<Contact> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return data as Contact;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Get all contact categories
   */
  async getContactCategories(userId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('category')
        .eq('user_id', userId)
        .not('category', 'is', null);

      if (error) throw error;

      // Get unique categories
      const categories = Array.from(
        new Set((data || []).map((item) => item.category).filter(Boolean))
      );

      return categories as string[];
    } catch (error) {
      console.error('Error fetching contact categories:', error);
      return [];
    }
  }

  /**
   * Get contacts grouped by category
   */
  async getContactsByCategory(userId: string): Promise<Record<string, Contact[]>> {
    try {
      const contacts = await this.getContacts(userId);

      const grouped: Record<string, Contact[]> = {};
      contacts.forEach((contact) => {
        const category = contact.category || 'other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(contact);
      });

      return grouped;
    } catch (error) {
      console.error('Error grouping contacts by category:', error);
      return {};
    }
  }

  /**
   * Search contacts by name, role, phone, or email
   */
  async searchContacts(userId: string, searchTerm: string): Promise<Contact[]> {
    return this.getContacts(userId, { search: searchTerm });
  }

  /**
   * Categorize a contact based on role and name
   */
  categorizeContact(name: string, role: string, notes: string = ''): string {
    const lowerName = name.toLowerCase();
    const lowerRole = role.toLowerCase();
    const lowerNotes = notes.toLowerCase();
    const combined = `${lowerName} ${lowerRole} ${lowerNotes}`;

    // Healthcare
    if (
      combined.includes('doctor') ||
      combined.includes('dentist') ||
      combined.includes('pediatrician') ||
      combined.includes('therapist') ||
      combined.includes('nurse') ||
      combined.includes('physician') ||
      combined.includes('medical')
    ) {
      return 'healthcare';
    }

    // Education
    if (
      combined.includes('teacher') ||
      combined.includes('tutor') ||
      combined.includes('principal') ||
      combined.includes('coach') ||
      combined.includes('instructor') ||
      combined.includes('school')
    ) {
      return 'education';
    }

    // Childcare
    if (
      combined.includes('babysitter') ||
      combined.includes('nanny') ||
      combined.includes('daycare') ||
      combined.includes('sitter')
    ) {
      return 'childcare';
    }

    // Service Providers
    if (
      combined.includes('plumber') ||
      combined.includes('electrician') ||
      combined.includes('contractor') ||
      combined.includes('cleaner') ||
      combined.includes('maid') ||
      combined.includes('repair')
    ) {
      return 'service';
    }

    // Emergency
    if (
      combined.includes('emergency') ||
      combined.includes('police') ||
      combined.includes('fire') ||
      combined.includes('ambulance')
    ) {
      return 'emergency';
    }

    return 'other';
  }
}

export const contactService = new ContactService();
