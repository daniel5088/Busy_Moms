import { supabase } from '../lib/supabase';
import type { FamilyMember } from '../types/database';

export interface CreateFamilyMemberInput {
  name: string;
  Email: string;
  age?: number;
  birthday?: string;
  birthday_estimated?: boolean;
  gender?: 'Boy' | 'Girl' | 'Other';
  relationship?: string;
  avatar_url?: string;
  allergies?: string[];
  medical_notes?: string;
  school?: string;
  grade?: string;
}

export interface UpdateFamilyMemberInput extends Partial<CreateFamilyMemberInput> {}

class FamilyService {
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as FamilyMember[];
    } catch (error) {
      console.error('Error fetching family members:', error);
      throw error;
    }
  }

  async getFamilyMemberById(memberId: string, userId: string): Promise<FamilyMember | null> {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('id', memberId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data as FamilyMember | null;
    } catch (error) {
      console.error('Error fetching family member:', error);
      throw error;
    }
  }

  async createFamilyMember(userId: string, input: CreateFamilyMemberInput): Promise<FamilyMember> {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert([{ user_id: userId, ...input }])
        .select()
        .single();
      if (error) throw error;
      return data as FamilyMember;
    } catch (error) {
      console.error('Error creating family member:', error);
      throw error;
    }
  }

  async updateFamilyMember(memberId: string, userId: string, updates: UpdateFamilyMemberInput): Promise<FamilyMember> {
    try {
      const { data, error } = await supabase
        .from('family_members')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as FamilyMember;
    } catch (error) {
      console.error('Error updating family member:', error);
      throw error;
    }
  }

  async deleteFamilyMember(memberId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId)
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting family member:', error);
      throw error;
    }
  }
}

export const familyService = new FamilyService();
