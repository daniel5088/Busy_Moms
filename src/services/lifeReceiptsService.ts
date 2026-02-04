import { supabase } from '../lib/supabase';

export interface LifeReceipt {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  what: string;
  who: string;
  obligation: string;
  when_bucket: string;
  status: string;
  ai_confidence?: number | null;
  ai_version?: string | null;
}

export const lifeReceiptsService = {
  async createReceipt(
    content: string,
    what?: string,
    who?: string,
    when?: string,
    obligation?: string
  ): Promise<LifeReceipt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('life_receipts')
      .insert({
        user_id: user.id,
        content,
        what: what || 'unknown',
        who: who || 'unknown',
        when_bucket: when || 'unknown',
        obligation: obligation || 'unknown',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async listReceipts(): Promise<LifeReceipt[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('life_receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async clearAllReceipts(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('life_receipts')
      .delete()
      .eq('user_id', user.id)
      .select();

    if (error) throw error;
    return data?.length || 0;
  },

  async updateReceipt(
    id: string,
    updates: Partial<Pick<LifeReceipt, 'content' | 'what' | 'who' | 'when_bucket' | 'obligation'>>
  ): Promise<LifeReceipt> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('life_receipts')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReceipt(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('life_receipts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },
};
