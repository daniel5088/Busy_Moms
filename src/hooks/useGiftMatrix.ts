import { useState, useEffect } from 'react';
import { GiftMatrixItem, GiftSearchCriteria, UserGiftSearch, UUID, GiftCategory } from '../lib/supabase';
import { giftMatrixService } from '../services/giftMatrixService';

export function useGiftMatrix() {
  const [gifts, setGifts] = useState<GiftMatrixItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<UserGiftSearch[]>([]);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Search gifts based on criteria
   */
  const searchGifts = async (criteria: GiftSearchCriteria): Promise<GiftMatrixItem[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await giftMatrixService.searchGifts(criteria);
      setGifts(results);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search gifts';
      setError(errorMessage);
      console.error('Error searching gifts:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load search history for a user
   */
  const loadSearchHistory = async (userId: UUID, limit?: number): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const history = await giftMatrixService.getUserSearchHistory(userId, limit);
      setSearchHistory(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load search history';
      setError(errorMessage);
      console.error('Error loading search history:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save a gift search
   */
  const saveSearch = async (
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
  ): Promise<UserGiftSearch | null> => {
    setError(null);

    try {
      const savedSearch = await giftMatrixService.saveUserSearch(userId, searchData);

      // Add to local state
      setSearchHistory(prev => [savedSearch, ...prev]);

      return savedSearch;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save search';
      setError(errorMessage);
      console.error('Error saving search:', err);
      return null;
    }
  };

  /**
   * Delete a search from history
   */
  const deleteSearch = async (searchId: UUID): Promise<boolean> => {
    setError(null);

    try {
      await giftMatrixService.deleteUserSearch(searchId);

      // Remove from local state
      setSearchHistory(prev => prev.filter(search => search.id !== searchId));

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete search';
      setError(errorMessage);
      console.error('Error deleting search:', err);
      return false;
    }
  };

  /**
   * Load available categories
   */
  const loadCategories = async (): Promise<void> => {
    setError(null);

    try {
      const cats = await giftMatrixService.getCategories();
      setCategories(cats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories';
      setError(errorMessage);
      console.error('Error loading categories:', err);
    }
  };

  /**
   * Track affiliate click and open URL
   */
  const handleAffiliateClick = async (gift: GiftMatrixItem): Promise<void> => {
    try {
      const affiliateUrl = await giftMatrixService.trackAffiliateClick(gift.id);

      // Open in new tab
      const newWindow = window.open(affiliateUrl, '_blank', 'noopener,noreferrer');

      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Popup blocked - offer alternative
        if (confirm('Popup blocked! Click OK to open in this tab.')) {
          window.location.href = affiliateUrl;
        }
      }
    } catch (err) {
      console.error('Error tracking affiliate click:', err);
      // Still try to open the link
      window.open(gift.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * Get gifts by IDs (for viewing saved searches)
   */
  const getGiftsByIds = async (giftIds: UUID[]): Promise<GiftMatrixItem[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await giftMatrixService.getGiftsByIds(giftIds);
      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load gifts';
      setError(errorMessage);
      console.error('Error loading gifts by IDs:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    gifts,
    searchHistory,
    categories,
    loading,
    error,
    searchGifts,
    loadSearchHistory,
    saveSearch,
    deleteSearch,
    loadCategories,
    handleAffiliateClick,
    getGiftsByIds
  };
}
