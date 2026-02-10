/**
 * Offline Sync Hook
 * Manages offline queue and sync status
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../lib/offlineQueue';
import { syncEngine, SyncEvent } from '../lib/syncEngine';
import { useNetworkStatus } from './useNetworkStatus';

export interface OfflineSyncStatus {
  pendingOperations: number;
  isProcessing: boolean;
  lastSyncTime: Date | null;
  processQueue: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncStatus {
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { isConnected } = useNetworkStatus();

  // Load pending count on mount
  useEffect(() => {
    loadPendingCount();
  }, []);

  // Auto-process when coming back online
  useEffect(() => {
    if (isConnected && pendingOperations > 0) {
      processQueue();
    }
  }, [isConnected]);

  // Listen to sync events
  useEffect(() => {
    const unsubscribe = syncEngine.addEventListener((event: SyncEvent) => {
      switch (event.type) {
        case 'sync_start':
          setIsProcessing(true);
          break;

        case 'sync_complete':
          setIsProcessing(false);
          setLastSyncTime(new Date());
          loadPendingCount();
          break;

        case 'sync_error':
          // Keep processing true, will be set to false on sync_complete
          break;
      }
    });

    return unsubscribe;
  }, []);

  const loadPendingCount = useCallback(async () => {
    const count = await offlineQueue.getPendingCount();
    setPendingOperations(count);
  }, []);

  const processQueue = useCallback(async () => {
    await syncEngine.triggerSync();
  }, []);

  return {
    pendingOperations,
    isProcessing,
    lastSyncTime,
    processQueue,
  };
}
