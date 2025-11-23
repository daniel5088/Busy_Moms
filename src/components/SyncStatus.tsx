import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { calendarSyncService } from '../services/calendarSync';
import { syncOrchestrator } from '../services/syncOrchestrator';
import { supabase } from '../lib/supabase';

export function SyncStatus() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [nextSyncTime, setNextSyncTime] = useState<Date | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [pendingConflicts, setPendingConflicts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session?.user) return;

    const uid = session.user.id;
    setUserId(uid);

    const prefs = await calendarSyncService.getUserSyncPreferences(uid);
    if (prefs) {
      setSyncEnabled(prefs.sync_enabled);
      if (prefs.last_sync_at) {
        setLastSyncTime(new Date(prefs.last_sync_at));
      }
      if (prefs.sync_frequency_minutes) {
        const next = new Date();
        next.setMinutes(next.getMinutes() + prefs.sync_frequency_minutes);
        setNextSyncTime(next);
      }
    }

    const conflicts = await calendarSyncService.getPendingConflicts(uid);
    setPendingConflicts(conflicts);
  };

  const performSync = async () => {
    if (!userId || isSyncing) return;

    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const result = await syncOrchestrator.performFullSync(userId);
      setLastSyncResult(result);

      if (result.success) {
        const prefs = await calendarSyncService.getUserSyncPreferences(userId);
        if (prefs?.last_sync_at) {
          setLastSyncTime(new Date(prefs.last_sync_at));
        }
        const conflicts = await calendarSyncService.getPendingConflicts(userId);
        setPendingConflicts(conflicts);
      }
    } catch (error: any) {
      console.error('❌ Sync failed:', error);
      setLastSyncResult({
        success: false,
        errors: [error.message || 'Unknown error'],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const formatNextSync = (date: Date | null) => {
    if (!date) return 'Not scheduled';
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Soon';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `in ${minutes}m`;
    return 'Soon';
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Calendar Sync</h3>
        </div>

        <button
          onClick={performSync}
          disabled={isSyncing || !syncEnabled}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      {/* Sync Status */}
      <div className="space-y-2">
        {/* Last Sync */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Last sync:</span>
          </div>
          <span className="font-medium text-gray-900">{formatTime(lastSyncTime)}</span>
        </div>

        {/* Next Sync */}
        {syncEnabled && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Next sync:</span>
            </div>
            <span className="font-medium text-gray-900">{formatNextSync(nextSyncTime)}</span>
          </div>
        )}

        {/* Sync Result */}
        {lastSyncResult && (
          <div
            className={`flex items-start space-x-2 text-sm p-2 rounded-lg ${
              lastSyncResult.success
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {lastSyncResult.success ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              {lastSyncResult.success ? (
                <div>
                  <p className="font-medium">Sync completed successfully</p>
                  <p className="text-xs mt-1">
                    {lastSyncResult.eventsProcessed} events processed,
                    {lastSyncResult.eventsCreated > 0 && ` ${lastSyncResult.eventsCreated} created,`}
                    {lastSyncResult.eventsUpdated > 0 && ` ${lastSyncResult.eventsUpdated} updated,`}
                    {lastSyncResult.conflictsDetected > 0 && ` ${lastSyncResult.conflictsDetected} conflicts`}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Sync failed</p>
                  {lastSyncResult.errors?.length > 0 && (
                    <p className="text-xs mt-1">{lastSyncResult.errors[0]}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pending Conflicts */}
        {pendingConflicts.length > 0 && (
          <div className="flex items-start space-x-2 text-sm p-2 rounded-lg bg-orange-50 text-orange-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {pendingConflicts.length} conflict
                {pendingConflicts.length !== 1 ? 's' : ''} need
                {pendingConflicts.length === 1 ? 's' : ''} resolution
              </p>
              <p className="text-xs mt-1">Events were modified in both calendars</p>
            </div>
          </div>
        )}

        {/* Sync Disabled Warning */}
        {!syncEnabled && (
          <div className="flex items-start space-x-2 text-sm p-2 rounded-lg bg-gray-100 text-gray-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Automatic sync is disabled</p>
          </div>
        )}
      </div>
    </div>
  );
}
