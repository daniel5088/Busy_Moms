import { supabase } from '../lib/supabase';

export interface QuickActionType {
  id: string;
  name: string;
  description: string;
  icon: string;
  default_enabled: boolean;
  sort_order: number;
  gradient_from: string;
  gradient_to: string;
  created_at: string;
}

export interface UserQuickAction {
  id: string;
  user_id: string;
  action_type_id: string;
  position: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  action_type?: QuickActionType;
}

export const quickActionsService = {
  async getActionTypes(): Promise<QuickActionType[]> {
    const { data, error } = await supabase
      .from('quick_action_types')
      .select('*')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  },

  async getUserQuickActions(): Promise<UserQuickAction[]> {
    const { data, error } = await supabase
      .from('user_quick_actions')
      .select(`
        *,
        action_type:quick_action_types(*)
      `)
      .eq('enabled', true)
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async getAllUserQuickActions(): Promise<UserQuickAction[]> {
    const { data, error } = await supabase
      .from('user_quick_actions')
      .select(`
        *,
        action_type:quick_action_types(*)
      `)
      .order('position');

    if (error) throw error;
    return data || [];
  },

  async initializeQuickActions(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('initialize_user_quick_actions', {
      p_user_id: user.id
    });

    if (error) throw error;
  },

  async updateQuickActionPosition(
    actionId: string,
    newPosition: number
  ): Promise<void> {
    const { error } = await supabase
      .from('user_quick_actions')
      .update({ position: newPosition })
      .eq('id', actionId);

    if (error) throw error;
  },

  async updateMultiplePositions(
    updates: { id: string; position: number }[]
  ): Promise<void> {
    // To avoid UNIQUE constraint violations, we need to update positions in two phases:
    // 1. Set all positions to temporary values (1000+)
    // 2. Set them to final values

    // Phase 1: Set temporary positions
    const tempUpdates = updates.map(({ id }, index) =>
      supabase
        .from('user_quick_actions')
        .update({ position: 1000 + index })
        .eq('id', id)
    );

    const tempResults = await Promise.all(tempUpdates);
    const tempErrors = tempResults.filter(r => r.error);
    if (tempErrors.length > 0) {
      throw tempErrors[0].error;
    }

    // Phase 2: Set final positions
    const finalUpdates = updates.map(({ id, position }) =>
      supabase
        .from('user_quick_actions')
        .update({ position })
        .eq('id', id)
    );

    const finalResults = await Promise.all(finalUpdates);
    const finalErrors = finalResults.filter(r => r.error);
    if (finalErrors.length > 0) {
      throw finalErrors[0].error;
    }
  },

  async toggleQuickAction(actionId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('user_quick_actions')
      .update({ enabled })
      .eq('id', actionId);

    if (error) throw error;
  },

  async addQuickAction(
    actionTypeId: string,
    position: number
  ): Promise<UserQuickAction> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if action already exists (even if disabled)
    const { data: existing } = await supabase
      .from('user_quick_actions')
      .select(`
        *,
        action_type:quick_action_types(*)
      `)
      .eq('user_id', user.id)
      .eq('action_type_id', actionTypeId)
      .maybeSingle();

    // If exists, re-enable and update position
    if (existing) {
      const { data, error } = await supabase
        .from('user_quick_actions')
        .update({
          position,
          enabled: true
        })
        .eq('id', existing.id)
        .select(`
          *,
          action_type:quick_action_types(*)
        `)
        .single();

      if (error) throw error;
      return data;
    }

    // Otherwise, insert new
    const { data, error } = await supabase
      .from('user_quick_actions')
      .insert({
        user_id: user.id,
        action_type_id: actionTypeId,
        position,
        enabled: true
      })
      .select(`
        *,
        action_type:quick_action_types(*)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  async removeQuickAction(actionId: string): Promise<void> {
    const { error } = await supabase
      .from('user_quick_actions')
      .delete()
      .eq('id', actionId);

    if (error) throw error;
  },

  async resetToDefaults(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await supabase
      .from('user_quick_actions')
      .delete()
      .eq('user_id', user.id);

    await this.initializeQuickActions();
  }
};
