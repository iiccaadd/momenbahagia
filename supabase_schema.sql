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

-- 3. Admin: hanya user yang terdaftar di tabel admins yang boleh mengubah / menghapus.
-- Buat user di Authentication -> Users -> Add user, lalu jalankan SEKALI (ganti emailnya):
--   INSERT INTO public.admins SELECT id FROM auth.users WHERE email = 'email-admin@contoh.com';
CREATE TABLE IF NOT EXISTS public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY; -- tanpa policy: tidak bisa dibaca/diubah dari browser

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid());
$$;

-- 4. Row Level Security tabel memories
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Hapus SEMUA policy lama apa pun namanya: policy digabung dengan OR, jadi satu policy lama
-- "izinkan semua" (mis. dibuat lewat dashboard) membuat tamu tetap bisa menghapus.
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memories' LOOP
    EXECUTE format('DROP POLICY %I ON public.memories', p.policyname);
  END LOOP;
END $$;

-- Tamu dan admin dapat melihat seluruh kenangan foto
CREATE POLICY "Allow public read access" ON public.memories
  FOR SELECT USING (true);

-- Tamu dapat mengunggah kenangan baru, tapi tidak bisa memalsukan like atau pin
CREATE POLICY "Allow public insert access" ON public.memories
  FOR INSERT WITH CHECK (COALESCE(likes_count, 0) = 0 AND NOT COALESCE(is_pinned, false));

-- Hanya admin yang boleh pin / hapus
CREATE POLICY "Admin update access" ON public.memories
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admin delete access" ON public.memories
  FOR DELETE USING (public.is_admin());

-- Like lewat fungsi atomik: tamu tidak butuh izin UPDATE, dan like bersamaan tidak saling menimpa
CREATE OR REPLACE FUNCTION public.set_like(p_id TEXT, p_device TEXT, p_liked BOOLEAN) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.memories SET
    liked_ips = CASE WHEN p_liked THEN COALESCE(liked_ips, '[]'::jsonb) || to_jsonb(p_device)
                     ELSE COALESCE(liked_ips, '[]'::jsonb) - p_device END,
    likes_count = GREATEST(0, COALESCE(likes_count, 0) + CASE WHEN p_liked THEN 1 ELSE -1 END)
  WHERE id = p_id AND (COALESCE(liked_ips, '[]'::jsonb) ? p_device) <> p_liked;
$$;
GRANT EXECUTE ON FUNCTION public.set_like(TEXT, TEXT, BOOLEAN) TO anon, authenticated;

-- 4b. Pengaturan pernikahan (nama, cover, lagu, template): satu baris, dibaca semua tamu
CREATE TABLE IF NOT EXISTS public.app_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  couple JSONB,
  templates JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Settings public read" ON public.app_settings;
DROP POLICY IF EXISTS "Settings admin insert" ON public.app_settings;
DROP POLICY IF EXISTS "Settings admin update" ON public.app_settings;
CREATE POLICY "Settings public read" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Settings admin insert" ON public.app_settings FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Settings admin update" ON public.app_settings FOR UPDATE USING (public.is_admin());

-- 4c. Storage untuk strip foto, voice note, cover, lagu & frame (hanya gambar/audio, maks 20MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 20971520, ARRAY['image/*', 'audio/*'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/*', 'audio/*'];

DROP POLICY IF EXISTS "Media guest upload" ON storage.objects;
DROP POLICY IF EXISTS "Media admin all" ON storage.objects;
-- Tamu hanya boleh menambah file baru di folder memories/ (tidak bisa menimpa / menghapus)
CREATE POLICY "Media guest upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = 'memories');
CREATE POLICY "Media admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'media' AND public.is_admin())
  WITH CHECK (bucket_id = 'media' AND public.is_admin());

-- 5. Aktifkan Supabase Realtime agar foto langsung muncul di HP lain & Layar Resepsi tanpa refresh
-- (Tanpa EXCEPTION yang menelan error: kalau gagal, harus terlihat.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'memories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
  END IF;
END $$;

-- 6. Aktifkan REPLICA IDENTITY FULL agar seluruh kolom (termasuk strip_image) selalu disertakan di Supabase Realtime
ALTER TABLE public.memories REPLICA IDENTITY FULL;

-- 7. Cek hasil: harus tampil 4 policy memories + baris realtime = true
SELECT 'policy' AS jenis, policyname AS nama, cmd AS aksi FROM pg_policies WHERE schemaname = 'public' AND tablename = 'memories'
UNION ALL
SELECT 'realtime', 'memories terdaftar', (EXISTS (
  SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'memories'))::text;

