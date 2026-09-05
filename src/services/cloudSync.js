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
// Merge memories:
// 1. Remote (Supabase) is the single source of truth for cross-device shared data.
// 2. Local memories uploaded on this device that haven't reached cloud yet are kept.
// 3. Default template items are ONLY kept if there is NO real data anywhere.
// ─────────────────────────────────────────────────────────────────────────────
export function mergeMemories(localList = [], remoteList = []) {
  const map = new Map();

  const hasRemoteData = Array.isArray(remoteList) && remoteList.length > 0;
  const hasLocalUploads = Array.isArray(localList) && localList.some((m) => {
    return m && m.id && !m.id.startsWith('mem-default') && !m.isDefault;
  });
  const hasAnyRealData = hasRemoteData || hasLocalUploads;

  // 1. If no real data at all, seed with default memories
  if (!hasAnyRealData) {
    (defaultWeddingData.memories || []).forEach((m) => {
      if (m && m.id) {
        map.set(m.id, {
          ...m,
          stripUrl: m.stripUrl || m.stripImage,
          stripImage: m.stripImage || m.stripUrl,
          message: m.message || m.guestMessage || '',
          guestMessage: m.guestMessage || m.message || '',
        });
      }
    });
  }

  // 2. Add local memories (device offline cache / newly uploaded)
  if (Array.isArray(localList)) {
    localList.forEach((m) => {
      if (m && m.id) {
        // Skip default items if we have real data
        const isDefaultItem = (defaultWeddingData.memories || []).some((d) => d.id === m.id);
        if (hasAnyRealData && isDefaultItem) return;

        map.set(m.id, {
          ...m,
          stripUrl: m.stripUrl || m.stripImage,
          stripImage: m.stripImage || m.stripUrl,
          message: m.message || m.guestMessage || '',
          guestMessage: m.guestMessage || m.message || '',
        });
      }
    });
  }

  // 3. Remote memories always overwrite local (source of truth across devices)
  if (Array.isArray(remoteList)) {
    remoteList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        map.set(m.id, {
          ...existing,
          ...m,
          stripUrl: m.stripUrl || m.stripImage,
          stripImage: m.stripImage || m.stripUrl,
          message: m.message || m.guestMessage || '',
          guestMessage: m.guestMessage || m.message || '',
        });
      }
    });
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return result;
}

// Map Supabase row -> app memory object
function rowToMemory(row) {
  const strip = row.strip_image || null;
  const msg = row.message || '';
  return {
    id: String(row.id),
    guestName: row.guest_name || 'Tamu Spesial',
    message: msg,
    guestMessage: msg,
    stripImage: strip,
    stripUrl: strip,
    galleryPhotos: Array.isArray(row.gallery_photos) ? row.gallery_photos : [],
    likedIps: Array.isArray(row.liked_ips) ? row.liked_ips : [],
    likesCount: Number(row.likes_count || 0),
    createdAt: row.created_at || new Date().toISOString(),
    templateId: row.template_id || 'classic',
    frameColor: row.frame_color || null,
    stickerOverlay: row.sticker_overlay || null,
    filterName: row.filter_name || null,
  };
}

