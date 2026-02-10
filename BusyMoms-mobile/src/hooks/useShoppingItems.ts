import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import * as shoppingService from '../services/shoppingService';
import type { ShoppingItem } from '../types/database';
import type { ShoppingFilter } from '../services/shoppingService';

/**
 * Fetch shopping items with optional filtering
 */
export function useShoppingItems(filter?: ShoppingFilter) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shopping', 'items', filter],
    queryFn: async () => {
      if (!user) return [];
      return shoppingService.getShoppingItems(user.id, filter);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch shopping items grouped by category
 */
export function useShoppingItemsByCategory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shopping', 'items', 'grouped'],
    queryFn: async () => {
      if (!user) return [];
      const items = await shoppingService.getShoppingItems(user.id);

      // Group by category
      const grouped = items.reduce((acc, item) => {
        const category = item.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, ShoppingItem[]>);

      // Convert to array of sections
      return Object.entries(grouped).map(([category, data]) => ({
        title: category,
        data,
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Create a new shopping item
 */
export function useCreateShoppingItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('User not authenticated');
      return shoppingService.createShoppingItem(user.id, item);
    },
    onSuccess: () => {
      // Invalidate all shopping queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

/**
 * Update a shopping item
 */
export function useUpdateShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: Partial<Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
    }) => {
      return shoppingService.updateShoppingItem(itemId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

/**
 * Delete a shopping item
 */
export function useDeleteShoppingItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      return shoppingService.deleteShoppingItem(itemId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

/**
 * Toggle item completed status with optimistic update
 */
export function useToggleItemCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      return shoppingService.toggleItemCompleted(itemId, completed);
    },
    onMutate: async ({ itemId, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['shopping'] });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(['shopping', 'items']);

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ['shopping', 'items'] }, (old: unknown) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((item: ShoppingItem) =>
          item.id === itemId ? { ...item, completed } : item
        );
      });

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['shopping', 'items'], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

/**
 * Bulk update shopping items
 */
export function useBulkUpdateItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemIds,
      updates,
    }: {
      itemIds: string[];
      updates: Partial<Omit<ShoppingItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
    }) => {
      return shoppingService.bulkUpdateItems(itemIds, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

/**
 * Bulk delete shopping items
 */
export function useBulkDeleteItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemIds: string[]) => {
      return shoppingService.bulkDeleteItems(itemIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    },
  });
}

/**
 * Get distinct categories
 */
export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['shopping', 'categories'],
    queryFn: async () => {
      if (!user) return [];
      return shoppingService.getCategories(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes (categories don't change often)
  });
}
