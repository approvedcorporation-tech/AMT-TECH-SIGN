
/**
 * Safe Fetching Service with Caching
 * Prevents API rate limiting and improves offline stability.
 */
import { safeStorage } from '../lib/safeStorage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_PREFIX = 'hardy_cache_';

export const safeFetch = async <T>(
  key: string,
  url: string,
  ttlSeconds: number = 300, // Default 5 minutes
  fallbackData?: T
): Promise<T | null> => {
  const cacheKey = CACHE_PREFIX + key;
  const now = Date.now();

  // 1. Try Local Storage Cache
  try {
    const cachedStr = safeStorage.getItem(cacheKey);
    if (cachedStr) {
      const entry: CacheEntry<T> = JSON.parse(cachedStr);
      if (now - entry.timestamp < ttlSeconds * 1000) {
        // Cache hit and valid
        return entry.data;
      }
    }
  } catch (e) {
    console.warn('Cache read error', e);
  }

  // 2. Try Network Fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();

    // 3. Save to Cache
    try {
      const entry: CacheEntry<T> = { data, timestamp: now };
      safeStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache write error', e);
    }

    return data;
  } catch (error) {
    console.error(`Fetch failed for ${key}:`, error);
    
    // 4. Return Stale Cache if available (even if expired)
    try {
        const cachedStr = safeStorage.getItem(cacheKey);
        if (cachedStr) {
            const entry: CacheEntry<T> = JSON.parse(cachedStr);
            console.warn(`Returning stale data for ${key}`);
            return entry.data;
        }
    } catch (e) {}

    // 5. Return Fallback
    return fallbackData || null;
  }
};
