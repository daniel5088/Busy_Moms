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

      if (actions.length === 0) {
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
      await quickActionsService.updateMultiplePositions(updates);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error updating positions:', err);
      throw err;
    }
  }, [loadQuickActions]);

  const toggleAction = useCallback(async (actionId: string, enabled: boolean) => {
    try {
      await quickActionsService.toggleQuickAction(actionId, enabled);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error toggling action:', err);
      throw err;
    }
  }, [loadQuickActions]);

  const addAction = useCallback(async (actionTypeId: string, position: number) => {
    try {
      await quickActionsService.addQuickAction(actionTypeId, position);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error adding action:', err);
      throw err;
    }
  }, [loadQuickActions]);

  const removeAction = useCallback(async (actionId: string) => {
    try {
      await quickActionsService.removeQuickAction(actionId);
      await loadQuickActions(false);
    } catch (err) {
      console.error('Error removing action:', err);
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
