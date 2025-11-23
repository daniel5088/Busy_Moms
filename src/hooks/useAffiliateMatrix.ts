import { useState, useEffect, useCallback } from 'react';
import { affiliateMatrixService } from '../services/affiliateMatrixService';
import type { AffiliateMatrixLookup, AffiliateMatrixItem, AffiliateSearchCriteria } from '../lib/supabase';

interface UseAffiliateMatrixReturn {
  lookupValues: AffiliateMatrixLookup | null;
  affiliateResults: AffiliateMatrixItem[];
  loading: boolean;
  error: string | null;
  searchAffiliateLinks: (criteria: AffiliateSearchCriteria) => Promise<void>;
  clearResults: () => void;
}

export function useAffiliateMatrix(): UseAffiliateMatrixReturn {
  const [lookupValues, setLookupValues] = useState<AffiliateMatrixLookup | null>(null);
  const [affiliateResults, setAffiliateResults] = useState<AffiliateMatrixItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load lookup values on mount
  useEffect(() => {
    let mounted = true;

    const loadLookupValues = async () => {
      try {
        setLoading(true);
        setError(null);
        const values = await affiliateMatrixService.getLookupValues();

        if (mounted) {
          setLookupValues(values);
        }
      } catch (err) {
        if (mounted) {
          console.error('[useAffiliateMatrix] Error loading lookup values:', err);
          setError(err instanceof Error ? err.message : 'Failed to load options');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadLookupValues();

    return () => {
      mounted = false;
    };
  }, []);

  // Search for affiliate links based on criteria
  const searchAffiliateLinks = useCallback(async (criteria: AffiliateSearchCriteria) => {
    try {
      setLoading(true);
      setError(null);

      const results = await affiliateMatrixService.searchAffiliateLinks(criteria);
      setAffiliateResults(results);
    } catch (err) {
      console.error('[useAffiliateMatrix] Error searching affiliate links:', err);
      setError(err instanceof Error ? err.message : 'Failed to search for gifts');
      setAffiliateResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear current results
  const clearResults = useCallback(() => {
    setAffiliateResults([]);
    setError(null);
  }, []);

  return {
    lookupValues,
    affiliateResults,
    loading,
    error,
    searchAffiliateLinks,
    clearResults
  };
}
