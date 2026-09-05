import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Heart,
  Music,
  Image as ImageIcon,
  QrCode,
  Users,
  Trash2,
  Pin,
  Play,
  Pause,
  Download,
  Save,
  Upload,
  Sparkles,
  ArrowLeft,
  Tv,
  CheckCircle2,
  Radio,
  Sliders,
  Eye,
  Plus,
  X,
  SlidersHorizontal,
  Check,
  Database,
  Cloud,
  RefreshCw,
  Copy,
  LogOut,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Key,
  Link as LinkIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { renderPhotostrip } from '../utils/canvasExport';
import { useNotify } from '../context/NotificationContext';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  clearCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../services/supabaseClient';

const SUPABASE_SCHEMA_SQL = `-- ==============================================================================
-- 1. Buat Tabel memories jika belum ada
-- ==============================================================================
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

-- 2. Pastikan kolom audio & strip tersedia jika tabel sudah pernah dibuat sebelumnya
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
END $$;

-- 3. Aktifkan Row Level Security (RLS) & Berikan Izin Akses Publik
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.memories;
DROP POLICY IF EXISTS "Allow public insert access" ON public.memories;
DROP POLICY IF EXISTS "Allow public update access" ON public.memories;
DROP POLICY IF EXISTS "Allow public delete access" ON public.memories;

CREATE POLICY "Allow public read access" ON public.memories FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.memories FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.memories FOR DELETE USING (true);

-- 4. Aktifkan Supabase Realtime untuk sinkronisasi antar HP tanpa refresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'memories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Aktifkan REPLICA IDENTITY FULL agar kolom foto selalu disertakan di Supabase Realtime
ALTER TABLE public.memories REPLICA IDENTITY FULL;`;


