import { useQuery } from '@tanstack/react-query';
import { affiliateMatrixService, AffiliateSearchCriteria } from '../services/affiliateMatrixService';

export function useAffiliateMatrix() {
  const lookupQuery = useQuery({
    queryKey: ['affiliate-matrix-lookup'],
    queryFn: () => affiliateMatrixService.getLookupValues(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  return {
    lookupValues: lookupQuery.data,
    isLoading: lookupQuery.isLoading,
    error: lookupQuery.error,
  };
}

export function useAffiliateSearch(criteria: AffiliateSearchCriteria, enabled: boolean = true) {
  const searchQuery = useQuery({
    queryKey: ['affiliate-search', criteria],
    queryFn: () => affiliateMatrixService.searchAffiliateLinks(criteria),
    enabled: enabled && Object.keys(criteria).length > 0,
  });

  return {
    results: searchQuery.data || [],
    isLoading: searchQuery.isLoading,
    error: searchQuery.error,
  };
}
