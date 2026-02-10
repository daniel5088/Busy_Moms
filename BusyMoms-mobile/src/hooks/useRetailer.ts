import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as instacartShoppingService from '../services/instacartShoppingService';
import type { Retailer } from '../types/database';

/**
 * Fetch user's preferred retailers
 */
export function usePreferredRetailers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['retailers', 'preferred'],
    queryFn: async () => {
      if (!user) return [];
      return instacartShoppingService.getPreferredRetailers(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch user's primary retailer
 */
export function usePrimaryRetailer() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['retailers', 'primary'],
    queryFn: async () => {
      if (!user) return null;
      return instacartShoppingService.getPrimaryRetailer(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Search for nearby retailers by postal code
 */
export function useNearbyRetailers(postalCode: string, countryCode: 'US' | 'CA' = 'US') {
  return useQuery({
    queryKey: ['retailers', 'nearby', postalCode, countryCode],
    queryFn: async () => {
      return instacartShoppingService.getNearbyRetailers(postalCode, countryCode);
    },
    enabled: !!postalCode && postalCode.length >= 5,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Save a preferred retailer
 */
export function useSaveRetailer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ retailer, isPrimary }: { retailer: Retailer; isPrimary: boolean }) => {
      if (!user) throw new Error('User not authenticated');
      return instacartShoppingService.savePreferredRetailer(user.id, retailer, isPrimary);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailers', 'preferred'] });
      queryClient.invalidateQueries({ queryKey: ['retailers', 'primary'] });
    },
  });
}

/**
 * Set a retailer as primary
 */
export function useSetPrimaryRetailer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (retailerId: string) => {
      if (!user) throw new Error('User not authenticated');
      return instacartShoppingService.setPrimaryRetailer(user.id, retailerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailers', 'preferred'] });
      queryClient.invalidateQueries({ queryKey: ['retailers', 'primary'] });
    },
  });
}

/**
 * Remove a preferred retailer
 */
export function useRemoveRetailer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (retailerId: string) => {
      if (!user) throw new Error('User not authenticated');
      return instacartShoppingService.removePreferredRetailer(user.id, retailerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailers', 'preferred'] });
      queryClient.invalidateQueries({ queryKey: ['retailers', 'primary'] });
    },
  });
}
