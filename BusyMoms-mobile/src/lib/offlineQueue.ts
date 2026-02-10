/**
 * Offline Queue System
 * Stores and manages operations that need to be executed when connectivity returns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@offline_queue';
const MAX_RETRY_COUNT = 3;

export interface QueuedOperation {
  id: string;
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: Record<string, any>;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed';
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isInitialized = false;

  /**
   * Initialize the queue by loading from AsyncStorage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[OfflineQueue] Error initializing queue:', error);
      this.queue = [];
      this.isInitialized = true;
    }
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(
    table: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: Record<string, any>
  ): Promise<string> {
    await this.initialize();

    const queuedOp: QueuedOperation = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      table,
      operation,
      data,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    this.queue.push(queuedOp);
    await this.persist();

    return queuedOp.id;
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<QueuedOperation[]> {
    await this.initialize();
    return this.queue.filter((op) => op.status === 'pending');
  }

  /**
   * Get all operations (for debugging)
   */
  async getAllOperations(): Promise<QueuedOperation[]> {
    await this.initialize();
    return [...this.queue];
  }

  /**
   * Mark an operation as processing
   */
  async markProcessing(id: string): Promise<void> {
    await this.initialize();
    const op = this.queue.find((o) => o.id === id);
    if (op) {
      op.status = 'processing';
      await this.persist();
    }
  }

  /**
   * Mark an operation as complete and remove from queue
   */
  async markComplete(id: string): Promise<void> {
    await this.initialize();
    this.queue = this.queue.filter((op) => op.id !== id);
    await this.persist();
  }

  /**
   * Mark an operation as failed and increment retry count
   */
  async markFailed(id: string): Promise<void> {
    await this.initialize();
    const op = this.queue.find((o) => o.id === id);
    if (op) {
      op.retryCount += 1;
      op.status = op.retryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
      await this.persist();
    }
  }

  /**
   * Remove an operation from the queue
   */
  async remove(id: string): Promise<void> {
    await this.initialize();
    this.queue = this.queue.filter((op) => op.id !== id);
    await this.persist();
  }

  /**
   * Clear all failed operations
   */
  async clearFailed(): Promise<void> {
    await this.initialize();
    this.queue = this.queue.filter((op) => op.status !== 'failed');
    await this.persist();
  }

  /**
   * Clear entire queue
   */
  async clear(): Promise<void> {
    await this.initialize();
    this.queue = [];
    await this.persist();
  }

  /**
   * Get count of pending operations
   */
  async getPendingCount(): Promise<number> {
    await this.initialize();
    return this.queue.filter((op) => op.status === 'pending').length;
  }

  /**
   * Persist queue to AsyncStorage
   */
  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Error persisting queue:', error);
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
