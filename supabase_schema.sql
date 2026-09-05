-- ==============================================================================
-- WEDDING PHOTOBOOTH & MEMORIES - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Jalankan seluruh script SQL ini di:
-- https://supabase.com -> Buka Project Anda -> Menu 'SQL Editor' -> Klik 'New Query' -> Paste & Run
-- ==============================================================================

-- 1. Buat Tabel memories jika belum ada
CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL DEFAULT 'Tamu Spesial',
  message TEXT DEFAULT '',
  strip_image TEXT,
  strip_url TEXT,
  audio_url TEXT,
  audio_duration INTEGER DEFAULT 0,
  gallery_photos JSONB DEFAULT '[]'::jsonb,
  liked_ips JSONB DEFAULT '[]'::jsonb,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  template_id TEXT DEFAULT 'classic',
  frame_color TEXT,
  sticker_overlay TEXT,
  filter_name TEXT,
  is_pinned BOOLEAN DEFAULT false
);

-- 2. Pastikan kolom-kolom baru tersedia jika tabel sudah pernah dibuat sebelumnya
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memories' AND column_name='audio_url') THEN
    ALTER TABLE public.memories ADD COLUMN audio_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memories' AND column_name='audio_duration') THEN
    ALTER TABLE public.memories ADD COLUMN audio_duration INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memories' AND column_name='strip_url') THEN
    ALTER TABLE public.memories ADD COLUMN strip_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memories' AND column_name='strip_image') THEN
    ALTER TABLE public.memories ADD COLUMN strip_image TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memories' AND column_name='gallery_photos') THEN
    ALTER TABLE public.memories ADD COLUMN gallery_photos JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='memories' AND column_name='is_pinned') THEN
    ALTER TABLE public.memories ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- 4. Buat Kebijakan Akses Publik (Anonim)
-- Hapus policy lama agar tidak duplikat saat dijalankan berulang kali
DROP POLICY IF EXISTS "Allow public read access" ON public.memories;
DROP POLICY IF EXISTS "Allow public insert access" ON public.memories;
DROP POLICY IF EXISTS "Allow public update access" ON public.memories;
DROP POLICY IF EXISTS "Allow public delete access" ON public.memories;

-- Tamu dan admin dapat melihat seluruh kenangan foto
CREATE POLICY "Allow public read access" ON public.memories
  FOR SELECT USING (true);

-- Tamu dapat mengunggah foto dan voice note baru
CREATE POLICY "Allow public insert access" ON public.memories
  FOR INSERT WITH CHECK (true);

-- Tamu dan admin dapat memberikan like atau memperbarui status
CREATE POLICY "Allow public update access" ON public.memories
  FOR UPDATE USING (true);

-- Admin dapat menghapus foto yang kurang pantas
CREATE POLICY "Allow public delete access" ON public.memories
  FOR DELETE USING (true);

-- 5. Aktifkan Supabase Realtime agar foto langsung muncul di HP lain & Layar Resepsi tanpa refresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'memories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Abaikan jika publikasi sudah ada atau izin superuser berbeda
END $$;
