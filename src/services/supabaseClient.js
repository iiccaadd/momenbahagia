import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// URL Auto-Pairing: If a guest scans a QR code with ?sb_url=...&sb_key=...
// ─────────────────────────────────────────────────────────────────────────────
function initFromUrlParams() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const urlParam = params.get('sb_url');
    const keyParam = params.get('sb_key');

    if (urlParam && keyParam) {
      const cleanUrl = decodeURIComponent(urlParam).trim();
      const cleanKey = decodeURIComponent(keyParam).trim();
      if (cleanUrl.startsWith('http') && !cleanUrl.includes('your-project-id')) {
        localStorage.setItem('wedding_supabase_url', cleanUrl);
        localStorage.setItem('wedding_supabase_key', cleanKey);
        console.log('[Supabase] Konfigurasi cloud berhasil dipasang dari URL ✓');

        // Bersihkan parameter dari address bar agar URL tetap rapi
        params.delete('sb_url');
        params.delete('sb_key');
        const remaining = params.toString();
        const newUrl = window.location.pathname + (remaining ? `?${remaining}` : '') + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  } catch (e) {
    console.warn('[Supabase] Error parsing URL credentials:', e);
  }
}

initFromUrlParams();

// ─────────────────────────────────────────────────────────────────────────────
// Dapatkan kredensial aktif (Local Storage > Environment Variables)
// ─────────────────────────────────────────────────────────────────────────────
export function getSupabaseCredentials() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  let localUrl = '';
  let localKey = '';
  if (typeof window !== 'undefined') {
    try {
      localUrl = (localStorage.getItem('wedding_supabase_url') || '').trim();
      localKey = (localStorage.getItem('wedding_supabase_key') || '').trim();
    } catch (e) {}
  }

  const url = localUrl || envUrl;
  const key = localKey || envKey;

  const isPlaceholder = !url ||
    url.includes('your-project-id') ||
    !key ||
    key.includes('your-anon-key');

  const isConfigured = !isPlaceholder && url.startsWith('http');

  return {
    url,
    key,
    isConfigured,
    source: localUrl ? 'local' : (envUrl && !isPlaceholder ? 'env' : 'none')
  };
}

let activeClient = null;
let activeClientKey = null;

export function getSupabaseClient() {
  const creds = getSupabaseCredentials();
  if (!creds.isConfigured) return null;

  const clientKey = `${creds.url}|${creds.key}`;
  if (activeClient && activeClientKey === clientKey) {
    return activeClient;
  }

  try {
    activeClient = createClient(creds.url, creds.key, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    activeClientKey = clientKey;
    return activeClient;
  } catch (e) {
    console.error('[Supabase] Gagal inisialisasi client:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simpan kredensial baru (dari Admin Panel)
// ─────────────────────────────────────────────────────────────────────────────
export function saveSupabaseCredentials(url, key) {
  if (typeof window === 'undefined') return false;
  try {
    const cleanUrl = (url || '').trim();
    const cleanKey = (key || '').trim();

    if (!cleanUrl || !cleanKey) {
      throw new Error('URL dan Anon Key tidak boleh kosong');
    }

    localStorage.setItem('wedding_supabase_url', cleanUrl);
    localStorage.setItem('wedding_supabase_key', cleanKey);

    // Refresh active client
    activeClient = null;
    activeClientKey = null;
    supabase = getSupabaseClient();
    isSupabaseConfigured = Boolean(supabase);

    window.dispatchEvent(new CustomEvent('wedding-cloud-sync-changed', {
      detail: { isConfigured: isSupabaseConfigured }
    }));

    return true;
  } catch (e) {
    console.error('[Supabase] Gagal menyimpan kredensial:', e);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset kredensial kembali ke Environment Variables
// ─────────────────────────────────────────────────────────────────────────────
export function clearCustomSupabaseCredentials() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('wedding_supabase_url');
    localStorage.removeItem('wedding_supabase_key');

    activeClient = null;
    activeClientKey = null;
    supabase = getSupabaseClient();
    isSupabaseConfigured = Boolean(supabase);

    window.dispatchEvent(new CustomEvent('wedding-cloud-sync-changed', {
      detail: { isConfigured: isSupabaseConfigured }
    }));
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// Tes koneksi ke Supabase dan verifikasi tabel 'memories'
// ─────────────────────────────────────────────────────────────────────────────
export async function testSupabaseConnection(testUrl, testKey) {
  const url = (testUrl || getSupabaseCredentials().url || '').trim();
  const key = (testKey || getSupabaseCredentials().key || '').trim();

  if (!url || !key || url.includes('your-project-id') || key.includes('your-anon-key')) {
    return {
      success: false,
      error: 'Kredensial belum diisi atau masih berupa placeholder contoh.'
    };
  }

  try {
    const tempClient = createClient(url, key);
    const { data, error } = await tempClient
      .from('memories')
      .select('id, guest_name')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          error: 'Tabel "memories" belum dibuat di database Supabase Anda.',
          hint: 'Silakan buka SQL Editor di Supabase dan jalankan script dari file supabase_schema.sql.'
        };
      }
      if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('permission denied')) {
        return {
          success: false,
          error: 'Akses ditolak oleh Row Level Security (RLS).',
          hint: 'Jalankan script supabase_schema.sql untuk mengizinkan hak akses publik bagi tabel memories.'
        };
      }
      return {
        success: false,
        error: `Supabase Error (${error.code || 'UNKNOWN'}): ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil! Tabel "memories" aktif dan siap digunakan.',
      count: Array.isArray(data) ? data.length : 0
    };
  } catch (e) {
    return {
      success: false,
      error: `Gagal menghubungi server Supabase: ${e.message}`
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ekspor reaktif kompatibel ke komponen yang ada
// ─────────────────────────────────────────────────────────────────────────────
export let supabase = getSupabaseClient();
export let isSupabaseConfigured = Boolean(supabase);
