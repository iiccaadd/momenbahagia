import { defaultWeddingData } from '../defaultData';
import {
  getAllMemoriesDB,
  saveMemoryDB,
  saveBulkMemoriesDB,
  deleteMemoryDB,
  onMemoryBroadcast
} from './dbStorage';
import {
  supabase,
  isSupabaseConfigured,
  getSupabaseClient,
  getSupabaseCredentials
} from './supabaseClient';

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

        const strip = m.stripUrl || m.stripImage || null;
        const msg = m.message || m.guestMessage || '';
        const audio = m.audioUrl || m.audio_url || null;
        const audioDur = m.audioDuration || m.audio_duration || 0;

        map.set(m.id, {
          ...m,
          stripUrl: strip,
          stripImage: strip,
          message: msg,
          guestMessage: msg,
          audioUrl: audio,
          audioDuration: audioDur,
        });
      }
    });
  }

  // 3. Remote memories merge with local (preserve valid local images/audio if remote field is empty)
  if (Array.isArray(remoteList)) {
    remoteList.forEach((m) => {
      if (m && m.id) {
        const existing = map.get(m.id) || {};
        const strip = m.stripImage || m.stripUrl || existing.stripImage || existing.stripUrl || null;
        const msg = m.message || m.guestMessage || existing.message || existing.guestMessage || '';
        const audio = m.audioUrl || m.audio_url || existing.audioUrl || existing.audio_url || null;
        const audioDur = m.audioDuration || m.audio_duration || existing.audioDuration || existing.audio_duration || 0;

        map.set(m.id, {
          ...existing,
          ...m,
          stripUrl: strip,
          stripImage: strip,
          message: msg,
          guestMessage: msg,
          audioUrl: audio,
          audioDuration: audioDur,
        });
      }
    });
  }

  const result = Array.from(map.values());
  result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return result;
}

