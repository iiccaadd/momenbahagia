import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const isPlaceholder = !rawUrl ||
  rawUrl.includes('your-project-id') ||
  !rawKey ||
  rawKey.includes('your-anon-key');

export const isSupabaseConfigured = !isPlaceholder;

// Only create client if valid credentials are configured
export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      realtime: { params: { eventsPerSecond: 10 } }
    })
  : null;
