import { offlineQueue } from '../../lib/offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('OfflineQueue', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
    // Reset queue state
    (offlineQueue as any).queue = [];
    (offlineQueue as any).isInitialized = false;
  });

  describe('enqueue', () => {
    it('should add operation to queue', async () => {
      const id = await offlineQueue.enqueue('events', 'INSERT', { title: 'Test Event' });

      expect(id).toBeTruthy();

      const pending = await offlineQueue.getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0]?.table).toBe('events');
      expect(pending[0]?.operation).toBe('INSERT');
      expect(pending[0]?.data).toEqual({ title: 'Test Event' });
    });

    it('should persist queue to AsyncStorage', async () => {
      await offlineQueue.enqueue('tasks', 'UPDATE', { id: '1', completed: true });

      const stored = await AsyncStorage.getItem('@offline_queue');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored || '[]');
      expect(parsed).toHaveLength(1);
    });

    it('should generate unique IDs', async () => {
      const id1 = await offlineQueue.enqueue('events', 'INSERT', {});
      const id2 = await offlineQueue.enqueue('events', 'INSERT', {});

      expect(id1).not.toBe(id2);
    });

    it('should set default status to pending', async () => {
      await offlineQueue.enqueue('contacts', 'DELETE', { id: '123' });

      const pending = await offlineQueue.getPendingOperations();
      expect(pending[0]?.status).toBe('pending');
    });
  });

  describe('getPendingOperations', () => {
    it('should return only pending operations', async () => {
      await offlineQueue.enqueue('events', 'INSERT', { title: 'Event 1' });
      await offlineQueue.enqueue('events', 'INSERT', { title: 'Event 2' });

      const pending = await offlineQueue.getPendingOperations();
      expect(pending).toHaveLength(2);
      expect(pending.every((op) => op.status === 'pending')).toBe(true);
    });

    it('should return empty array when queue is empty', async () => {
      const pending = await offlineQueue.getPendingOperations();
      expect(pending).toEqual([]);
    });
  });

  describe('markComplete', () => {
    it('should remove operation from queue', async () => {
      const id = await offlineQueue.enqueue('tasks', 'INSERT', { title: 'Task 1' });

      await offlineQueue.markComplete(id);

      const pending = await offlineQueue.getPendingOperations();
      expect(pending).toHaveLength(0);
    });

    it('should persist changes to AsyncStorage', async () => {
      const id = await offlineQueue.enqueue('events', 'INSERT', { title: 'Event 1' });
      await offlineQueue.markComplete(id);

      const stored = await AsyncStorage.getItem('@offline_queue');
      const parsed = JSON.parse(stored || '[]');
      expect(parsed).toHaveLength(0);
    });
  });

  describe('markFailed', () => {
    it('should increment retry count', async () => {
      const id = await offlineQueue.enqueue('tasks', 'INSERT', { title: 'Task 1' });

      await offlineQueue.markFailed(id);

      const all = await offlineQueue.getAllOperations();
      const op = all.find((o) => o.id === id);
      expect(op?.retryCount).toBe(1);
    });

    it('should mark as failed after max retries', async () => {
      const id = await offlineQueue.enqueue('tasks', 'INSERT', { title: 'Task 1' });

      // Fail 3 times (max retry count)
      await offlineQueue.markFailed(id);
      await offlineQueue.markFailed(id);
      await offlineQueue.markFailed(id);

      const all = await offlineQueue.getAllOperations();
      const op = all.find((o) => o.id === id);
      expect(op?.status).toBe('failed');
    });
  });

  describe('clearQueue', () => {
    it('should remove all operations', async () => {
      await offlineQueue.enqueue('events', 'INSERT', { title: 'Event 1' });
      await offlineQueue.enqueue('tasks', 'INSERT', { title: 'Task 1' });

      await offlineQueue.clearQueue();

      const all = await offlineQueue.getAllOperations();
      expect(all).toHaveLength(0);
    });

    it('should persist cleared state to AsyncStorage', async () => {
      await offlineQueue.enqueue('events', 'INSERT', { title: 'Event 1' });
      await offlineQueue.clearQueue();

      const stored = await AsyncStorage.getItem('@offline_queue');
      const parsed = JSON.parse(stored || '[]');
      expect(parsed).toHaveLength(0);
    });
  });
});
