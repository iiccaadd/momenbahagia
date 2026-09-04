import { defaultWeddingData } from '../defaultData';
import {
  getAllMemoriesDB,
  saveMemoryDB,
  saveBulkMemoriesDB,
  deleteMemoryDB,
  onMemoryBroadcast
} from './dbStorage';

// Generate or retrieve persistent anonymous device ID for single like/unlike tracking
export function getDeviceId() {
  try {
    let id = localStorage.getItem('wedding_device_id');
    if (!id) {
      id = 'dev-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('wedding_device_id', id);
    }
    return id;
  } catch (e) {
    return 'dev-anon-' + Math.random().toString(36).substring(2, 9);
  }
}

/**
 * Merge local and remote memories without ever losing or overwriting user's photos
 */
export function mergeMemories(localList = [], remoteList = []) {
  const map = new Map();

  // 1. Seed with default template memories
  (defaultWeddingData.memories || []).forEach((m) => {
    if (m && m.id) map.set(m.id, { ...m });
  });

  // 2. Merge remote list
  if (Array.isArray(remoteList)) {
    remoteList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        map.set(m.id, { ...existing, ...m });
      }
    });
  }

  // 3. Merge local list (highest priority for user's created content)
  if (Array.isArray(localList)) {
    localList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        map.set(m.id, { ...existing, ...m });
      }
    });
  }

  const result = Array.from(map.values());
  // Sort latest first
  result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return result;
}

/**
 * Fetch memories from IndexedDB, serverless backend, and local storage
 */
export async function fetchOnlineMemories() {
  // 1. Always load local IndexedDB first (lightning-fast, 100% persistent)
  let localMemories = [];
  try {
    localMemories = await getAllMemoriesDB();
  } catch (err) {
    console.warn('Error reading from IndexedDB:', err);
  }

  let remoteMemories = [];

  // 2. Attempt fetching from Backend API / Vercel Serverless
  try {
    const res = await fetch('/api/memories', { cache: 'no-store' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          remoteMemories = json.data;
        }
      }
    }
  } catch (e) {
    // API not available or offline
  }

  // 3. Merge memories safely so no photos are ever wiped out
  const combined = mergeMemories(localMemories, remoteMemories);

  // 4. Update IndexedDB in background
  if (remoteMemories.length > 0) {
    saveBulkMemoriesDB(remoteMemories).catch(() => {});
  }

  return combined;
}

/**
 * Save new guest memory to IndexedDB and broadcast online
 */
export async function saveMemoryOnline(newMemory) {
  if (!newMemory || !newMemory.id) return;

  // 1. Save to IndexedDB immediately (instant persistence)
  await saveMemoryDB(newMemory);

  // 2. Send to Backend API / Serverless endpoint
  try {
    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMemory)
    });
  } catch (e) {
    console.warn('API post error (local saved):', e);
  }
}

/**
 * Toggle Love / Unlove per device and sync
 */
export async function toggleLikeOnline(memoryId, isLiked) {
  const deviceId = getDeviceId();

  try {
    const all = await getAllMemoriesDB();
    const target = all.find((m) => m.id === memoryId);
    if (target) {
      if (!Array.isArray(target.likedIps)) target.likedIps = [];
      const hasId = target.likedIps.includes(deviceId);

      if (isLiked && !hasId) {
        target.likedIps.push(deviceId);
        target.likesCount = (target.likesCount || 0) + 1;
      } else if (!isLiked && hasId) {
        target.likedIps = target.likedIps.filter((id) => id !== deviceId);
        target.likesCount = Math.max(0, (target.likesCount || 1) - 1);
      }

      await saveMemoryDB(target);

      try {
        await fetch(`/api/memories/${memoryId}/like`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isLiked, deviceId })
        });
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Like toggle sync warning:', e);
  }
}

export { onMemoryBroadcast };
