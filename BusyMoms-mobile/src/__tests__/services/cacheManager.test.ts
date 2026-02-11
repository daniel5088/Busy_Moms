import { cacheManager } from '../../lib/cacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('CacheManager', () => {
  beforeEach(async () => {
    // Clear AsyncStorage before each test
    await AsyncStorage.clear();
    // Reset cache state
    (cacheManager as any).metadata = new Map();
    (cacheManager as any).isInitialized = false;
  });

  describe('set and get', () => {
    it('should store and retrieve data', async () => {
      await cacheManager.set('test-key', { value: 'test-data' });

      const result = await cacheManager.get('test-key');
      expect(result).toEqual({ value: 'test-data' });
    });

    it('should handle string data', async () => {
      await cacheManager.set('string-key', 'Hello World');

      const result = await cacheManager.get<string>('string-key');
      expect(result).toBe('Hello World');
    });

    it('should handle number data', async () => {
      await cacheManager.set('number-key', 42);

      const result = await cacheManager.get<number>('number-key');
      expect(result).toBe(42);
    });

    it('should handle array data', async () => {
      const data = [1, 2, 3, 4, 5];
      await cacheManager.set('array-key', data);

      const result = await cacheManager.get<number[]>('array-key');
      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheManager.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should return data within TTL', async () => {
      await cacheManager.set('ttl-key', 'valid-data', 10000); // 10 seconds

      const result = await cacheManager.get('ttl-key');
      expect(result).toBe('valid-data');
    });

    it('should return null for expired data', async () => {
      // Set with 1ms TTL
      await cacheManager.set('expired-key', 'old-data', 1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await cacheManager.get('expired-key');
      expect(result).toBeNull();
    });

    it('should persist data without TTL indefinitely', async () => {
      await cacheManager.set('permanent-key', 'permanent-data');

      const result = await cacheManager.get('permanent-key');
      expect(result).toBe('permanent-data');
    });
  });

  describe('invalidate', () => {
    it('should remove specific cache entry', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');

      await cacheManager.invalidate('key1');

      const result1 = await cacheManager.get('key1');
      const result2 = await cacheManager.get('key2');

      expect(result1).toBeNull();
      expect(result2).toBe('value2');
    });

    it('should not throw error for non-existent key', async () => {
      await expect(cacheManager.invalidate('non-existent')).resolves.not.toThrow();
    });
  });

  describe('invalidatePrefix', () => {
    it('should remove all entries with matching prefix', async () => {
      await cacheManager.set('user:1', { name: 'Alice' });
      await cacheManager.set('user:2', { name: 'Bob' });
      await cacheManager.set('post:1', { title: 'Post 1' });

      await cacheManager.invalidatePrefix('user:');

      const user1 = await cacheManager.get('user:1');
      const user2 = await cacheManager.get('user:2');
      const post1 = await cacheManager.get('post:1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(post1).toEqual({ title: 'Post 1' });
    });
  });

  describe('clearAll', () => {
    it('should remove all cache entries', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      await cacheManager.set('key3', 'value3');

      await cacheManager.clearAll();

      const result1 = await cacheManager.get('key1');
      const result2 = await cacheManager.get('key2');
      const result3 = await cacheManager.get('key3');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });
  });

  describe('getTotalSize', () => {
    it('should return 0 for empty cache', async () => {
      const size = await cacheManager.getTotalSize();
      expect(size).toBe(0);
    });

    it('should calculate total cache size', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');

      const size = await cacheManager.getTotalSize();
      expect(size).toBeGreaterThan(0);
    });
  });

  describe('persistence', () => {
    it('should persist metadata to AsyncStorage', async () => {
      await cacheManager.set('test-key', { data: 'test' });

      const metadata = await AsyncStorage.getItem('@cache_metadata');
      expect(metadata).toBeTruthy();

      const parsed = JSON.parse(metadata || '[]');
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should reload metadata on initialization', async () => {
      await cacheManager.set('persistent-key', 'persistent-value');

      // Create new instance (simulated by resetting isInitialized)
      (cacheManager as any).isInitialized = false;
      (cacheManager as any).metadata = new Map();

      const result = await cacheManager.get('persistent-key');
      expect(result).toBe('persistent-value');
    });
  });
});
