
/**
 * Safe Storage Utility
 * Prevents "SecurityError: The operation is insecure" by providing
 * an in-memory fallback when localStorage is blocked or unavailable.
 */

const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Storage Access Blocked: Falling back to memory for key "${key}"`);
      return memoryStorage[key] || null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Storage Write Blocked: Falling back to memory for key "${key}"`);
      memoryStorage[key] = value;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      delete memoryStorage[key];
    }
  },

  clear: (): void => {
    try {
      localStorage.clear();
    } catch (e) {
      for (const key in memoryStorage) {
        delete memoryStorage[key];
      }
    }
  }
};
