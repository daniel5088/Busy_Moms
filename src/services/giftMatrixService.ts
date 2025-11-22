import { supabase, GiftMatrixItem, GiftSearchCriteria, UserGiftSearch, UUID, GiftCategory } from '../lib/supabase';

class GiftMatrixService {
  /**
   * Search gifts based on criteria
   */
  async searchGifts(criteria: GiftSearchCriteria): Promise<GiftMatrixItem[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { age, gender, budgetMin, budgetMax, category, tags } = criteria;

    let query = supabase
      .from('gift_matrix')
      .select('*')
      .eq('active', true)
      .lte('min_age', age)
      .gte('max_age', age)
      .gte('typical_price', budgetMin)
      .lte('typical_price', budgetMax);

    // Gender matching: if "Other", include Unisex; otherwise match exactly or Unisex
    if (gender === 'Other') {
      query = query.eq('gender', 'Unisex');
    } else {
      query = query.or(`gender.eq.${gender},gender.eq.Unisex`);
    }

    // Category filter
    if (category) {
      query = query.eq('category', category);
    }

    // Tags filter (if any tag matches)
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    // Order by popularity and rating
    query = query.order('popularity_score', { ascending: false })
                 .order('rating', { ascending: false, nullsFirst: false })
                 .order('typical_price', { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error('Error searching gifts:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<GiftCategory[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('gift_matrix')
      .select('category')
      .eq('active', true);

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    // Get unique categories
    const uniqueCategories = [...new Set(data.map(item => item.category as GiftCategory))];
    return uniqueCategories;
  }

  /**
   * Get popular gifts
   */
  async getPopularGifts(limit: number = 10): Promise<GiftMatrixItem[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('gift_matrix')
      .select('*')
      .eq('active', true)
      .order('popularity_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching popular gifts:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Track affiliate click and return URL
   */
  async trackAffiliateClick(giftId: UUID): Promise<string> {
    if (!supabase) throw new Error('Supabase not initialized');

    try {
      // First get the current gift data
      const { data: gift, error: fetchError } = await supabase
        .from('gift_matrix')
        .select('affiliate_url, click_count')
        .eq('id', giftId)
        .single();

      if (fetchError) throw fetchError;
      if (!gift) throw new Error('Gift not found');

      // Update click count and last clicked time
      const { error: updateError } = await supabase
        .from('gift_matrix')
        .update({
          click_count: (gift.click_count || 0) + 1,
          last_clicked_at: new Date().toISOString()
        })
        .eq('id', giftId);

      if (updateError) {
        console.error('Error updating click count:', updateError);
        // Don't throw - still return the URL
      }

      return gift.affiliate_url;
    } catch (error) {
      console.error('Error tracking affiliate click:', error);
      throw error;
    }
  }

  /**
   * Get affiliate URL without tracking
   */
  async getAffiliateUrl(giftId: UUID): Promise<string> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('gift_matrix')
      .select('affiliate_url')
      .eq('id', giftId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Gift not found');

    return data.affiliate_url;
  }

  /**
   * Get gift by ID
   */
  async getGiftById(giftId: UUID): Promise<GiftMatrixItem | null> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('gift_matrix')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error) {
      console.error('Error fetching gift:', error);
      return null;
    }

    return data;
  }

  /**
   * Save user gift search
   */
  async saveUserSearch(
    userId: UUID,
    searchData: {
      recipient_name: string;
      recipient_age: number;
      recipient_gender: 'Boy' | 'Girl' | 'Other';
      budget_min: number;
      budget_max: number;
      event_id?: UUID;
      family_member_id?: UUID;
      matching_gift_ids: UUID[];
    }
  ): Promise<UserGiftSearch> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('user_gift_searches')
      .insert({
        user_id: userId,
        ...searchData,
        result_count: searchData.matching_gift_ids.length
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving gift search:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get user's search history
   */
  async getUserSearchHistory(userId: UUID, limit: number = 10): Promise<UserGiftSearch[]> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase
      .from('user_gift_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching search history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Delete user search
   */
  async deleteUserSearch(searchId: UUID): Promise<void> {
    if (!supabase) throw new Error('Supabase not initialized');

    const { error } = await supabase
      .from('user_gift_searches')
      .delete()
      .eq('id', searchId);

    if (error) {
      console.error('Error deleting search:', error);
      throw error;
    }
  }

  /**
   * Get gifts by IDs
   */
  async getGiftsByIds(giftIds: UUID[]): Promise<GiftMatrixItem[]> {
    if (!supabase) throw new Error('Supabase not initialized');
    if (giftIds.length === 0) return [];

    const { data, error } = await supabase
      .from('gift_matrix')
      .select('*')
      .in('id', giftIds)
      .eq('active', true);

    if (error) {
      console.error('Error fetching gifts by IDs:', error);
      throw error;
    }

    return data || [];
  }
}

export const giftMatrixService = new GiftMatrixService();
