import { useState, useEffect, useCallback } from 'react';
import { affiliateMatrixService } from '../services/affiliateMatrixService';
import type {
  AffiliateMatrixLookup,
  AffiliateMatrixItem,
  AffiliateSearchCriteria,
} from '../lib/supabase';

interface UseAffiliateMatrixReturn {
  lookupValues: AffiliateMatrixLookup | null;
  affiliateResults: AffiliateMatrixItem[];
  loading: boolean;
  error: string | null;
  searchAffiliateLinks: (criteria: AffiliateSearchCriteria) => Promise<AffiliateMatrixItem[]>;
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
        console.log('[useAffiliateMatrix] Starting to load lookup values...');
        setLoading(true);
        setError(null);
        const values = await affiliateMatrixService.getLookupValues();

        if (mounted) {
          console.log('[useAffiliateMatrix] Successfully loaded lookup values:', values);
          setLookupValues(values);
        }
      } catch (err) {
        if (mounted) {
          console.error('[useAffiliateMatrix] Error loading lookup values:', err);
          setError(err instanceof Error ? err.message : 'Failed to load options');
        }
      } finally {
        if (mounted) {
          console.log('[useAffiliateMatrix] Finished loading (loading=false)');
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
  const searchAffiliateLinks = useCallback(
    async (criteria: AffiliateSearchCriteria): Promise<AffiliateMatrixItem[]> => {
      try {
        setLoading(true);
        setError(null);

        const results = await affiliateMatrixService.searchAffiliateLinks(criteria);
        setAffiliateResults(results);
        return results;
      } catch (err) {
        console.error('[useAffiliateMatrix] Error searching affiliate links:', err);
        setError(err instanceof Error ? err.message : 'Failed to search for gifts');
        setAffiliateResults([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
    clearResults,
  };
}
