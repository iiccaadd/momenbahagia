import React, { useState, useEffect } from 'react';
import { socket } from './socket';
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

export default function App() {
  const [currentView, setCurrentView] = useState('guest'); // 'guest', 'admin', 'projector'
  
  // Initialize with saved local storage or rich defaults
  const [weddingSettings, setWeddingSettings] = useState(() => {
    try {
      const local = localStorage.getItem('wedding_settings');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Failed reading wedding_settings from localStorage', e);
    }
    return defaultWeddingData;
  });

  const [templates, setTemplates] = useState(() => {
    try {
      const local = localStorage.getItem('wedding_templates');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Failed reading wedding_templates from localStorage', e);
    }
    return defaultWeddingData.templates;
  });

  const [memories, setMemories] = useState(() => {
    try {
      const local = localStorage.getItem('wedding_memories');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Failed reading wedding_memories from localStorage', e);
    }
    return defaultWeddingData.memories;
  });

  const [likedMemoryIds, setLikedMemoryIds] = useState(() => {
    try {
      const local = localStorage.getItem('user_liked_memories');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Failed reading liked memories', e);
    }
    return [];
  });

  const [latestMemory, setLatestMemory] = useState(null);
  const [isConnected, setIsConnected] = useState(true);

  // Sync route on hash change
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

  // 1. Persistent Storage & Cloud Sync Engine
  useEffect(() => {
    const syncData = async () => {
      try {
        const cloudMems = await fetchOnlineMemories();
        if (Array.isArray(cloudMems) && cloudMems.length > 0) {
          setMemories((prev) => {
            const merged = mergeMemories(prev, cloudMems);
            if (JSON.stringify(prev) !== JSON.stringify(merged)) {
              return merged;
            }
            return prev;
          });
          setIsConnected(true);
        }
      } catch (e) {
        console.warn('Sync loop error:', e);
      }
    };

    // Initial load immediately from IndexedDB & Cloud
    syncData();

    // Polling interval (every 8 seconds)
    const interval = setInterval(syncData, 8000);

    // Sync on window focus / tab visibility change
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncData();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', syncData);

    // Tab-to-Tab instant synchronization via BroadcastChannel
    const unsubscribeBroadcast = onMemoryBroadcast((data) => {
      if (data?.type === 'MEMORY_SAVED' && data.memory) {
        setLatestMemory(data.memory);
        setMemories((prev) => mergeMemories(prev, [data.memory]));
      } else if (data?.type === 'MEMORY_DELETED' && data.id) {
        setMemories((prev) => prev.filter((m) => m.id !== data.id));
      }
    });

    // Supabase Realtime — instant cross-device sync when a new photo is uploaded
    const unsubscribeSupabase = subscribeToMemories((newMem) => {
      setLatestMemory(newMem);
      setMemories((prev) => mergeMemories(prev, [newMem]));
    });

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', syncData);
      unsubscribeBroadcast();
      unsubscribeSupabase();
    };
  }, []);

  // 2. Socket Listeners (for Local Dev or WebSocket Backend)
  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {};

    const onMemoryNew = (newMem) => {
      setLatestMemory(newMem);
      setMemories((prev) => mergeMemories(prev, [newMem]));
    };

    const onMemoryLiked = ({ id, likesCount }) => {
      setMemories((prev) => {
        return prev.map((m) => (m.id === id ? { ...m, likesCount } : m));
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('memory:new', onMemoryNew);
    socket.on('memory:liked', onMemoryLiked);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('memory:new', onMemoryNew);
      socket.off('memory:liked', onMemoryLiked);
    };
  }, []);

  // Handle adding new guest memory persistently across all devices
  const handleAddNewMemory = async (newMem) => {
    if (!newMem) return;
    setLatestMemory(newMem);
    setMemories((prev) => mergeMemories(prev, [newMem]));

    // Save to IndexedDB and push to cloud
    await saveMemoryOnline(newMem);
  };

  // Toggle Love / Unlove per client and sync to cloud
  const handleLikeMemory = async (id) => {
    const isAlreadyLiked = likedMemoryIds.includes(id);
    const nextLikedIds = isAlreadyLiked
      ? likedMemoryIds.filter((mId) => mId !== id)
      : [...likedMemoryIds, id];

    setLikedMemoryIds(nextLikedIds);
    try {
      localStorage.setItem('user_liked_memories', JSON.stringify(nextLikedIds));
    } catch (e) {}

    // Optimistic UI update
    setMemories((prev) => {
      return prev.map((m) => {
        if (m.id === id) {
          const delta = isAlreadyLiked ? -1 : 1;
          const count = Math.max(0, (m.likesCount || 0) + delta);
          return { ...m, likesCount: count };
        }
        return m;
      });
    });

    // Sync like to IndexedDB and cloud
    await toggleLikeOnline(id, !isAlreadyLiked);
  };

  const handleDeleteMemory = async (id) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
    await deleteMemoryOnline(id);
  };

  const handlePinMemory = async (_id) => {
    // Pin feature reserved for future implementation
  };

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
