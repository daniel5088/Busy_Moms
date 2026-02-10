import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as recipeService from '../services/recipeService';

/**
 * Fetch user's saved recipes
 */
export function useSavedRecipes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipes', 'saved'],
    queryFn: async () => {
      if (!user) return [];
      return recipeService.getSavedRecipes(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Check if a recipe is saved by the user
 */
export function useIsRecipeSaved(recipeId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipes', 'saved', recipeId],
    queryFn: async () => {
      if (!user) return false;
      return recipeService.isRecipeSaved(user.id, recipeId);
    },
    enabled: !!user && !!recipeId,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Save a recipe
 */
export function useSaveRecipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      if (!user) throw new Error('User not authenticated');
      return recipeService.saveRecipe(user.id, recipeId);
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'saved', recipeId] });
    },
  });
}

/**
 * Unsave a recipe
 */
export function useUnsaveRecipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      if (!user) throw new Error('User not authenticated');
      return recipeService.unsaveRecipe(user.id, recipeId);
    },
    onSuccess: (_, recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'saved'] });
      queryClient.invalidateQueries({ queryKey: ['recipes', 'saved', recipeId] });
    },
  });
}
