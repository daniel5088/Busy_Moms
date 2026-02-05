import { useState, useEffect, useCallback } from 'react';
import { quickActionsService, UserQuickAction, QuickActionType } from '../services/quickActionsService';

export function useQuickActions() {
  const [quickActions, setQuickActions] = useState<UserQuickAction[]>([]);
  const [availableTypes, setAvailableTypes] = useState<QuickActionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuickActions = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const [actions, types] = await Promise.all([
        quickActionsService.getUserQuickActions(),
        quickActionsService.getActionTypes()
      ]);

      if (actions.length === 0 && showLoading) {
        await quickActionsService.initializeQuickActions();
        const newActions = await quickActionsService.getUserQuickActions();
        setQuickActions(newActions);
      } else {
        setQuickActions(actions);
      }

      setAvailableTypes(types);
    } catch (err) {
      console.error('Error loading quick actions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quick actions');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadQuickActions();
  }, [loadQuickActions]);

  const updatePositions = useCallback(async (updates: { id: string; position: number }[]) => {
    try {
      // Optimistic update
      setQuickActions(prev => {
        const newActions = [...prev];
        updates.forEach(update => {
          const action = newActions.find(a => a.id === update.id);
          if (action) {
            action.position = update.position;
          }
        });
        return newActions.sort((a, b) => a.position - b.position);
      });

      // Update server in background
      await quickActionsService.updateMultiplePositions(updates);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error updating positions:', err);
      // Revert optimistic update on error
      await loadQuickActions(false);
      throw err;
    }
  }, [loadQuickActions]);

  const toggleAction = useCallback(async (actionId: string, enabled: boolean) => {
    try {
      // Optimistic update
      setQuickActions(prev =>
        prev.map(action =>
          action.id === actionId
            ? { ...action, enabled }
            : action
        )
      );

      // Update server in background
      await quickActionsService.toggleQuickAction(actionId, enabled);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error toggling action:', err);
      // Revert optimistic update on error
      await loadQuickActions(false);
      throw err;
    }
  }, [loadQuickActions]);

  const addAction = useCallback(async (actionTypeId: string, position: number) => {
    try {
      // Optimistic update: add the action to local state immediately
      const actionType = availableTypes.find(t => t.id === actionTypeId);
      if (actionType) {
        const optimisticAction: UserQuickAction = {
          id: `temp-${actionTypeId}-${Date.now()}`,
          user_id: '',
          action_type_id: actionTypeId,
          position: position,
          enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          action_type: actionType
        };
        setQuickActions(prev => [...prev, optimisticAction].sort((a, b) => a.position - b.position));
      }

      // Update server in background
      await quickActionsService.addQuickAction(actionTypeId, position);

      // Refresh from server to get the real ID and normalized positions
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error adding action:', err);
      // Revert optimistic update on error
      await loadQuickActions(false);
      throw err;
    }
  }, [loadQuickActions, availableTypes]);

  const removeAction = useCallback(async (actionId: string) => {
    try {
      // Optimistic update
      setQuickActions(prev => prev.filter(action => action.id !== actionId));

      // Update server in background
      await quickActionsService.removeQuickAction(actionId);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error removing action:', err);
      // Revert optimistic update on error
      await loadQuickActions(false);
      throw err;
    }
  }, [loadQuickActions]);

  const resetToDefaults = useCallback(async () => {
    try {
      await quickActionsService.resetToDefaults();
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error resetting to defaults:', err);
      throw err;
    }
  }, [loadQuickActions]);

  return {
    quickActions,
    availableTypes,
    loading,
    error,
    reload: loadQuickActions,
    updatePositions,
    toggleAction,
    addAction,
    removeAction,
    resetToDefaults
  };
}
