import React from 'react';
import { X, AlertTriangle, CheckSquare } from 'lucide-react';
import { TaskSyncConflict } from '../services/taskSync';

interface TaskConflictResolutionModalProps {
  isOpen: boolean;
  conflict: TaskSyncConflict | null;
  onResolve: (conflictId: string, resolution: 'keep_local' | 'keep_google' | 'merge') => void;
  onClose: () => void;
}

export function TaskConflictResolutionModal({
  isOpen,
  conflict,
  onResolve,
  onClose,
}: TaskConflictResolutionModalProps) {
  if (!isOpen || !conflict) return null;

  const localTask = conflict.local_task_data;
  const googleTask = conflict.google_task_data;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Task Sync Conflict
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            This task was modified in both locations. Choose which version to keep:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center space-x-2 mb-3">
                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Local Version</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Title:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">{localTask.title}</span>
                </div>
                {localTask.description && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">{localTask.description}</span>
                  </div>
                )}
                {localTask.due_date && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Due Date:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">
                      {localTask.due_date}
                      {localTask.due_time && ` ${localTask.due_time}`}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100 capitalize">{localTask.status}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Priority:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100 capitalize">{localTask.priority}</span>
                </div>
                {conflict.local_modified_at && (
                  <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Modified: {new Date(conflict.local_modified_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center space-x-2 mb-3">
                <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Google Version</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Title:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100">{googleTask.title}</span>
                </div>
                {googleTask.notes && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Notes:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">{googleTask.notes}</span>
                  </div>
                )}
                {googleTask.due && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Due Date:</span>{' '}
                    <span className="text-gray-900 dark:text-gray-100">
                      {new Date(googleTask.due).toLocaleString()}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>{' '}
                  <span className="text-gray-900 dark:text-gray-100 capitalize">{googleTask.status}</span>
                </div>
                {conflict.google_modified_at && (
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Modified: {new Date(conflict.google_modified_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onResolve(conflict.id, 'keep_local')}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Keep Local Version
            </button>
            <button
              onClick={() => onResolve(conflict.id, 'keep_google')}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Keep Google Version
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Decide Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
