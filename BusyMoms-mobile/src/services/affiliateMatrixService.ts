import { supabase } from '../lib/supabase';

export interface AffiliateMatrixItem {
  id: string;
  relationship_key: string;
  relationship_label: string;
  age_group_key: string;
  age_group_label: string;
  gender_key: string;
  gender_label: string;
  budget_key: string;
  budget_label: string;
  search_phrase: string;
  affiliate_url: string;
}

export interface AffiliateMatrixLookup {
  relationships: Array<{ key: string; label: string }>;
  ageGroups: Array<{ key: string; label: string }>;
  genders: Array<{ key: string; label: string }>;
  budgets: Array<{ key: string; label: string }>;
}

export interface AffiliateSearchCriteria {
  relationship_key?: string;
  age_group_key?: string;
  gender_key?: string;
  budget_key?: string;
}

class AffiliateMatrixService {
  private lookupCache: AffiliateMatrixLookup | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_DURATION = 1000 * 60 * 60; // 1 hour

  private extractBudgetValue(label: string): number {
    const match = label.replace(/\$/g, '').match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return Infinity;
  }

  private extractAgeValue(label: string): number | null {
    const match = label.match(/^(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  private sortAgeGroups(
    a: { key: string; label: string },
    b: { key: string; label: string }
  ): number {
    const aValue = this.extractAgeValue(a.label);
    const bValue = this.extractAgeValue(b.label);

    if (aValue !== null && bValue !== null) {
      return aValue - bValue;
    }

    return a.label.localeCompare(b.label);
  }

  private sortBudgetRanges(
    a: { key: string; label: string },
    b: { key: string; label: string }
  ): number {
    const aValue = this.extractBudgetValue(a.label);
    const bValue = this.extractBudgetValue(b.label);
    return aValue - bValue;
  }

  async getLookupValues(): Promise<AffiliateMatrixLookup> {
    // Return cached data if still valid
    if (
      this.lookupCache &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp < this.CACHE_DURATION
    ) {
      return this.lookupCache;
    }

    const { data, error } = await supabase
      .from('affiliate_matrix')
      .select(
        'relationship_key, relationship_label, age_group_key, age_group_label, gender_key, gender_label, budget_key, budget_label'
      );

    if (error) {
      console.error('Error fetching lookup values:', error);
      throw new Error('Failed to load gift finder options');
    }

    if (!data || data.length === 0) {
      this.lookupCache = {
        relationships: [],
        ageGroups: [],
        genders: [],
        budgets: [],
      };
      this.cacheTimestamp = Date.now();
      return this.lookupCache;
    }

    // Extract unique values
    const relationshipMap = new Map<string, { key: string; label: string }>();
    const ageGroupMap = new Map<string, { key: string; label: string }>();
    const genderMap = new Map<string, { key: string; label: string }>();
    const budgetMap = new Map<string, { key: string; label: string }>();

    data.forEach((row: any) => {
      if (row.relationship_key && row.relationship_label) {
        relationshipMap.set(row.relationship_key, {
          key: row.relationship_key,
          label: row.relationship_label,
        });
      }
      if (row.age_group_key && row.age_group_label) {
        ageGroupMap.set(row.age_group_key, {
          key: row.age_group_key,
          label: row.age_group_label,
        });
      }
      if (row.gender_key && row.gender_label) {
        genderMap.set(row.gender_key, {
          key: row.gender_key,
          label: row.gender_label,
        });
      }
      if (row.budget_key && row.budget_label) {
        budgetMap.set(row.budget_key, {
          key: row.budget_key,
          label: row.budget_label,
        });
      }
    });

    this.lookupCache = {
      relationships: Array.from(relationshipMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      ),
      ageGroups: Array.from(ageGroupMap.values()).sort((a, b) => this.sortAgeGroups(a, b)),
      genders: Array.from(genderMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
      budgets: Array.from(budgetMap.values()).sort((a, b) => this.sortBudgetRanges(a, b)),
    };

    this.cacheTimestamp = Date.now();
    return this.lookupCache;
  }

  async searchAffiliateLinks(criteria: AffiliateSearchCriteria): Promise<AffiliateMatrixItem[]> {
    let query = supabase.from('affiliate_matrix').select('*').not('affiliate_url', 'is', null);

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

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Error searching affiliate links:', error);
      throw new Error('Failed to search for gift suggestions');
    }

    return data || [];
  }

  clearCache(): void {
    this.lookupCache = null;
    this.cacheTimestamp = null;
  }
}

export const affiliateMatrixService = new AffiliateMatrixService();
