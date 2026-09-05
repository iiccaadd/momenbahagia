import React, { useState, useEffect } from 'react';
import GuestLanding from './components/GuestLanding';
import AdminPanel from './components/AdminPanel';
import ProjectorView from './components/ProjectorView';
import { defaultWeddingData } from './defaultData';
import {
  fetchOnlineMemories,
  saveMemoryOnline,
  toggleLikeOnline,
  mergeMemories,
  onMemoryBroadcast,
  deleteMemoryOnline,
  subscribeToMemories
} from './services/cloudSync';
import { isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  const [currentView, setCurrentView] = useState('guest');

  const [weddingSettings, setWeddingSettings] = useState(() => {
    try {
      const local = localStorage.getItem('wedding_settings');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return defaultWeddingData;
  });

  const [templates, setTemplates] = useState(() => {
    try {
      const local = localStorage.getItem('wedding_templates');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return defaultWeddingData.templates;
  });

  const [memories, setMemories] = useState(() => {
    return defaultWeddingData.memories || [];
  });

  const [likedMemoryIds, setLikedMemoryIds] = useState(() => {
    try {
      const local = localStorage.getItem('user_liked_memories');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return [];
  });

  const [latestMemory, setLatestMemory] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncCount, setSyncCount] = useState(0);
  const [cloudError, setCloudError] = useState(null);

  // Hash-based routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'admin') setCurrentView('admin');
      else if (hash === 'projector' || hash === 'live') setCurrentView('projector');
      else setCurrentView('guest');
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateTo = (view) => {
    window.location.hash = view === 'guest' ? '' : view;
    setCurrentView(view);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Cloud Sync Engine — polls Supabase every 5s + Realtime subscription
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const syncData = async () => {
      try {
        const result = await fetchOnlineMemories();
        const cloudMems = result.memories ?? [];
        const connected = result.isCloudConnected ?? false;

        setIsConnected(connected);
        if (result.schemaError) {
          setCloudError(result.schemaError);
        } else {
          setCloudError(null);
        }

        if (Array.isArray(cloudMems) && cloudMems.length > 0) {
          setMemories((prev) => {
            const next = cloudMems;
            const prevSignature = prev.map((m) => m.id + ':' + (m.likesCount || 0)).join('|');
            const nextSignature = next.map((m) => m.id + ':' + (m.likesCount || 0)).join('|');
            if (prevSignature === nextSignature && prev.length === next.length) return prev;
            return next;
          });
          setSyncCount((n) => n + 1);
        }
      } catch (e) {
        console.warn('[App] Sync error:', e);
      }
    };

    // Immediate initial sync
    syncData();

    // Poll every 5s for cross-device updates
    const interval = setInterval(syncData, 5000);

    // Sync on tab refocus
    const onFocus = () => syncData();
    const onVisible = () => { if (document.visibilityState === 'visible') syncData(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onVisible);

    // BroadcastChannel — same-device multi-tab sync
    const unsubscribeBroadcast = onMemoryBroadcast((data) => {
      if (data?.type === 'MEMORY_SAVED' && data.memory) {
        setLatestMemory(data.memory);
        setMemories((prev) => mergeMemories(prev, [data.memory]));
      } else if (data?.type === 'MEMORY_DELETED' && data.id) {
        setMemories((prev) => prev.filter((m) => m.id !== data.id));
      }
    });

    // Supabase Realtime — cross-device instant sync
    const unsubscribeRealtime = subscribeToMemories({
      onNewMemory: (newMem) => {
        console.log('[Realtime] New memory from another device:', newMem.guestName);
        setLatestMemory(newMem);
        setMemories((prev) => {
          const exists = prev.some((m) => m.id === newMem.id);
          if (exists) return prev;
          return [newMem, ...prev];
        });
      },
      onUpdateMemory: (updatedMem) => {
        if (!updatedMem || !updatedMem.id) return;
        console.log('[Realtime] Memory updated:', updatedMem.id);
        setMemories((prev) =>
          prev.map((m) => {
            if (m.id !== updatedMem.id) return m;
            // Never let like or realtime updates overwrite existing photo or voice note with null!
            const newStrip = (updatedMem.stripImage && updatedMem.stripImage.length > 50 && updatedMem.stripImage !== 'data:,')
              ? updatedMem.stripImage
              : m.stripImage;
            const newStripUrl = (updatedMem.stripUrl && updatedMem.stripUrl.length > 50 && updatedMem.stripUrl !== 'data:,')
              ? updatedMem.stripUrl
              : (m.stripUrl || newStrip);
            const newAudio = (updatedMem.audioUrl && updatedMem.audioUrl.length > 20)
              ? updatedMem.audioUrl
              : m.audioUrl;

            return {
              ...m,
              ...updatedMem,
              stripImage: newStrip,
              stripUrl: newStripUrl,
              audioUrl: newAudio,
              audioDuration: updatedMem.audioDuration || m.audioDuration || 0,
              message: updatedMem.message || m.message || '',
              guestMessage: updatedMem.guestMessage || m.guestMessage || '',
            };
          })
        );
      },
      onDeleteMemory: (deletedId) => {
        console.log('[Realtime] Memory deleted:', deletedId);
        setMemories((prev) => prev.filter((m) => m.id !== deletedId));
      }
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onVisible);
      unsubscribeBroadcast();
      unsubscribeRealtime();
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleAddNewMemory = async (newMem) => {
    if (!newMem) return;
    // Optimistic UI — display immediately on this device
    setLatestMemory(newMem);
    setMemories((prev) => [newMem, ...prev.filter((m) => m.id !== newMem.id)]);

    // Save to local IndexedDB and upload to Supabase cloud
    const result = await saveMemoryOnline(newMem);
    if (!result?.success) {
      console.warn('[App] Save to cloud issue:', result?.error);
      if (result?.code === 'PGRST204' || result?.error?.includes('guest_name')) {
        setCloudError('Kolom tabel memories di Supabase belum sesuai. Silakan jalankan SQL migrasi di SQL Editor Supabase.');
      } else {
        setCloudError(`Gagal upload ke cloud: ${result?.error || 'Koneksi bermasalah'}. Foto hanya tersimpan di HP ini.`);
      }
    } else if (result?.warning) {
      console.info('[App] Save warning:', result.warning);
      setCloudError(result.warning);
    }
    return result;
  };

  const handleLikeMemory = async (id) => {
    const isAlreadyLiked = likedMemoryIds.includes(id);
    const nextLikedIds = isAlreadyLiked
      ? likedMemoryIds.filter((mId) => mId !== id)
      : [...likedMemoryIds, id];

    setLikedMemoryIds(nextLikedIds);
    try { localStorage.setItem('user_liked_memories', JSON.stringify(nextLikedIds)); } catch (e) {}

    setMemories((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const delta = isAlreadyLiked ? -1 : 1;
          return { ...m, likesCount: Math.max(0, (m.likesCount || 0) + delta) };
        }
        return m;
      })
    );

    await toggleLikeOnline(id, !isAlreadyLiked);
  };

  const handleDeleteMemory = async (id) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await deleteMemoryOnline(id);
  };

  const handlePinMemory = async (_id) => {};

  return (
    <div className="w-full min-h-screen bg-[#faf8f5]">
      {cloudError && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-600 text-white text-xs font-semibold px-4 py-2.5 text-center shadow-md flex items-center justify-between gap-3">
          <span className="truncate">⚠️ {cloudError}</span>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => navigateTo('admin')}
              className="bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-white font-bold text-[11px] transition-colors"
            >
              Buka Admin
            </button>
            <button
              onClick={() => setCloudError(null)}
              className="underline font-bold text-white/90 hover:text-white"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {currentView === 'guest' && (
        <GuestLanding
          weddingSettings={weddingSettings}
          templates={templates}
          memories={memories}
          onLikeMemory={handleLikeMemory}
          likedMemoryIds={likedMemoryIds}
          onAddMemory={handleAddNewMemory}
          onOpenAdmin={() => navigateTo('admin')}
          onOpenProjector={() => navigateTo('projector')}
          isConnected={isConnected}
          syncCount={syncCount}
        />
      )}

      {currentView === 'admin' && (
        <AdminPanel
          weddingSettings={weddingSettings}
          templates={templates}
          memories={memories}
          onClose={() => navigateTo('guest')}
          onOpenProjector={() => navigateTo('projector')}
          onUpdateTemplates={(updatedTpls) => setTemplates(updatedTpls)}
          onDeleteMemory={handleDeleteMemory}
          onPinMemory={handlePinMemory}
        />
      )}

      {currentView === 'projector' && (
        <ProjectorView
          weddingSettings={weddingSettings}
          memories={memories}
          onClose={() => navigateTo('guest')}
          latestMemory={latestMemory}
        />
      )}
    </div>
  );
}
