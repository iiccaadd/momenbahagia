import { createClient } from '@supabase/supabase-js';

// `|| {}` lets plain Node (tests) import this module; Vite replaces import.meta.env at build.
const env = import.meta.env || {};

// Kredensial hanya dari env build (VITE_SUPABASE_*), tidak dari URL atau localStorage,
// supaya link palsu tidak bisa mengarahkan foto tamu ke database lain.
// Public by design (role "anon", already shipped to every guest browser; RLS protects the data).
// Fallback so a build without Vercel env vars (preview, local dev) still reaches the live project.
const DEFAULT_SUPABASE_URL = 'https://gfbemoenmdzsvpacrpby.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYmVtb2VubWR6c3ZwYWNycGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MzAwNTYsImV4cCI6MjEwNDEwNjA1Nn0.dIinWd9Okj0NMbea3dDYM5ZPGToQR2Q9GGbrf3_aJwo';

export function getSupabaseCredentials() {
  const url = (env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const key = (env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY).trim();
  const isConfigured = url.startsWith('http') && !url.includes('your-project-id') && !!key && !key.includes('your-anon-key');
  return { url, key, isConfigured, source: isConfigured ? 'env' : 'none' };
}

let activeClient = null;

export function getSupabaseClient() {
  const creds = getSupabaseCredentials();
  if (!creds.isConfigured) return null;
  if (activeClient) return activeClient;

  try {
    activeClient = createClient(creds.url, creds.key, {
      realtime: { params: { eventsPerSecond: 10 } }
    });
    return activeClient;
  } catch (e) {
    console.error('[Supabase] Gagal inisialisasi client:', e);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload file ke bucket Storage "media" dan kembalikan URL publiknya
// ─────────────────────────────────────────────────────────────────────────────
export async function uploadMedia(folder, blob, ext) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase belum dikonfigurasi');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
  // Bucket membatasi tipe file; parameter seperti ";codecs=opus" dibuang agar cocok.
  const contentType = (blob.type || '').split(';')[0] || undefined;
  // File names are unique and never overwritten, so browsers may cache them for a year (saves egress quota)
  const { error } = await client.storage.from('media').upload(path, blob, { contentType, upsert: false, cacheControl: '31536000' });
  if (error) throw error;
  return client.storage.from('media').getPublicUrl(path).data.publicUrl;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tes koneksi ke Supabase dan verifikasi tabel 'memories'
// ─────────────────────────────────────────────────────────────────────────────
export async function testSupabaseConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Kredensial belum diisi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di Environment Variables Vercel lalu deploy ulang.'
    };
  }

  try {
    const { data, error } = await client
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
          hint: 'Jalankan script supabase_schema.sql di SQL Editor Supabase.'
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

export const supabase = getSupabaseClient();
export const isSupabaseConfigured = Boolean(supabase);
