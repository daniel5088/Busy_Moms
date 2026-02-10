/**
 * Cache Manager
 * Typed wrapper around AsyncStorage for caching data with TTL support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache_';
const CACHE_META_KEY = '@cache_metadata';
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB

interface CacheMetadata {
  key: string;
  size: number;
  expiresAt: number | null;
  lastAccessed: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number | null;
}

class CacheManager {
  private metadata: Map<string, CacheMetadata> = new Map();
  private isInitialized = false;

  /**
   * Initialize cache manager by loading metadata
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(CACHE_META_KEY);
      if (stored) {
        const metaArray: CacheMetadata[] = JSON.parse(stored);
        this.metadata = new Map(metaArray.map((m) => [m.key, m]));
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('[CacheManager] Error initializing:', error);
      this.metadata = new Map();
      this.isInitialized = true;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, data: T, ttlMs?: number): Promise<void> {
    await this.initialize();

    const cacheKey = CACHE_PREFIX + key;
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;

    const entry: CacheEntry<T> = {
      data,
      expiresAt,
    };

    try {
      const serialized = JSON.stringify(entry);
      await AsyncStorage.setItem(cacheKey, serialized);

      // Update metadata
      this.metadata.set(key, {
        key,
        size: serialized.length,
        expiresAt,
        lastAccessed: Date.now(),
      });

      await this.persistMetadata();
      await this.enforceSizeLimit();
    } catch (error) {
      console.error(`[CacheManager] Error setting cache for ${key}:`, error);
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    await this.initialize();

    const cacheKey = CACHE_PREFIX + key;

    try {
      const stored = await AsyncStorage.getItem(cacheKey);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check expiration
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await this.invalidate(key);
        return null;
      }

      // Update last accessed time
      const meta = this.metadata.get(key);
      if (meta) {
        meta.lastAccessed = Date.now();
        await this.persistMetadata();
      }

      return entry.data;
    } catch (error) {
      console.error(`[CacheManager] Error getting cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Invalidate (delete) a specific cache entry
   */
  async invalidate(key: string): Promise<void> {
    await this.initialize();

    const cacheKey = CACHE_PREFIX + key;

    try {
      await AsyncStorage.removeItem(cacheKey);
      this.metadata.delete(key);
      await this.persistMetadata();
    } catch (error) {
      console.error(`[CacheManager] Error invalidating cache for ${key}:`, error);
    }
  }

  /**
   * Invalidate all keys with a specific prefix
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    await this.initialize();

    const keysToDelete = Array.from(this.metadata.keys()).filter((key) =>
      key.startsWith(prefix)
    );

    await Promise.all(keysToDelete.map((key) => this.invalidate(key)));
  }

  /**
   * Clear all cache entries
   */
  async clearAll(): Promise<void> {
    await this.initialize();

    const keys = Array.from(this.metadata.keys());
    await Promise.all(keys.map((key) => this.invalidate(key)));
  }

  /**
   * Get total cache size in bytes
   */
  async getTotalSize(): Promise<number> {
    await this.initialize();

    let total = 0;
    for (const meta of this.metadata.values()) {
      total += meta.size;
    }
    return total;
  }

  /**
   * Enforce cache size limit by evicting LRU entries
   */
  private async enforceSizeLimit(): Promise<void> {
    const totalSize = await this.getTotalSize();

    if (totalSize <= MAX_CACHE_SIZE) return;

    // Sort by last accessed (LRU)
    const sortedEntries = Array.from(this.metadata.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );

    let currentSize = totalSize;
    for (const entry of sortedEntries) {
      if (currentSize <= MAX_CACHE_SIZE * 0.8) break; // Leave 20% buffer

      await this.invalidate(entry.key);
      currentSize -= entry.size;
    }
  }

  /**
   * Persist metadata to AsyncStorage
   */
  private async persistMetadata(): Promise<void> {
    try {
      const metaArray = Array.from(this.metadata.values());
      await AsyncStorage.setItem(CACHE_META_KEY, JSON.stringify(metaArray));
    } catch (error) {
      console.error('[CacheManager] Error persisting metadata:', error);
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
