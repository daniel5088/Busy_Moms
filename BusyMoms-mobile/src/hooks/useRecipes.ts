import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as recipeService from '../services/recipeService';
import type { Recipe } from '../types/database';
import type { RecipeFilter, SimplifiedRecipe } from '../services/recipeService';

/**
 * Fetch recipes for a user with optional filtering
 */
export function useRecipes(filter?: RecipeFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recipes', 'list', filter],
    queryFn: async () => {
      if (!user) return [];
      return recipeService.getRecipes(user.id, filter);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch a single recipe by ID
 */
export function useRecipe(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', 'detail', recipeId],
    queryFn: async () => {
      return recipeService.getRecipe(recipeId);
    },
    enabled: !!recipeId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Fetch ingredients for a recipe
 */
export function useRecipeIngredients(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', 'ingredients', recipeId],
    queryFn: async () => {
      return recipeService.getIngredients(recipeId);
    },
    enabled: !!recipeId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Create a new recipe
 */
export function useCreateRecipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipe: Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');
      return recipeService.createRecipe({ ...recipe, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'list'] });
    },
  });
}

/**
 * Update a recipe
 */
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipeId,
      updates,
    }: {
      recipeId: string;
      updates: Partial<Omit<Recipe, 'id' | 'created_at' | 'updated_at'>>;
    }) => {
      return recipeService.updateRecipe(recipeId, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'list'] });
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['recipes', 'detail', data.id] });
      }
    },
  });
}

/**
 * Delete a recipe
 */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      return recipeService.deleteRecipe(recipeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

/**
 * Import a recipe from TheMealDB
 */
export function useImportRecipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (themealdbRecipe: SimplifiedRecipe) => {
      if (!user) throw new Error('User not authenticated');
      return recipeService.importFromTheMealDB(user.id, themealdbRecipe);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', 'list'] });
    },
  });
}
