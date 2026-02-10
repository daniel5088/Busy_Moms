/**
 * Sync Engine
 * Processes offline queue when connectivity returns
 */

import NetInfo from '@react-native-community/netinfo';
import { offlineQueue, QueuedOperation } from './offlineQueue';
import { supabase } from './supabase';

type SyncEventListener = (event: SyncEvent) => void;

export interface SyncEvent {
  type: 'sync_start' | 'sync_progress' | 'sync_complete' | 'sync_error';
  operationId?: string;
  processed?: number;
  total?: number;
  error?: string;
}

class SyncEngine {
  private isProcessing = false;
  private listeners: Set<SyncEventListener> = new Set();

  /**
   * Initialize sync engine and listen for connectivity changes
   */
  initialize(): void {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(listener: SyncEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /**
   * Process the offline queue (FIFO)
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.emit({ type: 'sync_start' });

    try {
      const pending = await offlineQueue.getPendingOperations();
      const total = pending.length;

      if (total === 0) {
        this.emit({ type: 'sync_complete', processed: 0, total: 0 });
        return;
      }

      let processed = 0;

      for (const operation of pending) {
        try {
          await this.processOperation(operation);
          await offlineQueue.markComplete(operation.id);
          processed++;

          this.emit({
            type: 'sync_progress',
            operationId: operation.id,
            processed,
            total,
          });
        } catch (error) {
          console.error('[SyncEngine] Error processing operation:', operation, error);
          await offlineQueue.markFailed(operation.id);

          this.emit({
            type: 'sync_error',
            operationId: operation.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      this.emit({ type: 'sync_complete', processed, total });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    const { table, operation: op, data } = operation;

    switch (op) {
      case 'INSERT':
        await supabase.from(table).insert(data);
        break;

      case 'UPDATE':
        if (!data.id) {
          throw new Error('UPDATE operation requires id field');
        }
        const { id, ...updateData } = data;
        await supabase.from(table).update(updateData).eq('id', id);
        break;

      case 'DELETE':
        if (!data.id) {
          throw new Error('DELETE operation requires id field');
        }
        await supabase.from(table).delete().eq('id', data.id);
        break;

      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  }

  /**
   * Check if currently processing
   */
  isProcessingQueue(): boolean {
    return this.isProcessing;
  }

  /**
   * Manually trigger queue processing
   */
  async triggerSync(): Promise<void> {
    await this.processQueue();
  }
}

// Export singleton instance
export const syncEngine = new SyncEngine();
