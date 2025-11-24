import { requireSupabase } from '../lib/supabase';
import type { AffiliateMatrixItem, AffiliateMatrixLookup, AffiliateSearchCriteria } from '../lib/supabase';

class AffiliateMatrixService {
  private lookupCache: AffiliateMatrixLookup | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  /**
   * Extract numerical value from budget label for sorting
   * Examples: "$0-$25" -> 0, "$25-$50" -> 25, "$200+" -> 200
   */
  private extractBudgetValue(label: string): number {
    // Remove dollar signs and extract first number
    const match = label.replace(/\$/g, '').match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    // Fallback: return large number if can't parse (sorts to end)
    return Infinity;
  }

  /**
   * Extract numerical value from age group label for sorting
   * Examples: "0-5" -> 0, "6-12" -> 6, "18+" -> 18, "Adult" -> null
   */
  private extractAgeValue(label: string): number | null {
    // Check if label starts with a number
    const match = label.match(/^(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    // Return null for text-only labels (will sort alphabetically)
    return null;
  }

  /**
   * Smart sort for age groups - numerical if possible, alphabetical as fallback
   */
  private sortAgeGroups(a: { key: string; label: string }, b: { key: string; label: string }): number {
    const aValue = this.extractAgeValue(a.label);
    const bValue = this.extractAgeValue(b.label);

    // Both have numerical values - sort numerically
    if (aValue !== null && bValue !== null) {
      return aValue - bValue;
    }

    // One or both are text - sort alphabetically
    return a.label.localeCompare(b.label);
  }

  /**
   * Sort budget ranges by numerical value (low to high)
   */
  private sortBudgetRanges(a: { key: string; label: string }, b: { key: string; label: string }): number {
    const aValue = this.extractBudgetValue(a.label);
    const bValue = this.extractBudgetValue(b.label);
    return aValue - bValue;
  }

  /**
   * Fetch all unique dropdown values from affiliate_matrix
   * Caches results for performance
   */
  async getLookupValues(): Promise<AffiliateMatrixLookup> {
    // Return cached data if still valid
    if (this.lookupCache && this.cacheTimestamp && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      console.log('[affiliateMatrixService] Returning cached lookup values');
      return this.lookupCache;
    }

    console.log('[affiliateMatrixService] Fetching lookup values from database...');
    const supabase = requireSupabase();

    // Fetch all data to extract unique values (no restrictive filters)
    const { data, error } = await supabase
      .from('affiliate_matrix')
      .select('relationship_key, relationship_label, age_group_key, age_group_label, gender_key, gender_label, budget_key, budget_label');

    if (error) {
      console.error('[affiliateMatrixService] Error fetching lookup values:', error);
      throw new Error('Failed to load gift finder options');
    }

    console.log(`[affiliateMatrixService] Fetched ${data?.length || 0} rows from affiliate_matrix`);

    if (!data || data.length === 0) {
      console.warn('[affiliateMatrixService] No data returned from affiliate_matrix table');
      // Return empty lookup values
      this.lookupCache = {
        relationships: [],
        ageGroups: [],
        genders: [],
        budgets: []
      };
      this.cacheTimestamp = Date.now();
      return this.lookupCache;
    }

    // Extract unique values
    const relationshipMap = new Map<string, { key: string; label: string }>();
    const ageGroupMap = new Map<string, { key: string; label: string }>();
    const genderMap = new Map<string, { key: string; label: string }>();
    const budgetMap = new Map<string, { key: string; label: string }>();

    data.forEach((row: AffiliateMatrixItem) => {
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
      ageGroups: Array.from(ageGroupMap.values()).sort((a, b) => this.sortAgeGroups(a, b)),
      genders: Array.from(genderMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
      budgets: Array.from(budgetMap.values()).sort((a, b) => this.sortBudgetRanges(a, b))
    };

    console.log('[affiliateMatrixService] Extracted unique values:', {
      relationships: this.lookupCache.relationships.length,
      ageGroups: this.lookupCache.ageGroups.length,
      genders: this.lookupCache.genders.length,
      budgets: this.lookupCache.budgets.length
    });

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
