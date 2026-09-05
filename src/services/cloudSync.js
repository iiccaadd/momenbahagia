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
// Merge memories: REMOTE (Supabase) always wins over local defaults.
// Local-only memories (uploaded by THIS device before cloud sync) are preserved.
// ─────────────────────────────────────────────────────────────────────────────
export function mergeMemories(localList = [], remoteList = []) {
  const map = new Map();

  // 1. Start with built-in template memories as baseline
  (defaultWeddingData.memories || []).forEach((m) => {
    if (m && m.id) map.set(m.id, { ...m, _source: 'default' });
  });

  // 2. Layer in local memories (uploaded on this device, not yet in cloud)
  if (Array.isArray(localList)) {
    localList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        // Only keep local if it's not a default template item
        map.set(m.id, { ...existing, ...m, _source: existing._source === 'default' ? 'default' : 'local' });
      }
    });
  }

  // 3. Remote (Supabase) always wins — it's the source of truth across devices
  if (Array.isArray(remoteList)) {
    remoteList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        map.set(m.id, { ...existing, ...m, _source: 'remote' });
      }
    });
  }

  // 4. Filter out default template items if we have real remote data
  const hasRemoteData = remoteList.length > 0;
  const result = Array.from(map.values()).filter((m) => {
    // Keep defaults only if there is no remote data at all
    if (m._source === 'default' && hasRemoteData) return false;
    return true;
  });

  // Sort newest first
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
    gallery_photos: Array.isArray(mem.galleryPhotos) ? mem.galleryPhotos : (mem.gallery_photos || []),
    liked_ips: Array.isArray(mem.likedIps) ? mem.likedIps : (mem.liked_ips || []),
    likes_count: mem.likesCount || mem.likes_count || 0,
    created_at: mem.createdAt || mem.created_at || new Date().toISOString(),
    template_id: mem.templateId || mem.template_id || null,
    frame_color: mem.frameColor || mem.frame_color || null,
    sticker_overlay: mem.stickerOverlay || mem.sticker_overlay || null,
    filter_name: mem.filterName || mem.filter_name || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all memories: Supabase (cloud) + IndexedDB (local offline cache)
// Returns { memories, isCloudConnected }
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchOnlineMemories() {
  // 1. Load local IndexedDB (fast, offline-safe)
  let localMemories = [];
  try {
    localMemories = await getAllMemoriesDB();
  } catch (err) {
    console.warn('[Sync] IndexedDB read error:', err);
  }

  let remoteMemories = [];
  let isCloudConnected = false;

  // 2. Fetch from Supabase — the cross-device source of truth
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data)) {
        remoteMemories = data.map(rowToMemory);
        isCloudConnected = true;
        console.log(`[Sync] Fetched ${remoteMemories.length} memories from Supabase`);
      } else if (error) {
        console.warn('[Sync] Supabase fetch error:', error.message);
      }
    } catch (e) {
      console.warn('[Sync] Supabase unreachable:', e.message);
    }
  } else {
    console.warn('[Sync] Supabase NOT configured. Cross-device sync disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  // 3. Merge: remote wins (latest source of truth), local preserved for offline
  const combined = mergeMemories(localMemories, remoteMemories);

  // 4. Cache remote data locally for offline access
  if (remoteMemories.length > 0) {
    saveBulkMemoriesDB(remoteMemories).catch(() => {});
  }

  return { memories: combined, isCloudConnected };
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new memory to BOTH Supabase (cloud) and IndexedDB (local cache)
// ─────────────────────────────────────────────────────────────────────────────
export async function saveMemoryOnline(newMemory) {
  if (!newMemory || !newMemory.id) return false;

  // 1. Save to IndexedDB immediately (offline-safe)
  await saveMemoryDB(newMemory);

  // 2. Upload to Supabase (cross-device cloud storage)
  if (isSupabaseConfigured && supabase) {
    try {
      const row = memoryToRow(newMemory);
      const { error } = await supabase
        .from('memories')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.warn('[Sync] Supabase save error:', error.message);
        return false;
      }
      console.log('[Sync] Memory saved to Supabase cloud:', newMemory.id);
      return true;
    } catch (e) {
      console.warn('[Sync] Supabase save exception:', e.message);
      return false;
    }
  }

  return false; // Supabase not configured
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle like/unlike — updates IndexedDB and Supabase
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

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('memories')
          .update({
            liked_ips: target.likedIps,
            likes_count: target.likesCount,
          })
          .eq('id', memoryId);
      } catch (e) {
        console.warn('[Sync] Like toggle Supabase error:', e);
      }
    }
  } catch (e) {
    console.warn('[Sync] Like toggle error:', e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete a memory from Supabase and local IndexedDB
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteMemoryOnline(memoryId) {
  await deleteMemoryDB(memoryId);

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('memories').delete().eq('id', memoryId);
    } catch (e) {
      console.warn('[Sync] Supabase delete error:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Realtime — instant push when ANY device inserts a new memory
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeToMemories(onNewMemory) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Realtime] Supabase not configured. Realtime sync unavailable.');
    return () => {};
  }

  const channel = supabase
    .channel('public:memories')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'memories' },
      (payload) => {
        if (payload.new) {
          const mem = rowToMemory(payload.new);
          console.log('[Realtime] New memory received from cloud:', mem.id);
          saveMemoryDB(mem).catch(() => {});
          onNewMemory(mem);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Supabase realtime connected ✓');
      } else {
        console.warn('[Realtime] Supabase realtime status:', status);
      }
    });

  return () => supabase.removeChannel(channel);
}

export { onMemoryBroadcast };
