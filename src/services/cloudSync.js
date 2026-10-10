import {
  getAllMemoriesDB,
  saveMemoryDB,
  saveBulkMemoriesDB,
  deleteMemoryDB,
  clearAllMemoriesDB,
  isDummyMemory,
  onMemoryBroadcast
} from './dbStorage.js';
import {
  getSupabaseClient,
  getRealtimeClient,
  getSupabaseCredentials,
  uploadMedia,
  viaProxy
} from './supabaseClient.js';

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

  // If both are empty, return []
  if ((!localList || localList.length === 0) && (!remoteList || remoteList.length === 0)) {
    return [];
  }

  // 1. Add local memories (device offline cache / newly uploaded)
  if (Array.isArray(localList)) {
    localList.forEach((m) => {
      if (m && m.id) {
        // Filter out legacy dummy memories
        if (isDummyMemory(m)) return;

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

  // 2. Remote memories merge with local (preserve valid local images/audio if remote field is empty)
  if (Array.isArray(remoteList)) {
    remoteList.forEach((m) => {
      if (m && m.id) {
        // Filter out legacy dummy memories
        if (isDummyMemory(m)) return;

        const existing = map.get(m.id) || {};
        const isExistingStripValid = existing.stripImage && existing.stripImage.length > 50 && existing.stripImage !== 'data:,';
        const isRemoteStripValid = m.stripImage && m.stripImage.length > 50 && m.stripImage !== 'data:,';
        const strip = isRemoteStripValid ? m.stripImage : (isExistingStripValid ? existing.stripImage : (m.stripUrl || existing.stripUrl || null));
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
  result.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return result;
}

// Map database / backend row -> app memory object
function rowToMemory(row) {
  if (!row || isDummyMemory(row)) return null;

  let strip = row.strip_image || row.strip_url || row.stripUrl || row.stripImage || row.image_url || row.photo_url || row.strip || null;
  // If strip is invalid (e.g. "data:," or too short or whitespace), treat as null
  if (strip && (typeof strip !== 'string' || strip.length < 50 || strip === 'data:,' || !strip.trim())) {
    strip = null;
  }
  const msg = row.message || row.guest_message || row.guestMessage || '';
  const audio = row.audio_url || row.audioUrl || row.audio || null;
  const audioDur = Number(row.audio_duration || row.audioDuration || 0);

  return {
    id: String(row.id),
    guestName: row.guest_name || row.guestName || 'Tamu Spesial',
    message: msg,
    guestMessage: msg,
    stripImage: viaProxy(strip),
    stripUrl: viaProxy(strip),
    audioUrl: viaProxy(audio),
    audioDuration: audioDur,
    galleryPhotos: Array.isArray(row.gallery_photos) ? row.gallery_photos : (Array.isArray(row.galleryPhotos) ? row.galleryPhotos : []),
    likedIps: Array.isArray(row.liked_ips) ? row.liked_ips : (Array.isArray(row.likedIps) ? row.likedIps : []),
    likesCount: Number(row.likes_count || row.likesCount || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    templateId: row.template_id || row.templateId || 'classic',
    frameColor: row.frame_color || row.frameColor || null,
    stickerOverlay: row.sticker_overlay || row.stickerOverlay || null,
    filterName: row.filter_name || row.filterName || null,
    isPinned: Boolean(row.is_pinned ?? row.isPinned),
  };
}

// Map app memory object -> database row
function memoryToRow(mem) {
  let strip = mem.stripImage || mem.stripUrl || null;
  if (strip && (typeof strip !== 'string' || strip.length < 50 || strip === 'data:,' || !strip.trim())) {
    strip = null;
  }
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
    gallery_photos: [], // keep cloud payload lightweight (<120KB) so Realtime WebSocket and network never drop image
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
        remoteMemories = data.map(rowToMemory).filter(Boolean);
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

  const combined = mergeMemories(localMemories, remoteMemories);

  if (combined.length > 0) {
    saveBulkMemoriesDB(combined).catch(() => {});
  }

  return { memories: combined, isCloudConnected, schemaError };
}

// Upload a data: URL (strip JPEG / voice note) to Storage and return its public URL,
// so table rows stay small instead of carrying base64 to every guest phone.
async function toStorageUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('data:')) return value;
  try {
    const blob = await (await fetch(value)).blob();
    const ext = (blob.type.split('/')[1] || 'bin').split(';')[0];
    return await uploadMedia('memories', blob, ext);
  } catch (e) {
    // Keep the inline data URL so the guest's photo is never lost (e.g. bucket not created yet)
    console.warn('[Sync] Storage upload failed, saving inline:', e);
    return value;
  }
}

// Optional backup copy of each guest upload into the couple's Google Drive (google-apps-script/Code.gs).
// Fire-and-forget: a Drive problem never blocks or fails the guest's upload.
function backupToDrive(mem) {
  const url = (import.meta.env || {}).VITE_GDRIVE_BACKUP_URL;
  if (!url) return;
  const base = `${mem.createdAt || new Date().toISOString()} ${mem.guestName || 'Tamu'}`.replace(/[:.]/g, '-');
  const files = [
    { name: `${base} foto`, dataUrl: mem.stripImage || mem.stripUrl },
    { name: `${base} suara`, dataUrl: mem.audioUrl },
  ].filter((f) => typeof f.dataUrl === 'string' && f.dataUrl.startsWith('data:'));
  if (!files.length) return;
  // no-cors + text/plain: Apps Script cannot answer a CORS preflight; the reply is unreadable but the file is saved
  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ files, description: `${mem.guestName || 'Tamu'}: ${mem.message || mem.guestMessage || ''}` }),
  }).catch((e) => console.warn('[Drive] Backup failed:', e));
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new memory to Supabase (cloud) and IndexedDB (local cache)
// ─────────────────────────────────────────────────────────────────────────────
export async function saveMemoryOnline(newMemory) {
  if (!newMemory || !newMemory.id) return { success: false, error: 'Invalid memory' };

  backupToDrive(newMemory);

  // 1. Save to IndexedDB immediately (instant offline cache)
  try {
    await saveMemoryDB(newMemory);
  } catch (e) {
    console.warn('[Sync] IndexedDB save warning:', e);
  }

  // 2. Upload to Supabase (cross-device cloud storage)
  const client = getSupabaseClient();

  if (client) {
    try {
      const strip = await toStorageUrl(newMemory.stripImage || newMemory.stripUrl);
      const audio = await toStorageUrl(newMemory.audioUrl);
      const row = memoryToRow({ ...newMemory, stripImage: strip, stripUrl: strip, audioUrl: audio });

      const { error } = await client.from('memories').insert(row);

      // 23505 = duplicate id: this memory was already saved by an earlier retry
      if (error && error.code !== '23505') {
        console.error('[Sync] Supabase insert error:', error);
        return { success: false, isCloudSaved: false, error: error.message, code: error.code };
      }

      return { success: true, isCloudSaved: true };
    } catch (e) {
      console.error('[Sync] Supabase save exception:', e);
      return { success: false, isCloudSaved: false, error: e.message };
    }
  }

  return {
    success: true,
    isCloudSaved: false,
    warning: 'Foto tersimpan secara lokal di perangkat ini. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY agar foto tersinkronisasi ke seluruh HP tamu.'
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Like / unlike — atomic on the server (set_like RPC), so concurrent likes never overwrite each other
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleLikeOnline(memoryId, isLiked) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.rpc('set_like', { p_id: memoryId, p_device: getDeviceId(), p_liked: isLiked });
  if (error) console.warn('[Sync] Like error:', error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin actions. RLS silently skips rows a non-admin may not touch, so we check
// the returned rows instead of trusting "no error".
// ─────────────────────────────────────────────────────────────────────────────
async function adminWrite(query) {
  const { data, error } = await query.select('id');
  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: 'Ditolak: akun ini bukan admin atau data tidak ditemukan.' };
  return { success: true };
}

export async function pinMemoryOnline(memoryId, isPinned) {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase belum dikonfigurasi' };
  return adminWrite(client.from('memories').update({ is_pinned: isPinned }).eq('id', memoryId));
}

// shortcut: deleting a memory leaves its strip/audio file in Storage; clean the bucket by hand if space runs out.
export async function deleteMemoryOnline(memoryId) {
  const client = getSupabaseClient();
  if (!client) {
    await deleteMemoryDB(memoryId);
    return { success: true };
  }
  const result = await adminWrite(client.from('memories').delete().eq('id', memoryId));
  if (result.success) await deleteMemoryDB(memoryId);
  return result;
}

export async function clearAllMemoriesOnline() {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from('memories').delete().neq('id', '');
    if (error) return { success: false, error: error.message };
    // RLS skips rows silently for non-admins, so check the table is really empty
    const { data } = await client.from('memories').select('id').limit(1);
    if (data?.length) return { success: false, error: 'Ditolak: akun ini bukan admin.' };
  }
  await clearAllMemoriesDB();
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wedding settings (couple info + templates) — one shared row in app_settings
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchSettingsOnline() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.from('app_settings').select('couple, templates').eq('id', 1).maybeSingle();
  if (error) {
    console.warn('[Sync] Settings fetch error:', error.message);
    return null;
  }
  return data;
}

// patch: { couple } and/or { templates }
export async function saveSettingsOnline(patch) {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase belum dikonfigurasi' };
  const { data, error } = await client
    .from('app_settings')
    .upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
    .select('id');
  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: 'Ditolak: akun ini bukan admin.' };
  return { success: true };
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
    const client = getRealtimeClient();
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
            if (isDummyMemory(payload.new)) return;
            let mem = rowToMemory(payload.new);
            if (!mem) return;
            saveMemoryDB(mem).catch(() => {});
            onNewMemory?.(mem);

            // If strip_image was omitted by Supabase Realtime (TOAST column limit), immediately fetch full row via REST!
            if (!mem.stripImage && payload.new.id) {
              const currentClient = getSupabaseClient();
              if (currentClient) {
                currentClient
                  .from('memories')
                  .select('*')
                  .eq('id', payload.new.id)
                  .single()
                  .then(({ data: fullRow, error }) => {
                    if (!error && fullRow) {
                      const completeMem = rowToMemory(fullRow);
                      if (completeMem.stripImage) {
                        saveMemoryDB(completeMem).catch(() => {});
                        onUpdateMemory?.(completeMem);
                      }
                    }
                  })
                  .catch(() => {});
              }
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            let mem = rowToMemory(payload.new);

            // Supabase Realtime UPDATE events do NOT send unchanged TOAST columns (strip_image, audio_url).
            // We must retrieve the existing memory from IndexedDB to preserve valid photos & audio!
            getAllMemoriesDB().then((existingList) => {
              const existing = Array.isArray(existingList) ? existingList.find((e) => e.id === mem.id) : null;
              if (existing) {
                if (!mem.stripImage && existing.stripImage) {
                  mem.stripImage = existing.stripImage;
                  mem.stripUrl = existing.stripUrl || existing.stripImage;
                }
                if (!mem.audioUrl && existing.audioUrl) {
                  mem.audioUrl = existing.audioUrl;
                  mem.audioDuration = existing.audioDuration || 0;
                }
                if (!mem.message && existing.message) {
                  mem.message = existing.message;
                  mem.guestMessage = existing.guestMessage || existing.message;
                }
              }

              // If stripImage is still missing, fetch full row from Supabase REST
              if (!mem.stripImage && payload.new.id) {
                const currentClient = getSupabaseClient();
                if (currentClient) {
                  currentClient
                    .from('memories')
                    .select('*')
                    .eq('id', payload.new.id)
                    .single()
                    .then(({ data: fullRow, error }) => {
                      if (!error && fullRow) {
                        const completeMem = rowToMemory(fullRow);
                        if (completeMem.stripImage) {
                          mem.stripImage = completeMem.stripImage;
                          mem.stripUrl = completeMem.stripUrl;
                        }
                      }
                      saveMemoryDB(mem).catch(() => {});
                      onUpdateMemory?.(mem);
                    })
                    .catch(() => {
                      saveMemoryDB(mem).catch(() => {});
                      onUpdateMemory?.(mem);
                    });
                  return;
                }
              }

              saveMemoryDB(mem).catch(() => {});
              onUpdateMemory?.(mem);
            }).catch(() => {
              saveMemoryDB(mem).catch(() => {});
              onUpdateMemory?.(mem);
            });
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

  return () => {
    const client = getRealtimeClient();
    if (activeChannel && client) {
      client.removeChannel(activeChannel);
    }
  };
}

export { onMemoryBroadcast };
