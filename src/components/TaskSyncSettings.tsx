import React, { useState, useEffect } from 'react';
import { Settings, Save, X, CheckSquare, RefreshCw } from 'lucide-react';
import { taskSyncService } from '../services/taskSync';
import { taskSyncOrchestrator } from '../services/taskSyncOrchestrator';
import { useAuth } from '../hooks/useAuth';

interface TaskSyncSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TaskSyncSettings({ isOpen, onClose }: TaskSyncSettingsProps) {
  const { user } = useAuth();
  const [localSyncEnabled, setLocalSyncEnabled] = useState(true);
  const [localSyncFrequency, setLocalSyncFrequency] = useState(15);
  const [syncDirection, setSyncDirection] = useState<
    'bidirectional' | 'google_to_local' | 'local_to_google'
  >('bidirectional');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      taskSyncService.getUserTaskSyncPreferences(user.id).then((prefs) => {
        if (prefs) {
          setLocalSyncEnabled(prefs.sync_enabled);
          setLocalSyncFrequency(prefs.sync_frequency_minutes);
          setSyncDirection(prefs.sync_direction);
          setLastSyncAt(prefs.last_sync_at);
        }
      });
    }
  }, [isOpen, user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const success = await taskSyncService.updateUserTaskSyncPreferences(user.id, {
        sync_enabled: localSyncEnabled,
        sync_frequency_minutes: localSyncFrequency,
        sync_direction: syncDirection,
      });

      if (success) {
        onClose();
      } else {
        alert('Failed to save task sync settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving task sync settings:', error);
      alert('Failed to save task sync settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleManualSync = async () => {
    if (!user?.id) return;

    setSyncing(true);
    try {
      const result = await taskSyncOrchestrator.performFullSync(user.id);
      if (result.success) {
        alert(`Sync completed! Created: ${result.tasksCreated}, Updated: ${result.tasksUpdated}`);
        setLastSyncAt(new Date().toISOString());
      } else {
        alert(`Sync failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error syncing tasks:', error);
      alert('Failed to sync tasks. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-labelledby="task-sync-settings-title"
        aria-modal="true"
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
              <h2 id="task-sync-settings-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Task Sync Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSyncEnabled}
                  onChange={(e) => setLocalSyncEnabled(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">Enable automatic sync</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically sync your tasks with Google Tasks
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync frequency
              </label>
              <select
                value={localSyncFrequency}
                onChange={(e) => setLocalSyncFrequency(parseInt(e.target.value, 10))}
                disabled={!localSyncEnabled}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync direction
              </label>
              <select
                value={syncDirection}
                onChange={(e) =>
                  setSyncDirection(
                    e.target.value as 'bidirectional' | 'google_to_local' | 'local_to_google'
                  )
                }
                disabled={!localSyncEnabled}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="bidirectional">Bidirectional (recommended)</option>
                <option value="local_to_google">Local to Google Tasks only</option>
                <option value="google_to_local">Google Tasks to local only</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Bidirectional keeps both local tasks and Google Tasks in sync
              </p>
            </div>

            {lastSyncAt && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Last synced:{' '}
                  <span className="font-medium">
                    {new Date(lastSyncAt).toLocaleString()}
                  </span>
                </p>
              </div>
            )}

            <div>
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Note: Tasks marked as &quot;in progress&quot; will appear as &quot;needs action&quot; in Google Tasks
              </p>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
