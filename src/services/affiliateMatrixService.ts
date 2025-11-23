import { requireSupabase } from '../lib/supabase';
import type { AffiliateMatrixItem, AffiliateMatrixLookup, AffiliateSearchCriteria } from '../lib/supabase';

class AffiliateMatrixService {
  private lookupCache: AffiliateMatrixLookup | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  /**
   * Fetch all unique dropdown values from affiliate_matrix
   * Caches results for performance
   */
  async getLookupValues(): Promise<AffiliateMatrixLookup> {
    // Return cached data if still valid
    if (this.lookupCache && this.cacheTimestamp && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.lookupCache;
    }

    const supabase = requireSupabase();

    // Fetch all data to extract unique values
    const { data, error } = await supabase
      .from('affiliate_matrix')
      .select('relationship_key, relationship_label, age_group_key, age_group_label, gender_key, gender_label, budget_key, budget_label')
      .not('relationship_key', 'is', null)
      .not('age_group_key', 'is', null)
      .not('gender_key', 'is', null)
      .not('budget_key', 'is', null);

    if (error) {
      console.error('[affiliateMatrixService] Error fetching lookup values:', error);
      throw new Error('Failed to load gift finder options');
    }

    // Extract unique values
    const relationshipMap = new Map<string, { key: string; label: string }>();
    const ageGroupMap = new Map<string, { key: string; label: string }>();
    const genderMap = new Map<string, { key: string; label: string }>();
    const budgetMap = new Map<string, { key: string; label: string }>();

    data?.forEach((row: AffiliateMatrixItem) => {
      if (row.relationship_key && row.relationship_label) {
        relationshipMap.set(row.relationship_key, {
          key: row.relationship_key,
          label: row.relationship_label
        });
      }
      if (row.age_group_key && row.age_group_label) {
        ageGroupMap.set(row.age_group_key, {
          key: row.age_group_key,
          label: row.age_group_label
        });
      }
      if (row.gender_key && row.gender_label) {
        genderMap.set(row.gender_key, {
          key: row.gender_key,
          label: row.gender_label
        });
      }
      if (row.budget_key && row.budget_label) {
        budgetMap.set(row.budget_key, {
          key: row.budget_key,
          label: row.budget_label
        });
      }
    });

    this.lookupCache = {
      relationships: Array.from(relationshipMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
      ageGroups: Array.from(ageGroupMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
      genders: Array.from(genderMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
      budgets: Array.from(budgetMap.values()).sort((a, b) => a.label.localeCompare(b.label))
    };

    this.cacheTimestamp = Date.now();

    return this.lookupCache;
  }

  /**
   * Search for affiliate URLs based on selected criteria
   * Returns matching rows from affiliate_matrix
   */
  async searchAffiliateLinks(criteria: AffiliateSearchCriteria): Promise<AffiliateMatrixItem[]> {
    const supabase = requireSupabase();

    let query = supabase
      .from('affiliate_matrix')
      .select('*')
      .not('affiliate_url', 'is', null);

    // Apply filters based on provided criteria
    if (criteria.relationship_key) {
      query = query.eq('relationship_key', criteria.relationship_key);
    }
    if (criteria.age_group_key) {
      query = query.eq('age_group_key', criteria.age_group_key);
    }
    if (criteria.gender_key) {
      query = query.eq('gender_key', criteria.gender_key);
    }
    if (criteria.budget_key) {
      query = query.eq('budget_key', criteria.budget_key);
    }

    const { data, error } = await query.limit(10);

    if (error) {
      console.error('[affiliateMatrixService] Error searching affiliate links:', error);
      throw new Error('Failed to search for gift suggestions');
    }

    return data || [];
  }

  /**
   * Get specific affiliate URL for exact combination
   */
  async getAffiliateUrl(criteria: AffiliateSearchCriteria): Promise<string | null> {
    const results = await this.searchAffiliateLinks(criteria);

    // Return the first matching URL
    if (results.length > 0 && results[0].affiliate_url) {
      return results[0].affiliate_url;
    }

    return null;
  }

  /**
   * Clear the lookup cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.lookupCache = null;
    this.cacheTimestamp = null;
  }
}

export const affiliateMatrixService = new AffiliateMatrixService();