export default function AdminPanel({
  weddingSettings,
  templates = [],
  memories = [],
  onClose,
  onOpenProjector,
  onUpdateCouple,
  onUpdateTemplates,
  onDeleteMemory,
  onClearAllMemories,
  onPinMemory,
  onLogout,
}) {
  const notify = useNotify();
  const [activeTab, setActiveTab] = useState('settings'); // 'settings', 'memories', 'templates', 'qrcode'
  const [formData, setFormData] = useState({
    groomName: weddingSettings?.couple?.groomName || 'Irsyad',
    brideName: weddingSettings?.couple?.brideName || 'Adisty',
    displayNames: weddingSettings?.couple?.displayNames || 'Adisty & Irsyad',
    formattedDate: weddingSettings?.couple?.formattedDate || '11 November 2026',
    subtitle: weddingSettings?.couple?.subtitle || 'WEDDING MEMORIES',
    tagline: weddingSettings?.couple?.tagline || 'CAPTURE EVERY BEAUTIFUL MOMENT AND CREATE MEMORIES TOGETHER',
    quote: weddingSettings?.couple?.quote || "Snap a pic, leave a memory, help us celebrate our love story !",
    heroImage: weddingSettings?.couple?.heroImage || '/uploads/covers/1787992347172-237784708.jpg',
    bgmUrl: weddingSettings?.couple?.bgmUrl || '/uploads/audio/1788001682912-733496316.mp3',
    bgmTitle: weddingSettings?.couple?.bgmTitle || 'PARAMORE-The_Only_Exception_.mp3',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [activeAudioId, setActiveAudioId] = useState(null);

  // Cloud Sync Configuration State
  const initialCreds = getSupabaseCredentials();
  const [cloudUrl, setCloudUrl] = useState(initialCreds.url || '');
  const [cloudKey, setCloudKey] = useState(initialCreds.key || '');
  const [cloudStatus, setCloudStatus] = useState(initialCreds);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [cloudSaveMsg, setCloudSaveMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState(false);
  const [includeCloudInQr, setIncludeCloudInQr] = useState(true);
  const [guestLinkUrl, setGuestLinkUrl] = useState('');
  
  // Custom Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [customTplForm, setCustomTplForm] = useState({
    id: '',
    name: 'Custom Wedding Frame',
    category: 'Custom Design',
    theme: 'light',
    bgColor: '#ffffff',
    customFrameUrl: '',
    frameMode: 'overlay', // 'overlay' or 'background'
    slotCount: 3,
    startX: 42,
    startY: 195,
    frameWidth: 516,
    frameHeight: 360,
    gapY: 32,
    borderRadius: 8,
    showText: true,
    topTitle: 'HAPPY',
    mainScript: 'Wedding Day',
  });
  const [previewCanvasUrl, setPreviewCanvasUrl] = useState('');
  const [isUploadingFrame, setIsUploadingFrame] = useState(false);

  const audioPlayerRef = useRef(null);
  const coverInputRef = useRef(null);
  const bgmInputRef = useRef(null);
  const templateFileInputRef = useRef(null);

  useEffect(() => {
    if (weddingSettings?.couple) {
      setFormData({
        groomName: weddingSettings.couple.groomName || 'Irsyad',
        brideName: weddingSettings.couple.brideName || 'Adisty',
        displayNames: weddingSettings.couple.displayNames || 'Adisty & Irsyad',
        formattedDate: weddingSettings.couple.formattedDate || '11 November 2026',
        subtitle: weddingSettings.couple.subtitle || 'WEDDING MEMORIES',
        tagline: weddingSettings.couple.tagline || 'CAPTURE EVERY BEAUTIFUL MOMENT AND CREATE MEMORIES TOGETHER',
        quote: weddingSettings.couple.quote || "Snap a pic, leave a memory, help us celebrate our love story !",
        heroImage: weddingSettings.couple.heroImage || '/uploads/covers/1787992347172-237784708.jpg',
        bgmUrl: weddingSettings.couple.bgmUrl || '/uploads/audio/1788001682912-733496316.mp3',
        bgmTitle: weddingSettings.couple.bgmTitle || 'PARAMORE-The_Only_Exception_.mp3',
      });
    }
  }, [weddingSettings]);

  // Generate QR Code langsung di client (berfungsi optimal di Vercel & offline)
  useEffect(() => {
    const generateQr = async () => {
      try {
        let origin = typeof window !== 'undefined' ? window.location.origin : '';
        if (typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '/') {
          origin += window.location.pathname;
        }

        const creds = getSupabaseCredentials();
        let targetUrl = origin;

        if (includeCloudInQr && creds.isConfigured && creds.source === 'local') {
          const params = new URLSearchParams();
          params.set('sb_url', creds.url);
          params.set('sb_key', creds.key);
          targetUrl = `${origin}?${params.toString()}`;
        }

        setGuestLinkUrl(targetUrl);

        const qrData = await QRCode.toDataURL(targetUrl, {
          width: 500,
          margin: 2,
          color: {
            dark: '#231123',
            light: '#faf8f5',
          },
        });
        setQrCodeUrl(qrData);
      } catch (e) {
        console.error('Error generating QR code:', e);
      }
    };

    generateQr();
  }, [includeCloudInQr, cloudStatus.url, cloudStatus.key]);

  // Update Live Preview Canvas for Custom Template
  useEffect(() => {
    if (!isTemplateModalOpen) return;

    let isMounted = true;
    const updatePreview = async () => {
      try {
        const dummyPhotos = [
          '/assets/sample_couple.jpg',
          '/assets/sample_couple.jpg',
          '/assets/sample_couple.jpg',
          '/assets/sample_couple.jpg',
        ];
        const dataUrl = await renderPhotostrip({
          template: customTplForm,
          photos: dummyPhotos.slice(0, customTplForm.slotCount),
          coupleNames: formData.displayNames,
          weddingDate: formData.formattedDate,
          guestName: 'Sample Tamu',
          filter: 'normal',
          width: 600,
          height: 1800,
        });
        if (isMounted) setPreviewCanvasUrl(dataUrl);
      } catch (err) {
        console.error('Error rendering template preview:', err);
      }
    };

    updatePreview();
    return () => {
      isMounted = false;
    };
  }, [customTplForm, isTemplateModalOpen, formData.displayNames, formData.formattedDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'groomName' || name === 'brideName'
        ? { displayNames: name === 'brideName' ? `${value} & ${prev.groomName}` : `${prev.brideName} & ${value}` }
        : {}),
    }));
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        if (onUpdateCouple) onUpdateCouple(formData);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error updating settings:', err);
      notify.error('Gagal menyimpan pengaturan ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('cover', file);

    try {
      const res = await fetch('/api/upload/cover', {
        method: 'POST',
        body: body,
      });
      const json = await res.json();
      if (json.success && json.url) {
        setFormData((prev) => ({ ...prev, heroImage: json.url }));
        setSaveSuccess(true);
        notify.success('Foto sampul berhasil diperbarui!');
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error uploading cover:', err);
      notify.error('Gagal mengunggah foto sampul.');
    }
  };

  const handleUploadBgm = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('audio', file);
    body.append('title', file.name);

    try {
      const res = await fetch('/api/upload/bgm', {
        method: 'POST',
        body: body,
      });
      const json = await res.json();
      if (json.success && json.url) {
        setFormData((prev) => ({
          ...prev,
          bgmUrl: json.url,
          bgmTitle: json.title || file.name,
        }));
        setSaveSuccess(true);
        notify.success('Lagu latar berhasil diunggah!');
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error uploading BGM:', err);
      notify.error('Gagal mengunggah lagu pernikahan.');
    }
  };

  // Upload Custom Template Frame Image
  const handleUploadTemplateFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFrame(true);
    const body = new FormData();
    body.append('frame', file);

    try {
      const res = await fetch('/api/upload/template', {
        method: 'POST',
        body: body,
      });
      const json = await res.json();
      if (json.success && json.url) {
        setCustomTplForm((prev) => ({
          ...prev,
          customFrameUrl: json.url,
          name: prev.name === 'Custom Wedding Frame' ? file.name.replace(/\.[^/.]+$/, "") : prev.name
        }));
        notify.success('Frame template berhasil diunggah!');
      } else {
        notify.error('Gagal mengunggah template: ' + (json.message || 'Error'));
      }
    } catch (err) {
      console.error('Error uploading template file:', err);
      notify.error('Gagal mengunggah template frame.');
    } finally {
      setIsUploadingFrame(false);
    }
  };

  const handleSaveCustomTemplate = async () => {
    if (!customTplForm.name) {
      notify.warning('Mohon masukkan nama template terlebih dahulu.', 'Nama Template');
      return;
    }

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customTplForm),
      });
      const json = await res.json();
      if (json.success) {
        setIsTemplateModalOpen(false);
        setSaveSuccess(true);
        notify.success('Template kustom berhasil disimpan!');
        const allTemplatesRes = await fetch('/api/templates').then(r => r.json());
        if (allTemplatesRes.success && onUpdateTemplates) {
          onUpdateTemplates(allTemplatesRes.data);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        notify.error('Gagal menyimpan template: ' + (json.error || 'Terjadi kesalahan'));
      }
    } catch (err) {
      console.error('Error creating template:', err);
      notify.error('Gagal menyimpan template.');
    }
  };

  const handleDeleteTemplate = async (templateId, templateName) => {
    const confirmed = await notify.confirm(
      `Apakah Anda yakin ingin menghapus template "${templateName}"?`,
      'Hapus Template',
      'Ya, Hapus',
      'Batal'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setSaveSuccess(true);
        notify.success('Template berhasil dihapus.');
        const allTemplatesRes = await fetch('/api/templates').then(r => r.json());
        if (allTemplatesRes.success && onUpdateTemplates) {
          onUpdateTemplates(allTemplatesRes.data);
        }
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error deleting template:', err);
    }
  };

  const handlePlayVoice = (id, url) => {
    if (activeAudioId === id) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setActiveAudioId(null);
    } else {
      setActiveAudioId(id);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
      }
    }
  };

  const handleTestConnection = async () => {
    setIsTestingCloud(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(cloudUrl, cloudKey);
      setTestResult(res);
      if (res.success) {
        notify.success('Koneksi ke Supabase berhasil! Tabel "memories" aktif.');
      } else {
        notify.error(res.error || 'Gagal terhubung ke Supabase');
      }
    } catch (e) {
      setTestResult({ success: false, error: e.message });
      notify.error(e.message);
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleSaveCloudConfig = (e) => {
    e?.preventDefault();
    const success = saveSupabaseCredentials(cloudUrl, cloudKey);
    if (success) {
      setCloudStatus(getSupabaseCredentials());
      setCloudSaveMsg('Pengaturan Cloud berhasil disimpan dan diterapkan!');
      notify.success('Pengaturan Cloud Supabase berhasil disimpan!');
      setTimeout(() => setCloudSaveMsg(''), 4000);
    } else {
      notify.error('Mohon isi URL dan Anon Key dengan benar.');
    }
  };

  const handleResetCloudConfig = () => {
    clearCustomSupabaseCredentials();
    const fresh = getSupabaseCredentials();
    setCloudUrl(fresh.url);
    setCloudKey(fresh.key);
    setCloudStatus(fresh);
    setTestResult(null);
    setCloudSaveMsg('Kredensial kustom direset ke default.');
    notify.info('Kredensial kustom telah dihapus.');
    setTimeout(() => setCloudSaveMsg(''), 3000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    notify.success('Script SQL berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyGuestLink = () => {
    if (!guestLinkUrl) return;
    navigator.clipboard.writeText(guestLinkUrl);
    setCopiedGuestLink(true);
    notify.success('Link Tamu berhasil disalin!');
    setTimeout(() => setCopiedGuestLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2a29] flex flex-col">
      <audio
        ref={audioPlayerRef}
        onEnded={() => setActiveAudioId(null)}
        className="hidden"
      />

      {/* Top Admin Navigation Header */}
      <header className="bg-white border-b border-[#e8dfd5] sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-[#f4ede4] hover:bg-[#e8dfd5] text-[#5e4b3c] transition-colors"
              title="Kembali ke Halaman Tamu"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-elegant font-bold text-lg text-[#3a2c1f]">
                  Admin & Realtime Control Panel
                </h1>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  cloudStatus.isConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {cloudStatus.isConfigured ? '● Cloud Sync Aktif' : '○ Cloud Belum Terhubung'}
                </span>
              </div>
              <p className="text-xs text-[#7a6b5d]">
                Setiap perubahan langsung otomatis tampil di HP tamu & Layar Resepsi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenProjector}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#231123] hover:bg-[#3e1728] text-white text-xs font-semibold shadow transition-all"
            >
              <Tv className="w-4 h-4" /> Buka Layar Resepsi
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#c5a880] hover:bg-[#a8895b] text-white text-xs font-semibold shadow transition-all"
            >
              <Eye className="w-4 h-4" /> Lihat Halaman Tamu
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow transition-all"
                title="Keluar dari sesi Admin"
              >
                <LogOut className="w-4 h-4" /> Keluar
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-4 flex gap-2 border-t border-[#f1ede8] overflow-x-auto">
          {[
            { id: 'settings', label: 'Pengaturan Pernikahan', icon: Settings },
            { id: 'memories', label: `Moderasi Kenangan (${memories.length})`, icon: Users },
            { id: 'templates', label: `Template Photobooth (${templates.length})`, icon: Sliders },
            { id: 'cloud', label: 'Cloud Sync (Supabase)', icon: Database },
            { id: 'qrcode', label: 'QR Code Meja / Venue', icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all ${
                  isSel
                    ? 'border-[#c5a880] text-[#a8895b] font-bold bg-[#faf8f5]'
                    : 'border-transparent text-[#7a6b5d] hover:text-[#3a2c1f]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1">
        {/* Success Alert */}
        {saveSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium flex items-center gap-2 shadow-sm animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Pengaturan berhasil diperbarui dan disiarkan secara real-time! ✨
          </div>
        )}

        {/* TAB 1: SETTINGS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Couple Info Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e8dfd5] space-y-4">
                <h3 className="font-serif-elegant font-bold text-base text-[#3a2c1f] flex items-center gap-2 border-b border-[#f1ede8] pb-3">
                  <Heart className="w-5 h-5 text-[#c5a880]" />
                  Informasi Mempelai
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                      Nama Pengantin Wanita
                    </label>
                    <input
                      type="text"
                      name="brideName"
                      value={formData.brideName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                      Nama Pengantin Pria
                    </label>
                    <input
                      type="text"
                      name="groomName"
                      value={formData.groomName}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                    Format Judul Header (Tulisan Script)
                  </label>
                  <input
                    type="text"
                    name="displayNames"
                    value={formData.displayNames}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-sm font-script text-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                    Tanggal Acara (Format Teks Header)
                  </label>
                  <input
                    type="text"
                    name="formattedDate"
                    value={formData.formattedDate}
                    onChange={handleChange}
                    placeholder="08 AUGUST 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-sm font-cinzel"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                    Sub Judul Atas
                  </label>
                  <input
                    type="text"
                    name="subtitle"
                    value={formData.subtitle}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-sm font-cinzel"
                  />
                </div>
              </div>

              {/* Media & Aesthetic Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e8dfd5] space-y-4">
                <h3 className="font-serif-elegant font-bold text-base text-[#3a2c1f] flex items-center gap-2 border-b border-[#f1ede8] pb-3">
                  <ImageIcon className="w-5 h-5 text-[#c5a880]" />
                  Foto Sampul & Lagu Romantis
                </h3>

                {/* Hero Image Preview & Upload */}
                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1.5">
                    Foto Sampul Header (Tampilan Utama HP Tamu)
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={formData.heroImage}
                      alt="Cover Preview"
                      className="w-20 h-28 object-cover rounded-xl border border-[#e8dfd5] shadow-sm"
                    />
                    <div className="space-y-2 flex-1">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadCover}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f4ede4] hover:bg-[#e8dfd5] text-[#5e4b3c] text-xs font-semibold transition-colors"
                      >
                        <Upload className="w-4 h-4" /> Ganti Foto Sampul
                      </button>
                      <p className="text-[11px] text-[#8c7b6d]">
                        Rekomendasi rasio vertikal (9:16 atau 3:4)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Romantic BGM Section */}
                <div className="pt-2 border-t border-[#f1ede8]">
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1.5">
                    Musik Latar Belakang (BGM)
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#faf6f0] border border-[#e8dfd5]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-[#c5a880] text-white flex items-center justify-center">
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#3a2c1f] truncate max-w-[180px]">
                          {formData.bgmTitle || 'Lagu Pernikahan'}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium">Aktif</div>
                      </div>
                    </div>

                    <input
                      ref={bgmInputRef}
                      type="file"
                      accept="audio/*"
                      onChange={handleUploadBgm}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => bgmInputRef.current?.click()}
                      className="text-xs text-[#a8895b] hover:underline font-semibold"
                    >
                      Upload MP3
                    </button>
                  </div>
                </div>

                {/* Quotes & Taglines */}
                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                    Quotes Tengah (Bawah Divider)
                  </label>
                  <input
                    type="text"
                    name="quote"
                    value={formData.quote}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] focus:outline-none focus:ring-2 focus:ring-[#c5a880] text-sm font-cinzel"
                  />
                </div>
              </div>
            </div>

            {/* Save Button Bar */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#c5a880] to-[#a8895b] hover:from-[#bfa076] hover:to-[#96794d] text-white font-bold text-sm shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Menyimpan & Broadcast...' : 'Simpan & Terapkan Realtime ✨'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: MEMORIES MODERATION */}
        {activeTab === 'memories' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8dfd5] pb-4">
              <div>
                <h3 className="font-serif-elegant font-bold text-lg text-[#3a2c1f]">
                  Daftar Kenangan & Pesan Suara Tamu
                </h3>
                <p className="text-xs text-[#7a6b5d]">
                  Total {memories.length} ucapan dan foto strip masuk
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.resetGuestUploadLimit) {
                      window.resetGuestUploadLimit();
                      notify.success('Batas upload 3x dan jeda waktu 5 menit untuk perangkat ini berhasil di-reset.');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-all shadow-xs"
                  title="Reset batas 3 upload dan cooldown 5 menit untuk pengujian di device ini"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  Reset Kuota Upload (Device Ini)
                </button>

                {memories.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed = await notify.confirm(
                        'Apakah Anda yakin ingin menghapus SEMUA kenangan dan foto yang telah diupload? Tampilan tamu dan proyektor akan menjadi kosong dan bersih untuk persiapan acara.',
                        'Kosongkan Semua Kenangan',
                        'Ya, Hapus Semua',
                        'Batal'
                      );
                      if (confirmed) {
                        onClearAllMemories && onClearAllMemories();
                        notify.success('Semua kenangan dan foto berhasil dikosongkan.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-all shadow-xs"
                    title="Hapus semua foto dan ucapan tamu"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Kosongkan Tampilan Tamu ({memories.length})
                  </button>
                )}
              </div>
            </div>

            {memories.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-[#e8dfd5] shadow-sm">
                <div className="w-16 h-16 rounded-full bg-[#faf6f0] text-[#c5a880] flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h4 className="font-serif-elegant font-bold text-base text-[#3a2c1f]">
                  Belum Ada Kenangan yang Diunggah
                </h4>
                <p className="text-xs text-[#7a6b5d] max-w-sm mx-auto">
                  Tampilan tamu saat ini kosong dan bersih. Foto dan ucapan yang dikirimkan oleh tamu undangan saat acara berlangsung akan otomatis tampil di sini secara real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-3xl p-4 shadow-sm border border-[#e8dfd5] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="font-bold text-sm text-[#3a2c1f]">{m.guestName}</div>
                          <div className="text-[10px] text-[#8c7b6d]">
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onPinMemory && onPinMemory(m.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              m.isPinned
                                ? 'bg-amber-100 text-amber-700'
                                : 'text-gray-400 hover:bg-gray-100'
                            }`}
                            title={m.isPinned ? 'Lepas Pin' : 'Sematkan di Atas'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = await notify.confirm(
                                `Apakah Anda yakin ingin menghapus kenangan dari "${m.guestName}"?`,
                                'Hapus Kenangan',
                                'Ya, Hapus',
                                'Batal'
                              );
                              if (confirmed) {
                                onDeleteMemory && onDeleteMemory(m.id);
                                notify.success('Kenangan berhasil dihapus.');
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="Hapus Kenangan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="rounded-2xl overflow-hidden bg-[#faf8f5] p-2 flex justify-center mb-3">
                        <img
                          src={m.stripImage || m.stripUrl}
                          alt={m.guestName}
                          className="max-h-[220px] w-auto rounded-lg object-contain"
                        />
                      </div>

                      {m.audioUrl && (
                        <div className="mb-2 p-2 rounded-xl bg-[#faf6f0] border border-[#ebdccb] flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePlayVoice(m.id, m.audioUrl)}
                            className="w-7 h-7 rounded-full bg-[#c5a880] text-white flex items-center justify-center shadow"
                          >
                            {activeAudioId === m.id ? (
                              <Pause className="w-3.5 h-3.5 fill-white" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                            )}
                          </button>
                          <span className="text-[11px] font-medium text-[#4a3b2c]">
                            {activeAudioId === m.id ? 'Memutar suara...' : 'Putar Pesan Suara'}
                          </span>
                        </div>
                      )}

                      {(m.message || m.guestMessage) && (
                        <div className="text-xs text-[#5e4b3c] italic bg-[#fcfaf7] p-2.5 rounded-xl border border-[#efe9e0] mb-3">
                          "{m.message || m.guestMessage}"
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#f1ede8] flex items-center justify-between text-xs">
                      <span className="text-[#8c7b6d]">💖 {m.likesCount || 0} Suka</span>
                      <a
                        href={m.stripImage || m.stripUrl}
                        download={`photostrip-${m.guestName}.png`}
                        className="inline-flex items-center gap-1 text-[#c5a880] hover:underline font-medium"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TEMPLATES & CUSTOM TEMPLATE UPLOADER */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8dfd5] pb-4">
              <div>
                <h3 className="font-serif-elegant font-bold text-lg text-[#3a2c1f]">
                  Koleksi Template Photobooth Estetik
                </h3>
                <p className="text-xs text-[#7a6b5d]">
                  Upload frame custom desain Anda sendiri (Canva/Photoshop) dan sesuaikan posisi slot fotonya secara presisi!
                </p>
              </div>

              {/* Upload Custom Template Button */}
              <button
                type="button"
                onClick={() => {
                  setCustomTplForm({
                    id: `custom-tpl-${Date.now()}`,
                    name: 'Custom Wedding Frame',
                    category: 'Custom Design',
                    theme: 'light',
                    bgColor: '#ffffff',
                    customFrameUrl: '',
                    frameMode: 'overlay',
                    slotCount: 3,
                    startX: 42,
                    startY: 195,
                    frameWidth: 516,
                    frameHeight: 360,
                    gapY: 32,
                    borderRadius: 8,
                    showText: true,
                    topTitle: 'HAPPY',
                    mainScript: 'Wedding Day',
                  });
                  setIsTemplateModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#c5a880] hover:bg-[#a8895b] text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Upload Custom Template
              </button>
            </div>

            {/* Template Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white rounded-3xl p-5 border border-[#e8dfd5] shadow-sm flex flex-col items-center text-center space-y-3 relative group"
                >
                  {tpl.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                      className="absolute top-3 right-3 p-1.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm"
                      title="Hapus Custom Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Visual Representation */}
                  <div
                    className="w-24 h-52 rounded-xl p-2 flex flex-col justify-between items-center shadow-md relative overflow-hidden"
                    style={{
                      backgroundColor: tpl.bgColor,
                      color: tpl.textColor,
                      border: `2px solid ${tpl.accentColor || '#c5a880'}`,
                    }}
                  >
                    {tpl.customFrameUrl && (
                      <img
                        src={tpl.customFrameUrl}
                        alt={tpl.name}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-85"
                      />
                    )}

                    {tpl.showText !== false && (
                      <>
                        <div className="text-[8px] font-bold tracking-widest uppercase relative z-10">
                          {tpl.topTitle || 'HAPPY'}
                        </div>
                        {tpl.mainScript ? (
                          <div className="font-script text-[13px] leading-tight truncate w-full relative z-10">
                            {tpl.mainScript}
                          </div>
                        ) : null}
                      </>
                    )}

                    <div className="flex flex-col gap-1 w-full my-1 relative z-10">
                      {[...Array(tpl.slotCount || 3)].map((_, slotIdx) => (
                        <div
                          key={slotIdx}
                          className="w-full h-9 rounded-sm bg-white/20 border flex items-center justify-center backdrop-blur-[1px]"
                          style={{ borderColor: tpl.frameBorderColor || '#ffffff' }}
                        >
                          <span className="text-[7.5px] opacity-90 font-bold">Foto {slotIdx + 1}</span>
                        </div>
                      ))}
                    </div>

                    {tpl.showText !== false && (
                      <div className="w-full text-center relative z-10">
                        <div className="font-script text-[10px] truncate">
                          {formData.displayNames}
                        </div>
                        <div className="text-[7px] tracking-wider">
                          {formData.formattedDate}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-[#3a2c1f] flex items-center justify-center gap-1.5">
                      {tpl.name}
                      {tpl.isCustom && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                          Custom
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-[#8c7b6d]">{tpl.category} • {tpl.slotCount || 3} Foto</span>
                  </div>

                  {tpl.isCustom && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTplForm({
                          ...tpl,
                          startX: tpl.startX ?? 42,
                          startY: tpl.startY ?? 195,
                          frameWidth: tpl.frameWidth ?? 516,
                          frameHeight: tpl.frameHeight ?? 360,
                          gapY: tpl.gapY ?? 32,
                          borderRadius: tpl.borderRadius ?? 8,
                        });
                        setIsTemplateModalOpen(true);
                      }}
                      className="text-xs text-[#a8895b] hover:underline font-semibold flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Edit Posisi Slot Foto
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CLOUD SYNC & DATABASE (SUPABASE) */}
        {activeTab === 'cloud' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Card */}
            <div className={`p-6 rounded-3xl border shadow-sm transition-all ${
              cloudStatus.isConfigured
                ? 'bg-white border-emerald-200'
                : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    cloudStatus.isConfigured
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif-elegant font-bold text-base text-[#3a2c1f]">
                        Supabase Cloud Database & Realtime
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        cloudStatus.isConfigured
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {cloudStatus.isConfigured ? 'Terhubung ✓' : 'Belum Terhubung'}
                      </span>
                    </div>
                    <p className="text-xs text-[#7a6b5d] mt-0.5">
                      {cloudStatus.isConfigured
                        ? `Sumber Kredensial: ${cloudStatus.source === 'env' ? 'Environment Variables (Vercel/Vite)' : 'Pengaturan Browser Admin'}`
                        : 'Foto tamu saat ini hanya tersimpan di memori browser HP masing-masing.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingCloud}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#e8dfd5] hover:bg-[#faf8f5] text-xs font-semibold text-[#5e4b3c] shadow-sm transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-spin' : ''}`} />
                  {isTestingCloud ? 'Menguji...' : 'Tes Koneksi'}
                </button>
              </div>

              {/* Test Result Alert */}
              {testResult && (
                <div className={`mt-4 p-4 rounded-2xl border text-xs leading-relaxed animate-fadeIn ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-start gap-2.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold">{testResult.success ? testResult.message : testResult.error}</p>
                      {testResult.hint && (
                        <p className="mt-1 text-rose-700 font-medium opacity-90">{testResult.hint}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Kredensial Supabase */}
            <div className="bg-white rounded-3xl p-6 border border-[#e8dfd5] shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-[#f1ede8] pb-3">
                <h4 className="font-serif-elegant font-bold text-base text-[#3a2c1f] flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#c5a880]" />
                  Konfigurasi Kredensial Supabase
                </h4>
                {cloudStatus.source === 'local' && (
                  <button
                    type="button"
                    onClick={handleResetCloudConfig}
                    className="text-xs text-rose-600 hover:underline font-semibold"
                  >
                    Reset Kredensial Kustom
                  </button>
                )}
              </div>

              {cloudSaveMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {cloudSaveMsg}
                </div>
              )}

              <form onSubmit={handleSaveCloudConfig} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-project-id.supabase.co"
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#c5a880] focus:outline-none"
                    required
                  />
                  <span className="text-[11px] text-[#8c7b6d] mt-1 block">
                    Dapatkan dari Dashboard Supabase → Project Settings → Configuration → API → Project URL.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                    Supabase Anon Public API Key
                  </label>
                  <textarea
                    rows={2}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={cloudKey}
                    onChange={(e) => setCloudKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e8dfd5] text-xs font-mono focus:ring-2 focus:ring-[#c5a880] focus:outline-none resize-none"
                    required
                  />
                  <span className="text-[11px] text-[#8c7b6d] mt-1 block">
                    Dapatkan dari Dashboard Supabase → Project Settings → Configuration → API → Project API Keys (anon public).
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#c5a880] hover:bg-[#a8895b] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Simpan Pengaturan Cloud
                  </button>

                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingCloud}
                    className="px-4 py-2.5 rounded-xl bg-[#f4ede4] hover:bg-[#e8dfd5] text-[#5e4b3c] font-semibold text-xs transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingCloud ? 'animate-spin' : ''}`} />
                    Tes Koneksi
                  </button>
                </div>
              </form>
            </div>

            {/* SQL Schema Copy Section */}
            <div className="bg-white rounded-3xl p-6 border border-[#e8dfd5] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1ede8] pb-3">
                <div>
                  <h4 className="font-serif-elegant font-bold text-base text-[#3a2c1f] flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#c5a880]" />
                    Script SQL Skema Database Supabase
                  </h4>
                  <p className="text-xs text-[#7a6b5d] mt-0.5">
                    Jalankan script ini di menu SQL Editor Supabase untuk membuat tabel dan mengaktifkan izin publik.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f4ede4] hover:bg-[#e8dfd5] text-[#5e4b3c] text-xs font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Buka Supabase
                  </a>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3a2c1f] hover:bg-[#231123] text-white text-xs font-bold shadow-sm transition-all"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSql ? 'Tersalin!' : 'Salin Script SQL'}
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={SUPABASE_SCHEMA_SQL}
                  rows={8}
                  className="w-full p-4 rounded-2xl bg-[#1e1e24] text-[#d4d4d8] font-mono text-[11px] leading-relaxed border border-[#3f3f46] focus:outline-none resize-y selection:bg-[#c5a880] selection:text-black"
                />
              </div>
            </div>

            {/* Panduan Praktis 3 Menit */}
            <div className="bg-[#faf8f5] rounded-3xl p-6 border border-[#e8dfd5] space-y-4">
              <h4 className="font-serif-elegant font-bold text-base text-[#3a2c1f] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#c5a880]" />
                Panduan Cepat 3 Menit Setup Cloud Sync
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#5e4b3c]">
                <div className="bg-white p-4 rounded-2xl border border-[#e8dfd5] space-y-2">
                  <span className="w-6 h-6 rounded-full bg-[#c5a880] text-white font-bold flex items-center justify-center text-xs">1</span>
                  <h5 className="font-bold text-[#3a2c1f]">Buat Project Supabase</h5>
                  <p className="text-[11px] text-[#7a6b5d] leading-relaxed">
                    Daftar gratis di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-[#a8895b] font-bold underline">supabase.com</a> dan buat project baru (pilih region terdekat seperti Singapore).
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#e8dfd5] space-y-2">
                  <span className="w-6 h-6 rounded-full bg-[#c5a880] text-white font-bold flex items-center justify-center text-xs">2</span>
                  <h5 className="font-bold text-[#3a2c1f]">Jalankan Script SQL</h5>
                  <p className="text-[11px] text-[#7a6b5d] leading-relaxed">
                    Klik menu <strong>SQL Editor</strong> di dashboard Supabase, klik <em>New Query</em>, tempelkan script SQL di atas lalu klik tombol <strong>Run</strong>.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-[#e8dfd5] space-y-2">
                  <span className="w-6 h-6 rounded-full bg-[#c5a880] text-white font-bold flex items-center justify-center text-xs">3</span>
                  <h5 className="font-bold text-[#3a2c1f]">Masukkan Kredensial</h5>
                  <p className="text-[11px] text-[#7a6b5d] leading-relaxed">
                    Buka <strong>Project Settings → API</strong>, salin URL & Anon Key, lalu tempelkan ke form di atas atau masukkan ke Environment Variables Vercel!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: QR CODE STAND */}
        {activeTab === 'qrcode' && (
          <div className="bg-white rounded-3xl p-8 border border-[#e8dfd5] shadow-sm max-w-lg mx-auto text-center space-y-5">
            <h3 className="font-serif-elegant font-bold text-xl text-[#3a2c1f]">
              QR Code Stand Meja Resepsi
            </h3>
            <p className="text-xs text-[#7a6b5d]">
              Cetak dan letakkan QR code ini di meja tamu atau standing banner agar tamu bisa langsung scan dengan kamera HP dan upload foto kenangan secara realtime!
            </p>

            {qrCodeUrl ? (
              <div className="p-4 bg-[#faf8f5] rounded-3xl border border-[#e8dfd5] inline-block shadow-inner">
                <img
                  src={qrCodeUrl}
                  alt="Wedding QR Code"
                  className="w-64 h-64 mx-auto rounded-2xl"
                />
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-2xl mx-auto flex items-center justify-center text-xs text-gray-400">
                Membuat QR Code...
              </div>
            )}

            <div className="font-script text-2xl text-[#c5a880]">
              {formData.displayNames}
            </div>

            {/* Smart Cloud Pairing Toggle */}
            {cloudStatus.isConfigured && cloudStatus.source === 'local' && (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-left flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="includeCloudInQr"
                  checked={includeCloudInQr}
                  onChange={(e) => setIncludeCloudInQr(e.target.checked)}
                  className="mt-0.5 rounded text-[#c5a880] focus:ring-[#c5a880]"
                />
                <label htmlFor="includeCloudInQr" className="text-[11px] text-[#5e4b3c] leading-tight cursor-pointer">
                  <strong>Sertakan Kunci Cloud di QR Code & Link</strong>: HP tamu yang memindai QR code ini akan otomatis tersambung ke database Supabase Anda tanpa konfigurasi manual!
                </label>
              </div>
            )}

            {/* Guest Link URL Copy */}
            <div className="p-3.5 bg-[#faf8f5] rounded-2xl border border-[#e8dfd5] text-left space-y-1.5">
              <label className="text-[11px] font-bold text-[#7a6b5d] uppercase tracking-wider block">
                Link Langsung Halaman Tamu:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={guestLinkUrl || (typeof window !== 'undefined' ? window.location.origin : '')}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-[#e8dfd5] text-xs font-mono text-[#5e4b3c] truncate focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyGuestLink}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#3a2c1f] hover:bg-[#231123] text-white text-xs font-bold whitespace-nowrap shadow-sm transition-all"
                >
                  {copiedGuestLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedGuestLink ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!qrCodeUrl) return;
                const link = document.createElement('a');
                link.href = qrCodeUrl;
                link.download = `wedding-qrcode-${formData.displayNames.replace(/\s+/g, '-')}.png`;
                link.click();
              }}
              className="w-full py-3.5 rounded-2xl bg-[#c5a880] hover:bg-[#a8895b] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Unduh QR Code High-Res
            </button>
          </div>
        )}
      </main>

      {/* CUSTOM TEMPLATE CREATOR & VISUAL SLOT EDITOR MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-[#fcfaf7] w-full max-w-4xl rounded-3xl shadow-2xl border border-[#e8dfd5] overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-[#e8dfd5] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-widest text-[#a8895b] uppercase">
                  TEMPLATE STUDIO
                </span>
                <h3 className="font-serif-elegant font-bold text-lg text-[#3a2c1f]">
                  Upload & Atur Posisi Slot Foto Template
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-9 h-9 rounded-full bg-[#f4ede4] text-[#5e4b3c] flex items-center justify-center hover:bg-[#e8dfd5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Form + Live Canvas Preview */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form & Slot Sliders (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Upload Image Banner */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8dfd5] space-y-3">
                  <label className="text-xs font-bold text-[#7a6b5d] uppercase tracking-wider block">
                    1. Upload Gambar Frame (.PNG / .JPG)
                  </label>
                  <div className="flex items-center gap-4">
                    {customTplForm.customFrameUrl ? (
                      <img
                        src={customTplForm.customFrameUrl}
                        alt="Frame Preview"
                        className="w-16 h-28 object-contain bg-gray-100 rounded-xl border border-[#e8dfd5]"
                      />
                    ) : (
                      <div className="w-16 h-28 bg-[#faf8f5] border-2 border-dashed border-[#e8dfd5] rounded-xl flex items-center justify-center text-xs text-gray-400 text-center p-1">
                        Belum ada file
                      </div>
                    )}

                    <div className="flex-1 space-y-2">
                      <input
                        ref={templateFileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleUploadTemplateFile}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => templateFileInputRef.current?.click()}
                        disabled={isUploadingFrame}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c5a880] hover:bg-[#a8895b] text-white text-xs font-bold shadow transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploadingFrame ? 'Mengunggah...' : 'Pilih File Frame PNG/JPG'}
                      </button>
                      <p className="text-[11px] text-[#8c7b6d]">
                        Rekomendasi file PNG resolusi tinggi (600 x 1800 px) dengan jendela foto transparan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Template Meta Details */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8dfd5] space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                        Nama Template
                      </label>
                      <input
                        type="text"
                        value={customTplForm.name}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#e8dfd5] text-xs focus:ring-2 focus:ring-[#c5a880]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                        Kategori
                      </label>
                      <input
                        type="text"
                        value={customTplForm.category}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#e8dfd5] text-xs focus:ring-2 focus:ring-[#c5a880]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                        Mode Frame
                      </label>
                      <select
                        value={customTplForm.frameMode}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, frameMode: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-[#e8dfd5] text-xs bg-white focus:ring-2 focus:ring-[#c5a880]"
                      >
                        <option value="overlay">Overlay Frame (PNG Transparan di atas)</option>
                        <option value="background">Background Frame (Foto di atas frame)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#7a6b5d] block mb-1">
                        Jumlah Slot Foto
                      </label>
                      <select
                        value={customTplForm.slotCount}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, slotCount: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-[#e8dfd5] text-xs bg-white focus:ring-2 focus:ring-[#c5a880]"
                      >
                        <option value={1}>1 Foto</option>
                        <option value={2}>2 Foto</option>
                        <option value={3}>3 Foto (Standar)</option>
                        <option value={4}>4 Foto</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showText"
                      checked={customTplForm.showText}
                      onChange={(e) => setCustomTplForm({ ...customTplForm, showText: e.target.checked })}
                      className="rounded text-[#c5a880] focus:ring-[#c5a880]"
                    />
                    <label htmlFor="showText" className="text-xs text-[#5e4b3c] font-medium cursor-pointer">
                      Tampilkan Watermark Teks Nama Mempelai & Tanggal
                    </label>
                  </div>
                </div>

                {/* 2. Visual Slot Sliders */}
                <div className="bg-white rounded-2xl p-4 border border-[#e8dfd5] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#f1ede8] pb-2">
                    <label className="text-xs font-bold text-[#7a6b5d] uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#c5a880]" />
                      2. Atur Posisi & Ukuran Slot Foto (Live)
                    </label>
                    <button
                      type="button"
                      onClick={() => setCustomTplForm({
                        ...customTplForm,
                        startX: 42,
                        startY: customTplForm.showText ? 195 : 120,
                        frameWidth: 516,
                        frameHeight: customTplForm.slotCount === 4 ? 270 : 360,
                        gapY: customTplForm.slotCount === 4 ? 22 : 32,
                        borderRadius: 8,
                      })}
                      className="text-[11px] text-[#c5a880] hover:underline font-semibold"
                    >
                      Reset Otomatis
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="flex justify-between text-[#5e4b3c] mb-1">
                        <span>Posisi X (Margin Kiri)</span>
                        <span className="font-bold">{customTplForm.startX} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="150"
                        value={customTplForm.startX}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, startX: parseInt(e.target.value) })}
                        className="w-full accent-[#c5a880]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[#5e4b3c] mb-1">
                        <span>Posisi Y Awal (Start Y)</span>
                        <span className="font-bold">{customTplForm.startY} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="400"
                        value={customTplForm.startY}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, startY: parseInt(e.target.value) })}
                        className="w-full accent-[#c5a880]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[#5e4b3c] mb-1">
                        <span>Lebar Foto (Width)</span>
                        <span className="font-bold">{customTplForm.frameWidth} px</span>
                      </div>
                      <input
                        type="range"
                        min="200"
                        max="580"
                        value={customTplForm.frameWidth}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, frameWidth: parseInt(e.target.value) })}
                        className="w-full accent-[#c5a880]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[#5e4b3c] mb-1">
                        <span>Tinggi Foto (Height)</span>
                        <span className="font-bold">{customTplForm.frameHeight} px</span>
                      </div>
                      <input
                        type="range"
                        min="150"
                        max="500"
                        value={customTplForm.frameHeight}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, frameHeight: parseInt(e.target.value) })}
                        className="w-full accent-[#c5a880]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[#5e4b3c] mb-1">
                        <span>Jarak Antar Foto (Gap Y)</span>
                        <span className="font-bold">{customTplForm.gapY} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={customTplForm.gapY}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, gapY: parseInt(e.target.value) })}
                        className="w-full accent-[#c5a880]"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[#5e4b3c] mb-1">
                        <span>Radius Sudut (Border Radius)</span>
                        <span className="font-bold">{customTplForm.borderRadius} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={customTplForm.borderRadius}
                        onChange={(e) => setCustomTplForm({ ...customTplForm, borderRadius: parseInt(e.target.value) })}
                        className="w-full accent-[#c5a880]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Canvas Preview (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center bg-white rounded-2xl p-4 border border-[#e8dfd5]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#7a6b5d] mb-3">
                  Live Preview Hasil Photostrip
                </span>

                {previewCanvasUrl ? (
                  <div className="max-w-[210px] rounded-2xl overflow-hidden shadow-wedding border border-[#e8dfd5] bg-black">
                    <img
                      src={previewCanvasUrl}
                      alt="Live Canvas Preview"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-96 bg-gray-100 rounded-2xl flex items-center justify-center text-xs text-gray-400">
                    Memuat Preview...
                  </div>
                )}
                <span className="text-[10px] text-[#9c8979] mt-2">
                  Geser slider di samping untuk mencocokkan lubang frame!
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-white border-t border-[#e8dfd5] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#6b5a4d] hover:bg-[#f4ede4]"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveCustomTemplate}
                className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-[#c5a880] to-[#a8895b] hover:from-[#bfa076] hover:to-[#96794d] text-white font-bold text-xs sm:text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <Check className="w-4 h-4" /> Simpan & Terapkan Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