// Map database / backend row -> app memory object
function rowToMemory(row) {
  const strip = row.strip_image || row.strip_url || row.stripUrl || row.stripImage || row.image_url || row.photo_url || row.strip || null;
  const msg = row.message || row.guest_message || row.guestMessage || '';
  const audio = row.audio_url || row.audioUrl || row.audio || null;
  const audioDur = Number(row.audio_duration || row.audioDuration || 0);

  return {
    id: String(row.id),
    guestName: row.guest_name || row.guestName || 'Tamu Spesial',
    message: msg,
    guestMessage: msg,
    stripImage: strip,
    stripUrl: strip,
    audioUrl: audio,
    audioDuration: audioDur,
    galleryPhotos: Array.isArray(row.gallery_photos) ? row.gallery_photos : (Array.isArray(row.galleryPhotos) ? row.galleryPhotos : []),
    likedIps: Array.isArray(row.liked_ips) ? row.liked_ips : (Array.isArray(row.likedIps) ? row.likedIps : []),
    likesCount: Number(row.likes_count || row.likesCount || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    templateId: row.template_id || row.templateId || 'classic',
    frameColor: row.frame_color || row.frameColor || null,
    stickerOverlay: row.sticker_overlay || row.stickerOverlay || null,
    filterName: row.filter_name || row.filterName || null,
  };
}

// Map app memory object -> database row
function memoryToRow(mem) {
  const strip = mem.stripImage || mem.stripUrl || null;
  const msg = mem.message || mem.guestMessage || '';
  const audio = mem.audioUrl || mem.audio_url || null;
  const audioDur = Number(mem.audioDuration || mem.audio_duration || 0);

  return {
    id: String(mem.id),
    guest_name: String(mem.guestName || mem.guest_name || 'Tamu Spesial').trim(),
    message: msg,
    strip_image: strip,
    strip_url: strip,
    audio_url: audio,
    audio_duration: audioDur,
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

  const client = getSupabaseClient();
  const creds = getSupabaseCredentials();

  if (creds.isConfigured && client) {
    try {
      const { data, error } = await client
        .from('memories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(300);

      if (!error && Array.isArray(data)) {
        remoteMemories = data.map(rowToMemory);
        isCloudConnected = true;
      } else if (error) {
        console.warn('[Sync] Supabase fetch error:', error.message);
        if (error.code === 'PGRST204' || error.message?.includes('guest_name') || error.code === '42P01') {
          schemaError = 'Tabel memories di Supabase belum sesuai atau belum dibuat. Silakan jalankan script supabase_schema.sql di SQL Editor Supabase.';
          console.error('[Sync CRITICAL SCHEMA ERROR]', schemaError);
        }
      }
    } catch (e) {
      console.warn('[Sync] Supabase unreachable:', e.message);
    }
  }

  // 2. Also fetch from local Backend API if available (concurrently npm run server)
  try {
    const res = await fetch('/api/memories', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        const backendMems = json.data.map(rowToMemory);
        remoteMemories = [...backendMems, ...remoteMemories];
      }
    }
  } catch (e) {
    // API server offline or not running (e.g. client-only mode)
  }

  const combined = mergeMemories(localMemories, remoteMemories);

  if (remoteMemories.length > 0) {
    saveBulkMemoriesDB(remoteMemories).catch(() => {});
  }

  return { memories: combined, isCloudConnected, schemaError };
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new memory to BOTH Supabase (cloud), Backend API, and IndexedDB (local cache)
// ─────────────────────────────────────────────────────────────────────────────
export async function saveMemoryOnline(newMemory) {
  if (!newMemory || !newMemory.id) return { success: false, error: 'Invalid memory' };

  // 1. Save to IndexedDB immediately (instant offline cache)
  try {
    await saveMemoryDB(newMemory);
  } catch (e) {
    console.warn('[Sync] IndexedDB save warning:', e);
  }

  // 2. Send to local Backend API if running (Express + Socket.io)
  try {
    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: newMemory.guestName,
        guestMessage: newMemory.message || newMemory.guestMessage,
        templateId: newMemory.templateId,
        stripDataUrl: newMemory.stripImage || newMemory.stripUrl,
        audioDataUrl: newMemory.audioUrl,
        audioDuration: newMemory.audioDuration,
      })
    });
  } catch (e) {
    // Local server offline or hosted client-only
  }

  // 3. Upload to Supabase (cross-device cloud storage)
  const client = getSupabaseClient();
  const creds = getSupabaseCredentials();

  if (creds.isConfigured && client) {
    try {
      const row = memoryToRow(newMemory);

      const { data, error } = await client
        .from('memories')
        .insert(row)
        .select();

      if (error) {
        // If conflict error (duplicate key), try update
        if (error.code === '23505') {
          const { error: updateErr } = await client
            .from('memories')
            .update(row)
            .eq('id', row.id);

          if (updateErr) {
            console.error('[Sync] Supabase update error:', updateErr);
            return { success: false, isCloudSaved: false, error: updateErr.message, code: updateErr.code };
          }
          return { success: true, isCloudSaved: true };
        }

        console.error('[Sync] Supabase insert error:', error);
        return { success: false, isCloudSaved: false, error: error.message, code: error.code };
      }

      console.log('[Sync] Memory saved to Supabase cloud successfully:', row.id);
      return { success: true, isCloudSaved: true };
    } catch (e) {
      console.error('[Sync] Supabase save exception:', e);
      return { success: false, isCloudSaved: false, error: e.message };
    }
  }

  return {
    success: true,
    isCloudSaved: false,
    warning: 'Foto tersimpan secara lokal di perangkat ini. Hubungkan database Supabase di Admin Panel agar foto otomatis tersinkronisasi ke seluruh HP tamu.'
  };
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

    const client = getSupabaseClient();
    const creds = getSupabaseCredentials();

    if (creds.isConfigured && client) {
      try {
        await client
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

  const client = getSupabaseClient();
  const creds = getSupabaseCredentials();

  if (creds.isConfigured && client) {
    try {
      await client.from('memories').delete().eq('id', memoryId);
    } catch (e) {
      console.warn('[Sync] Supabase delete error:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Realtime — instant multi-device sync
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeToMemories(callbacks = {}) {
  let activeChannel = null;

  const { onNewMemory, onUpdateMemory, onDeleteMemory } = typeof callbacks === 'function'
    ? { onNewMemory: callbacks }
    : callbacks;

  const connectRealtime = () => {
    const client = getSupabaseClient();
    const creds = getSupabaseCredentials();

    if (!creds.isConfigured || !client) {
      console.warn('[Realtime] Supabase belum dikonfigurasi. Menunggu konfigurasi cloud.');
      return;
    }

    if (activeChannel) {
      try { client.removeChannel(activeChannel); } catch (e) {}
      activeChannel = null;
    }

    activeChannel = client
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
  };

  connectRealtime();

  // Dengar perubahan kredensial jika user menyimpan di Admin Panel
  const onConfigChanged = () => {
    console.log('[Realtime] Supabase config changed, reconnecting...');
    connectRealtime();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('wedding-cloud-sync-changed', onConfigChanged);
  }

  return () => {
    const client = getSupabaseClient();
    if (activeChannel && client) {
      client.removeChannel(activeChannel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('wedding-cloud-sync-changed', onConfigChanged);
    }
  };
}

export { onMemoryBroadcast };
