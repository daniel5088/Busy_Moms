import { supabase } from '../lib/supabase';

export interface LifeReceipt {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  where: string;
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
    where?: string,
    who?: string,
    when?: string,
    obligation?: string
  ): Promise<LifeReceipt> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('life_receipts')
      .insert({
        user_id: user.id,
        content,
        where: where || 'unknown',
        who: who || 'unknown',
        when_bucket: when || 'someday',
        obligation: obligation || 'unknown',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async listReceipts(): Promise<LifeReceipt[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    updates: Partial<
      Pick<LifeReceipt, 'content' | 'where' | 'who' | 'when_bucket' | 'obligation' | 'status'>
    >
  ): Promise<LifeReceipt> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('life_receipts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  async getReceipt(id: string): Promise<LifeReceipt> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('life_receipts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  },
};
