import { defaultWeddingData } from '../defaultData';

const CLOUD_OBJECT_ID = 'ff808181a067127101a06b5fb5520d38';
const CLOUD_API_URL = `https://api.restful-api.dev/objects/${CLOUD_OBJECT_ID}`;

// Generate or retrieve persistent anonymous device ID for like/unlike tracking
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
 * Fetch all memories from online cloud store and local server
 */
export async function fetchOnlineMemories() {
  let cloudMemories = null;

  // 1. Fetch from Global Cloud Database (Works across all devices on Vercel & Mobile)
  try {
    const res = await fetch(CLOUD_API_URL, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.memories && Array.isArray(json.data.memories)) {
        cloudMemories = json.data.memories;
      }
    }
  } catch (e) {
    console.warn('Cloud store fetch error:', e);
  }

  // 2. Fetch from Local Express Server if available
  try {
    const localRes = await fetch('/api/memories', { cache: 'no-store' });
    if (localRes.ok) {
      const localJson = await localRes.json();
      if (localJson.success && Array.isArray(localJson.data)) {
        if (!cloudMemories) {
          cloudMemories = localJson.data;
        } else {
          // Merge both
          const map = new Map(cloudMemories.map((m) => [m.id, m]));
          localJson.data.forEach((m) => map.set(m.id, m));
          cloudMemories = Array.from(map.values());
        }
      }
    }
  } catch (e) {
    // Local express not running, normal on Vercel
  }

  // 3. Fallback to LocalStorage + Default Memories if offline
  if (!cloudMemories || cloudMemories.length === 0) {
    try {
      const cached = JSON.parse(localStorage.getItem('wedding_memories') || '[]');
      if (Array.isArray(cached) && cached.length > 0) {
        cloudMemories = cached;
      }
    } catch (e) {}
  }

  if (!cloudMemories || cloudMemories.length === 0) {
    cloudMemories = defaultWeddingData.memories || [];
  }

  // Ensure latest sorted by createdAt descending
  cloudMemories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  try {
    localStorage.setItem('wedding_memories', JSON.stringify(cloudMemories));
  } catch (e) {}

  return cloudMemories;
}

/**
 * Broadcast & Save new Memory to online cloud store, server, and local storage
 */
export async function saveMemoryOnline(newMemory) {
  if (!newMemory) return;

  // 1. Immediately update localStorage
  try {
    const existing = JSON.parse(localStorage.getItem('wedding_memories') || '[]');
    const updated = [newMemory, ...existing.filter((m) => m.id !== newMemory.id)];
    localStorage.setItem('wedding_memories', JSON.stringify(updated));
  } catch (e) {}

  // 2. Push to Global Cloud Store
  try {
    const curMemories = await fetchOnlineMemories();
    const updatedCloud = [newMemory, ...curMemories.filter((m) => m.id !== newMemory.id)];
    
    await fetch(CLOUD_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'wedding_photobooth_momenbahagia_adisty_irsyad',
        data: { memories: updatedCloud }
      })
    });
  } catch (e) {
    console.warn('Failed pushing to cloud store:', e);
  }
}

/**
 * Toggle Love / Unlove online
 */
export async function toggleLikeOnline(memoryId, isLiked) {
  const deviceId = getDeviceId();

  try {
    const curMemories = await fetchOnlineMemories();
    const target = curMemories.find((m) => m.id === memoryId);
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

      await fetch(CLOUD_API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'wedding_photobooth_momenbahagia_adisty_irsyad',
          data: { memories: curMemories }
        })
      });
    }
  } catch (e) {
    console.warn('Failed syncing like to cloud store:', e);
  }
}
