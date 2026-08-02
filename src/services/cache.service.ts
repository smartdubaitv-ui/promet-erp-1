import { isPostgresConnected } from '../../services/postgres.service';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();

  /**
   * Get a value from the cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in the cache with a Time-To-Live in seconds (default 10 minutes)
   */
  async set(key: string, value: any, ttlSeconds = 600): Promise<void> {
    const expiresAt = ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null;
    this.memoryCache.set(key, { value, expiresAt });
  }

  /**
   * Delete a key from the cache
   */
  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g., "products:")
   */
  async invalidatePrefix(prefix: string): Promise<void> {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Flush all keys
   */
  async flushAll(): Promise<void> {
    this.memoryCache.clear();
  }

  /**
   * Get stats for real-time monitoring
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    const keys: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        expiredCount++;
      } else {
        keys.push(key);
      }
    }

    return {
      totalKeys: this.memoryCache.size - expiredCount,
      expiredKeysCount: expiredCount,
      activeKeys: keys,
      driver: 'In-Memory (LRU Optimized)'
    };
  }
}

export const cacheService = new CacheService();
