import { defaultWeddingData } from '../defaultData';
import {
  getAllMemoriesDB,
  saveMemoryDB,
  saveBulkMemoriesDB,
  deleteMemoryDB,
  onMemoryBroadcast
} from './dbStorage';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// ─────────────────────────────────────────────────────────────────────────────
// Device ID (used for per-device like tracking)
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Merge local + remote memories without losing any photos
// ─────────────────────────────────────────────────────────────────────────────
export function mergeMemories(localList = [], remoteList = []) {
  const map = new Map();

  (defaultWeddingData.memories || []).forEach((m) => {
    if (m && m.id) map.set(m.id, { ...m });
  });

  if (Array.isArray(remoteList)) {
    remoteList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        map.set(m.id, { ...existing, ...m });
      }
    });
  }

  if (Array.isArray(localList)) {
    localList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        map.set(m.id, { ...existing, ...m });
      }
    });
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Supabase row → app memory object
// ─────────────────────────────────────────────────────────────────────────────
function rowToMemory(row) {
  return {
    id: row.id,
    guestName: row.guest_name,
    message: row.message,
    stripImage: row.strip_image,
    galleryPhotos: Array.isArray(row.gallery_photos) ? row.gallery_photos : [],
    likedIps: Array.isArray(row.liked_ips) ? row.liked_ips : [],
    likesCount: row.likes_count || 0,
    createdAt: row.created_at,
    templateId: row.template_id,
    frameColor: row.frame_color,
    stickerOverlay: row.sticker_overlay,
    filterName: row.filter_name,
  };
}

// Map app memory object → Supabase row
function memoryToRow(mem) {
  return {
    id: mem.id,
    guest_name: mem.guestName || mem.guest_name || '',
    message: mem.message || '',
    strip_image: mem.stripImage || mem.strip_image || null,
    gallery_photos: mem.galleryPhotos || mem.gallery_photos || [],
    liked_ips: mem.likedIps || mem.liked_ips || [],
    likes_count: mem.likesCount || mem.likes_count || 0,
    created_at: mem.createdAt || mem.created_at || new Date().toISOString(),
    template_id: mem.templateId || mem.template_id || null,
    frame_color: mem.frameColor || mem.frame_color || null,
    sticker_overlay: mem.stickerOverlay || mem.sticker_overlay || null,
    filter_name: mem.filterName || mem.filter_name || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all memories: Supabase first, fallback to IndexedDB
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchOnlineMemories() {
  // 1. Load local IndexedDB (always fast & offline-safe)
  let localMemories = [];
  try {
    localMemories = await getAllMemoriesDB();
  } catch (err) {
    console.warn('IndexedDB read error:', err);
  }

  let remoteMemories = [];

  // 2. Fetch from Supabase (cross-device cloud)
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && Array.isArray(data)) {
        remoteMemories = data.map(rowToMemory);
      } else if (error) {
        console.warn('Supabase fetch error:', error.message);
      }
    } catch (e) {
      console.warn('Supabase unreachable:', e);
    }
  }

  // 3. Merge: remote wins for shared data, local wins for user's own content
  const combined = mergeMemories(localMemories, remoteMemories);

  // 4. Update IndexedDB with fresh remote data in background
  if (remoteMemories.length > 0) {
    saveBulkMemoriesDB(remoteMemories).catch(() => {});
  }

  return combined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new guest memory to Supabase AND IndexedDB
// ─────────────────────────────────────────────────────────────────────────────
export async function saveMemoryOnline(newMemory) {
  if (!newMemory || !newMemory.id) return;

  // 1. Save to IndexedDB immediately (instant, offline-safe)
  await saveMemoryDB(newMemory);

  // 2. Upsert to Supabase (cloud, cross-device)
  if (isSupabaseConfigured && supabase) {
    try {
      const row = memoryToRow(newMemory);
      const { error } = await supabase
        .from('memories')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase save error:', error.message);
      }
    } catch (e) {
      console.warn('Supabase save exception:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle like/unlike — updates both IndexedDB and Supabase
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleLikeOnline(memoryId, isLiked) {
  const deviceId = getDeviceId();

  try {
    const all = await getAllMemoriesDB();
    const target = all.find((m) => m.id === memoryId);
    if (!target) return;

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

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('memories')
          .update({
            liked_ips: target.likedIps,
            likes_count: target.likesCount,
          })
          .eq('id', memoryId);
      } catch (e) {}
    }
  } catch (e) {
    console.warn('Like toggle error:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete a memory from Supabase
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteMemoryOnline(memoryId) {
  await deleteMemoryDB(memoryId);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('memories').delete().eq('id', memoryId);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Subscribe to Supabase Realtime for instant cross-device updates
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeToMemories(onNewMemory) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channel = supabase
    .channel('memories-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'memories' },
      (payload) => {
        if (payload.new) {
          const mem = rowToMemory(payload.new);
          saveMemoryDB(mem).catch(() => {});
          onNewMemory(mem);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export { onMemoryBroadcast };
