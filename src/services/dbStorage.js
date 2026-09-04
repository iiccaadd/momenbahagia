/**
 * IndexedDB Persistent Storage Engine for Wedding Photobooth
 * Provides high-capacity, non-blocking local storage that never overflows browser quotas.
 */
import { defaultWeddingData } from '../defaultData';

const DB_NAME = 'wedding_photobooth_db';
const DB_VERSION = 1;
const STORE_NAME = 'memories';

// Tab-to-tab real-time sync channel
let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('wedding_memories_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve all memories stored in IndexedDB (fallback to localStorage and default data)
 */
export async function getAllMemoriesDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const items = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (items && items.length > 0) {
      items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return items;
    }
  } catch (err) {
    console.warn('IndexedDB read fallback to localStorage:', err);
  }

  try {
    const cached = JSON.parse(localStorage.getItem('wedding_memories') || '[]');
    if (Array.isArray(cached) && cached.length > 0) return cached;
  } catch (e) {}
  return defaultWeddingData.memories || [];
}

/**
 * Save or update a memory in IndexedDB and notify other tabs
 */
export async function saveMemoryDB(memory, broadcast = true) {
  if (!memory || !memory.id) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.put(memory);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Also mirror lightweight copy to localStorage if possible
    try {
      const existing = JSON.parse(localStorage.getItem('wedding_memories') || '[]');
      const updated = [memory, ...existing.filter((m) => m.id !== memory.id)];
      // Only keep latest 20 in localStorage to prevent quota overflow
      localStorage.setItem('wedding_memories', JSON.stringify(updated.slice(0, 20)));
    } catch (e) {
      // Suppress localStorage quota error since IndexedDB has the full copy
    }

    if (broadcast && broadcastChannel) {
      broadcastChannel.postMessage({ type: 'MEMORY_SAVED', memory });
    }
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
    try {
      const existing = JSON.parse(localStorage.getItem('wedding_memories') || '[]');
      const updated = [memory, ...existing.filter((m) => m.id !== memory.id)];
      localStorage.setItem('wedding_memories', JSON.stringify(updated.slice(0, 10)));
    } catch (e) {}
  }
}

/**
 * Save multiple memories in bulk into IndexedDB
 */
export async function saveBulkMemoriesDB(memories = []) {
  if (!Array.isArray(memories) || memories.length === 0) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const mem of memories) {
      if (mem && mem.id) {
        store.put(mem);
      }
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Bulk save to IndexedDB warning:', err);
  }
}

/**
 * Delete a memory from IndexedDB
 */
export async function deleteMemoryDB(id) {
  if (!id) return;

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    await new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    try {
      const existing = JSON.parse(localStorage.getItem('wedding_memories') || '[]');
      const updated = existing.filter((m) => m.id !== id);
      localStorage.setItem('wedding_memories', JSON.stringify(updated));
    } catch (e) {}

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'MEMORY_DELETED', id });
    }
  } catch (err) {
    console.error('Delete from IndexedDB error:', err);
  }
}

/**
 * Listen for cross-tab sync events
 */
export function onMemoryBroadcast(callback) {
  if (!broadcastChannel) return () => {};
  const handler = (event) => {
    if (event?.data && callback) {
      callback(event.data);
    }
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel.removeEventListener('message', handler);
  };
}
