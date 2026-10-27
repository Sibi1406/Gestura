import type { StateStorage } from 'zustand/middleware';

export function deduplicatingStorage(storage: StateStorage): StateStorage {
  const cached = new Map<string, string>();
  return {
    getItem: (name) => {
      const value = storage.getItem(name);
      if (typeof value === 'string') cached.set(name, value);
      else cached.delete(name);
      return value;
    },
    setItem: (name, value) => {
      if (cached.get(name) === value) return;
      cached.set(name, value);
      storage.setItem(name, value);
    },
    removeItem: (name) => {
      cached.delete(name);
      storage.removeItem(name);
    },
  };
}
