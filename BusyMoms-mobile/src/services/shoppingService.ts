import { supabase } from '../lib/supabase';
import type { ShoppingItem } from '../types/database';
import { logger } from '../utils/logger';

export interface ShoppingFilter {
  category?: string;
  completed?: boolean;
  assigned_to?: string;
  urgent?: boolean;
}

/**
 * Get shopping items for a user with optional filtering
 */
export async function getShoppingItems(
  userId: string,
  filter?: ShoppingFilter
): Promise<ShoppingItem[]> {
  try {
    let query = supabase
      .from('shopping_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    if (filter?.completed !== undefined) {
      query = query.eq('completed', filter.completed);
    }

    if (filter?.urgent !== undefined) {
      query = query.eq('urgent', filter.urgent);
    }

    if (filter?.assigned_to) {
      query = query.eq('assigned_to_email', filter.assigned_to);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching shopping items:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('❌ Shopping items fetch error:', error);
    return [];
  }
}

/**
 * Create a new shopping item
 */
export async function createShoppingItem(
  userId: string,
  item: Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<ShoppingItem | null> {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .insert([
        {
          user_id: userId,
          ...item,
          completed: false,
          purchase_status: 'not_sent',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating shopping item:', error);
      throw error;
    }

    logger.debug('✅ Shopping item created successfully');
    return data;
  } catch (error) {
    logger.error('❌ Shopping item create error:', error);
    return null;
  }
}

/**
 * Update a shopping item
 */
export async function updateShoppingItem(
  itemId: string,
  updates: Partial<Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ShoppingItem | null> {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating shopping item:', error);
      throw error;
    }

    logger.debug('✅ Shopping item updated successfully');
    return data;
  } catch (error) {
    logger.error('❌ Shopping item update error:', error);
    return null;
  }
}

/**
 * Delete a shopping item
 */
export async function deleteShoppingItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('shopping_lists').delete().eq('id', itemId);

    if (error) {
      console.error('❌ Error deleting shopping item:', error);
      throw error;
    }

    logger.debug('✅ Shopping item deleted successfully');
    return true;
  } catch (error) {
    logger.error('❌ Shopping item delete error:', error);
    return false;
  }
}

/**
 * Toggle completed status of a shopping item
 */
export async function toggleItemCompleted(
  itemId: string,
  completed: boolean
): Promise<ShoppingItem | null> {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update({ completed })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error toggling item completion:', error);
      throw error;
    }

    logger.debug(`✅ Shopping item marked as ${completed ? 'completed' : 'pending'}`);
    return data;
  } catch (error) {
    logger.error('❌ Toggle item completed error:', error);
    return null;
  }
}

/**
 * Bulk update multiple shopping items
 */
export async function bulkUpdateItems(
  itemIds: string[],
  updates: Partial<Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ShoppingItem[]> {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .update(updates)
      .in('id', itemIds)
      .select();

    if (error) {
      console.error('❌ Error bulk updating shopping items:', error);
      throw error;
    }

    logger.debug(`✅ ${data.length} shopping items updated successfully`);
    return data || [];
  } catch (error) {
    logger.error('❌ Bulk update items error:', error);
    return [];
  }
}

/**
 * Get distinct categories from user's shopping items
 */
export async function getCategories(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('shopping_lists')
      .select('category')
      .eq('user_id', userId)
      .not('category', 'is', null);

    if (error) {
      console.error('❌ Error fetching categories:', error);
      throw error;
    }

    // Extract unique categories
    const categories = Array.from(new Set(data.map((item) => item.category).filter(Boolean)));
    return categories as string[];
  } catch (error) {
    logger.error('❌ Get categories error:', error);
    return [];
  }
}

/**
 * Bulk delete shopping items
 */
export async function bulkDeleteItems(itemIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.from('shopping_lists').delete().in('id', itemIds);

    if (error) {
      console.error('❌ Error bulk deleting shopping items:', error);
      throw error;
    }

    logger.debug(`✅ ${itemIds.length} shopping items deleted successfully`);
    return true;
  } catch (error) {
    logger.error('❌ Bulk delete items error:', error);
    return false;
  }
}
