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
    // Start with empty so we always show fresh cloud data first
    return [];
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
        const cloudMems = result.memories ?? result; // backwards-compat
        const connected = result.isCloudConnected ?? isSupabaseConfigured;

        setIsConnected(connected);

        if (Array.isArray(cloudMems) && cloudMems.length > 0) {
          setMemories((prev) => {
            // Deep equality check to avoid unnecessary re-renders
            const next = cloudMems;
            const prevIds = prev.map((m) => m.id + (m.likesCount || 0)).join(',');
            const nextIds = next.map((m) => m.id + (m.likesCount || 0)).join(',');
            if (prevIds === nextIds && prev.length === next.length) return prev;
            return next;
          });
          setSyncCount((n) => n + 1);
        } else if (Array.isArray(cloudMems) && cloudMems.length === 0 && !connected) {
          // Supabase not configured — show default template data
          setMemories(defaultWeddingData.memories || []);
        }
      } catch (e) {
        console.warn('[App] Sync error:', e);
      }
    };

    // Immediate first load
    syncData();

    // Poll every 5 seconds for cross-device updates
    const interval = setInterval(syncData, 5000);

    // Extra sync on tab focus (user returns to app)
    const onFocus = () => syncData();
    const onVisible = () => { if (document.visibilityState === 'visible') syncData(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onVisible);

    // BroadcastChannel — same-device multi-tab sync (instant)
    const unsubscribeBroadcast = onMemoryBroadcast((data) => {
      if (data?.type === 'MEMORY_SAVED' && data.memory) {
        setLatestMemory(data.memory);
        setMemories((prev) => mergeMemories(prev, [data.memory]));
      } else if (data?.type === 'MEMORY_DELETED' && data.id) {
        setMemories((prev) => prev.filter((m) => m.id !== data.id));
      }
    });

    // Supabase Realtime — different-device instant push (no polling needed)
    const unsubscribeRealtime = subscribeToMemories((newMem) => {
      console.log('[Realtime] New photo from another device:', newMem.guestName);
      setLatestMemory(newMem);
      setMemories((prev) => {
        const exists = prev.find((m) => m.id === newMem.id);
        if (exists) return prev;
        return [newMem, ...prev];
      });
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
    // Optimistic UI — show immediately on this device
    setLatestMemory(newMem);
    setMemories((prev) => [newMem, ...prev.filter((m) => m.id !== newMem.id)]);
    // Push to cloud (Supabase will trigger Realtime on other devices)
    await saveMemoryOnline(newMem);
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