// Map app memory object -> Supabase row
function memoryToRow(mem) {
  const strip = mem.stripImage || mem.stripUrl || null;
  const msg = mem.message || mem.guestMessage || '';
  return {
    id: String(mem.id),
    guest_name: String(mem.guestName || mem.guest_name || 'Tamu Spesial').trim(),
    message: msg,
    strip_image: strip,
    gallery_photos: Array.isArray(mem.galleryPhotos) ? mem.galleryPhotos : (mem.gallery_photos || []),
    liked_ips: Array.isArray(mem.likedIps) ? mem.likedIps : (mem.liked_ips || []),
    likes_count: Number(mem.likesCount || mem.likes_count || 0),
    created_at: mem.createdAt || mem.created_at || new Date().toISOString(),
    template_id: mem.templateId || mem.template_id || 'classic',
    frame_color: mem.frameColor || mem.frame_color || null,
    sticker_overlay: mem.stickerOverlay || mem.sticker_overlay || null,
    filter_name: mem.filterName || mem.filter_name || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all memories: Supabase (cloud) + IndexedDB (local offline cache)
// Returns { memories, isCloudConnected, schemaError }
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchOnlineMemories() {
  let localMemories = [];
  try {
    localMemories = await getAllMemoriesDB();
  } catch (err) {
    console.warn('[Sync] IndexedDB read error:', err);
  }

  let remoteMemories = [];
  let isCloudConnected = false;
  let schemaError = null;

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
      } else if (error) {
        console.warn('[Sync] Supabase fetch error:', error.message);
        if (error.code === 'PGRST204' || error.message?.includes('guest_name')) {
          schemaError = 'Kolom tabel memories di Supabase belum sesuai. Silakan jalankan SQL migrasi di SQL Editor Supabase.';
          console.error('[Sync CRITICAL SCHEMA ERROR]', schemaError);
        }
      }
    } catch (e) {
      console.warn('[Sync] Supabase unreachable:', e.message);
    }
  }

  const combined = mergeMemories(localMemories, remoteMemories);

  if (remoteMemories.length > 0) {
    saveBulkMemoriesDB(remoteMemories).catch(() => {});
  }

  return { memories: combined, isCloudConnected, schemaError };
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new memory to BOTH Supabase (cloud) and IndexedDB (local cache)
// ─────────────────────────────────────────────────────────────────────────────
export async function saveMemoryOnline(newMemory) {
  if (!newMemory || !newMemory.id) return { success: false, error: 'Invalid memory' };

  // 1. Save to IndexedDB immediately (instant offline cache)
  try {
    await saveMemoryDB(newMemory);
  } catch (e) {
    console.warn('[Sync] IndexedDB save warning:', e);
  }

  // 2. Upload to Supabase (cross-device cloud storage)
  if (isSupabaseConfigured && supabase) {
    try {
      const row = memoryToRow(newMemory);

      const { data, error } = await supabase
        .from('memories')
        .insert(row)
        .select();

      if (error) {
        // If conflict error (duplicate key), try update
        if (error.code === '23505') {
          const { error: updateErr } = await supabase
            .from('memories')
            .update(row)
            .eq('id', row.id);

          if (updateErr) {
            console.error('[Sync] Supabase update error:', updateErr);
            return { success: false, error: updateErr.message, code: updateErr.code };
          }
          return { success: true };
        }

        console.error('[Sync] Supabase insert error:', error);
        return { success: false, error: error.message, code: error.code };
      }

      console.log('[Sync] Memory saved to Supabase cloud successfully:', row.id);
      return { success: true };
    } catch (e) {
      console.error('[Sync] Supabase save exception:', e);
      return { success: false, error: e.message };
    }
  }

  return { success: false, error: 'Supabase not configured' };
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
// Supabase Realtime — instant multi-device sync
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeToMemories(callbacks = {}) {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Realtime] Supabase not configured. Realtime sync unavailable.');
    return () => {};
  }

  const { onNewMemory, onUpdateMemory, onDeleteMemory } = typeof callbacks === 'function'
    ? { onNewMemory: callbacks }
    : callbacks;

  const channel = supabase
    .channel('public-memories-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'memories' },
      (payload) => {
        console.log('[Realtime event]', payload.eventType, payload.new?.id || payload.old?.id);

        if (payload.eventType === 'INSERT' && payload.new) {
          const mem = rowToMemory(payload.new);
          saveMemoryDB(mem).catch(() => {});
          onNewMemory?.(mem);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          const mem = rowToMemory(payload.new);
          saveMemoryDB(mem).catch(() => {});
          onUpdateMemory?.(mem);
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const id = String(payload.old.id);
          deleteMemoryDB(id).catch(() => {});
          onDeleteMemory?.(id);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Connected to Supabase real-time channel ✓');
      } else {
        console.warn('[Realtime] Status change:', status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export { onMemoryBroadcast };
