import { useQuery } from '@tanstack/react-query';
import * as themealdbService from '../services/themealdbService';

/**
 * Search recipes by name on TheMealDB
 */
export function useSearchRecipes(query: string) {
  return useQuery({
    queryKey: ['themealdb', 'search', query],
    queryFn: async () => {
      return themealdbService.searchByName(query);
    },
    enabled: !!query && query.length >= 3,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Fetch random recipes from TheMealDB
 */
export function useRandomRecipes(count: number = 10) {
  return useQuery({
    queryKey: ['themealdb', 'random', count],
    queryFn: async () => {
      return themealdbService.getRandomRecipes(count);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch recipe categories from TheMealDB
 */
export function useCategories() {
  return useQuery({
    queryKey: ['themealdb', 'categories'],
    queryFn: async () => {
      return themealdbService.getCategories();
    },
    staleTime: 1000 * 60 * 60, // 1 hour (categories rarely change)
  });
}

/**
 * Filter recipes by category on TheMealDB
 */
export function useRecipesByCategory(category: string) {
  return useQuery({
    queryKey: ['themealdb', 'category', category],
    queryFn: async () => {
      return themealdbService.filterByCategory(category);
    },
    enabled: !!category,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}
