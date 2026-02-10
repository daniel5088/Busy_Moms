import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickActionsService, UserQuickAction } from '../services/quickActionsService';

export function useQuickActions() {
  const queryClient = useQueryClient();

  // Fetch quick actions
  const { data: quickActions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['quickActions'],
    queryFn: async () => {
      const actions = await quickActionsService.getUserQuickActions();

      // If no actions, initialize defaults
      if (actions.length === 0) {
        await quickActionsService.initializeQuickActions();
        return await quickActionsService.getUserQuickActions();
      }

      return actions;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch available action types
  const { data: availableTypes = [] } = useQuery({
    queryKey: ['quickActionTypes'],
    queryFn: () => quickActionsService.getActionTypes(),
    staleTime: Infinity, // Types rarely change
  });

  // Update positions mutation
  const updatePositionsMutation = useMutation({
    mutationFn: (updates: { id: string; position: number }[]) =>
      quickActionsService.updateMultiplePositions(updates),
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['quickActions'] });

      // Snapshot previous value
      const previousActions = queryClient.getQueryData<UserQuickAction[]>(['quickActions']);

      // Optimistic update
      if (previousActions) {
        const newActions = [...previousActions];
        updates.forEach(update => {
          const action = newActions.find(a => a.id === update.id);
          if (action) {
            action.position = update.position;
          }
        });
        queryClient.setQueryData(['quickActions'], newActions.sort((a, b) => a.position - b.position));
      }

      return { previousActions };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousActions) {
        queryClient.setQueryData(['quickActions'], context.previousActions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });

  // Toggle action mutation
  const toggleActionMutation = useMutation({
    mutationFn: ({ actionId, enabled }: { actionId: string; enabled: boolean }) =>
      quickActionsService.toggleQuickAction(actionId, enabled),
    onMutate: async ({ actionId, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['quickActions'] });
      const previousActions = queryClient.getQueryData<UserQuickAction[]>(['quickActions']);

      if (previousActions) {
        queryClient.setQueryData(
          ['quickActions'],
          previousActions.map(action =>
            action.id === actionId ? { ...action, enabled } : action
          )
        );
      }

      return { previousActions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousActions) {
        queryClient.setQueryData(['quickActions'], context.previousActions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });

  // Add action mutation
  const addActionMutation = useMutation({
    mutationFn: ({ actionTypeId, position }: { actionTypeId: string; position: number }) =>
      quickActionsService.addQuickAction(actionTypeId, position),
    onMutate: async ({ actionTypeId, position }) => {
      await queryClient.cancelQueries({ queryKey: ['quickActions'] });
      const previousActions = queryClient.getQueryData<UserQuickAction[]>(['quickActions']);

      // Optimistic update
      const actionType = availableTypes.find(t => t.id === actionTypeId);
      if (actionType && previousActions) {
        const optimisticAction: UserQuickAction = {
          id: `temp-${actionTypeId}-${Date.now()}`,
          user_id: '',
          action_type_id: actionTypeId,
          position: position,
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          action_type: actionType,
        };
        queryClient.setQueryData(
          ['quickActions'],
          [...previousActions, optimisticAction].sort((a, b) => a.position - b.position)
        );
      }

      return { previousActions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousActions) {
        queryClient.setQueryData(['quickActions'], context.previousActions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });

  // Remove action mutation
  const removeActionMutation = useMutation({
    mutationFn: (actionId: string) => quickActionsService.removeQuickAction(actionId),
    onMutate: async (actionId) => {
      await queryClient.cancelQueries({ queryKey: ['quickActions'] });
      const previousActions = queryClient.getQueryData<UserQuickAction[]>(['quickActions']);

      if (previousActions) {
        queryClient.setQueryData(
          ['quickActions'],
          previousActions.filter(action => action.id !== actionId)
        );
      }

      return { previousActions };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousActions) {
        queryClient.setQueryData(['quickActions'], context.previousActions);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });

  // Reset to defaults mutation
  const resetToDefaultsMutation = useMutation({
    mutationFn: () => quickActionsService.resetToDefaults(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['quickActions'] });
    },
  });

  return {
    quickActions,
    availableTypes,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    reload: refetch,
    updatePositions: (updates: { id: string; position: number }[]) =>
      updatePositionsMutation.mutateAsync(updates),
    toggleAction: (actionId: string, enabled: boolean) =>
      toggleActionMutation.mutateAsync({ actionId, enabled }),
    addAction: (actionTypeId: string, position: number) =>
      addActionMutation.mutateAsync({ actionTypeId, position }),
    removeAction: (actionId: string) => removeActionMutation.mutateAsync(actionId),
    resetToDefaults: () => resetToDefaultsMutation.mutateAsync(),
  };
}
