import React, { useState } from 'react';
import {
  Settings,
  X,
  GripVertical,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  Check,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { useQuickActions } from '../hooks/useQuickActions';
import { UserQuickAction, QuickActionType } from '../services/quickActionsService';
import { getGradientClasses, getQuickActionColors } from '../utils/gradientMapper';

interface QuickActionsCustomizerProps {
  onClose: () => void;
}

export function QuickActionsCustomizer({ onClose }: QuickActionsCustomizerProps) {
  const {
    quickActions,
    availableTypes,
    loading,
    error,
    updatePositions,
    toggleAction,
    addAction,
    removeAction,
    resetToDefaults
  } = useQuickActions();

  const [draggedItem, setDraggedItem] = useState<UserQuickAction | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addingActionId, setAddingActionId] = useState<string | null>(null);
  const [justAddedIds, setJustAddedIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const getIconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName];
    return Icon || Icons.HelpCircle;
  };

  const handleDragStart = (e: React.DragEvent, action: UserQuickAction) => {
    setDraggedItem(action);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const items = [...quickActions];
    const draggedIndex = items.findIndex(item => item.id === draggedItem.id);

    if (draggedIndex === targetIndex) {
      setDraggedItem(null);
      return;
    }

    items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    const updates = items.map((item, index) => ({
      id: item.id,
      position: index
    }));

    try {
      await updatePositions(updates);
    } catch (err) {
      console.error('Failed to reorder:', err);
    }

    setDraggedItem(null);
  };

  const handleToggle = async (actionId: string, currentEnabled: boolean) => {
    try {
      await toggleAction(actionId, !currentEnabled);
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const handleAdd = async (typeId: string) => {
    // Filter out temporary items when calculating position
    const realActions = quickActions.filter(a => !a.id.startsWith('temp-'));
    const maxPosition = realActions.length > 0
      ? Math.max(...realActions.map(a => a.position))
      : -1;

    setAddingActionId(typeId);
    try {
      await addAction(typeId, maxPosition + 1);
      // Track just added items for animation
      const tempId = `temp-${typeId}`;
      setJustAddedIds(prev => new Set(prev).add(tempId));

      // Don't close the menu so users can add multiple actions
      setTimeout(() => {
        setAddingActionId(null);
        setJustAddedIds(prev => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });
      }, 800);
    } catch (err) {
      console.error('Failed to add action:', err);
      setAddingActionId(null);
    }
  };

  const handleRemove = async (actionId: string) => {
    setRemovingIds(prev => new Set(prev).add(actionId));

    // Wait for animation before actually removing
    setTimeout(async () => {
      try {
        await removeAction(actionId);
        setRemovingIds(prev => {
          const next = new Set(prev);
          next.delete(actionId);
          return next;
        });
      } catch (err) {
        console.error('Failed to remove action:', err);
        setRemovingIds(prev => {
          const next = new Set(prev);
          next.delete(actionId);
          return next;
        });
      }
    }, 300);
  };

  const handleReset = async () => {
    if (confirm('Reset to default quick actions? This will remove all customizations.')) {
      try {
        await resetToDefaults();
      } catch (err) {
        console.error('Failed to reset:', err);
      }
    }
  };

  // Recalculate available actions whenever quickActions or availableTypes change
  const usedActionTypes = React.useMemo(
    () => new Set(quickActions.map(a => a.action_type_id)),
    [quickActions]
  );
  const availableToAdd = React.useMemo(
    () => availableTypes.filter(t => !usedActionTypes.has(t.id)),
    [availableTypes, usedActionTypes]
  );

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Customize Quick Actions</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drag to reorder, toggle visibility, or remove actions
              </p>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to defaults
              </button>
            </div>

            <div className="space-y-2 relative">
              {quickActions.filter(action => !removingIds.has(action.id)).map((action, index) => {
                const Icon = getIconComponent(action.action_type?.icon || 'HelpCircle');
                const isDragging = draggedItem?.id === action.id;
                const isDragOver = dragOverIndex === index;
                const isJustAdded = action.id.startsWith('temp-') || justAddedIds.has(`temp-${action.action_type_id}`);
                const isRemoving = removingIds.has(action.id);
                const colors = getQuickActionColors(action.action_type_id);

                return (
                  <div
                    key={action.id}
                    draggable={!isRemoving}
                    onDragStart={(e) => handleDragStart(e, action)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => setDraggedItem(null)}
                    style={{
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                      animation: isJustAdded ? 'slideInUp 0.4s ease-out' : isRemoving ? 'slideOut 0.3s ease-in forwards' : 'none',
                    }}
                    className={`
                      group flex items-center gap-3 p-4 rounded-xl border-2
                      ${isDragging ? 'opacity-50 shadow-2xl z-50' : 'opacity-100'}
                      ${isDragOver ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20' : `${colors.borderColor} ${colors.bgColor}`}
                      ${isJustAdded ? 'border-green-400 ring-2 ring-green-200 dark:ring-green-800' : ''}
                      ${action.enabled ? '' : 'opacity-60'}
                      ${isRemoving ? '' : 'hover:shadow-md cursor-move'}
                    `}
                  >
                    <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />

                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                      ${action.enabled
                        ? `${colors.iconBgColor} ${colors.iconColor}`
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {action.action_type?.name || 'Unknown'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {action.action_type?.description || ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(action.id, action.enabled)}
                        className={`
                          p-2 rounded-lg transition-colors
                          ${action.enabled
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }
                        `}
                        title={action.enabled ? 'Hide' : 'Show'}
                      >
                        {action.enabled ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>

                      <button
                        onClick={() => handleRemove(action.id)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {availableToAdd.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                {!showAddMenu ? (
                  <button
                    onClick={() => setShowAddMenu(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-pink-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Add Quick Action
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Available Actions</h3>
                      <button
                        onClick={() => setShowAddMenu(false)}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                    {availableToAdd.map((type) => {
                      const Icon = getIconComponent(type.icon);
                      const isAdding = addingActionId === type.id;
                      const colors = getQuickActionColors(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => handleAdd(type.id)}
                          disabled={isAdding}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                            isAdding
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg ${colors.iconBgColor} ${colors.iconColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 dark:text-white">{type.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{type.description}</p>
                          </div>
                          {isAdding ? (
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Plus className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Pro Tip</p>
              <p>You can have up to 9 quick actions visible at once. Drag to reorder them exactly how you like!</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-rose-400 via-pink-400 to-orange-300 text-white font-semibold rounded-xl hover:shadow-lg transition-shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
