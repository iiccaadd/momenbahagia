import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import GuestLanding from './components/GuestLanding';
import AdminPanel from './components/AdminPanel';
import ProjectorView from './components/ProjectorView';
import { defaultWeddingData } from './defaultData';

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

  const [latestMemory, setLatestMemory] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Track liked memories for single love / unlove functionality
  const [likedMemoryIds, setLikedMemoryIds] = useState(() => {
    try {
      const local = localStorage.getItem('user_liked_memories');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.warn('Failed reading user_liked_memories', e);
    }
    return [];
  });

  // Sync with URL Hash or path for direct routing (e.g. /#admin or /#projector)
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

  // Initial Fetch & Socket Listeners
  useEffect(() => {
    // 1. Fetch REST Fallback (if backend is active)
    fetch('/api/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setWeddingSettings(res.data);
          try { localStorage.setItem('wedding_settings', JSON.stringify(res.data)); } catch (e) {}
          if (res.data.templates) {
            setTemplates(res.data.templates);
            try { localStorage.setItem('wedding_templates', JSON.stringify(res.data.templates)); } catch (e) {}
          }
        }
      })
      .catch(() => {
        // Standalone/Offline mode fallback
      });

    fetch('/api/memories')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setMemories((prev) => {
            const serverMap = new Map(res.data.map((m) => [m.id, m]));
            const localOnly = prev.filter((m) => !serverMap.has(m.id));
            const merged = [...res.data, ...localOnly];
            try { localStorage.setItem('wedding_memories', JSON.stringify(merged)); } catch (e) {}
            return merged;
          });
        }
      })
      .catch(() => {
        // Standalone/Offline mode fallback
      });

    // 2. Realtime Socket Setup
    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onInitData = (data) => {
      if (data.settings) {
        setWeddingSettings(data.settings);
        if (data.settings.templates) setTemplates(data.settings.templates);
      }
      if (data.memories && Array.isArray(data.memories)) {
        setMemories((prev) => {
          const serverMap = new Map(data.memories.map((m) => [m.id, m]));
          const localOnly = prev.filter((m) => !serverMap.has(m.id));
          const merged = [...data.memories, ...localOnly];
          try { localStorage.setItem('wedding_memories', JSON.stringify(merged)); } catch (e) {}
          return merged;
        });
      }
    };

    const onSettingsUpdated = (newSettings) => {
      setWeddingSettings(newSettings);
      if (newSettings.templates) setTemplates(newSettings.templates);
    };

    const onMemoriesUpdated = (newMemories) => {
      if (Array.isArray(newMemories)) {
        setMemories((prev) => {
          const serverMap = new Map(newMemories.map((m) => [m.id, m]));
          const localOnly = prev.filter((m) => !serverMap.has(m.id));
          const merged = [...newMemories, ...localOnly];
          try { localStorage.setItem('wedding_memories', JSON.stringify(merged)); } catch (e) {}
          return merged;
        });
      }
    };

    const onMemoryNew = (newMem) => {
      setLatestMemory(newMem);
      setMemories((prev) => {
        const exists = prev.some((m) => m.id === newMem.id);
        const updated = exists ? prev.map((m) => (m.id === newMem.id ? newMem : m)) : [newMem, ...prev];
        try { localStorage.setItem('wedding_memories', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
    };

    const onMemoryLiked = ({ id, likesCount }) => {
      setMemories((prev) => {
        const updated = prev.map((m) => (m.id === id ? { ...m, likesCount } : m));
        try { localStorage.setItem('wedding_memories', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('init:data', onInitData);
    socket.on('settings:updated', onSettingsUpdated);
    socket.on('memories:updated', onMemoriesUpdated);
    socket.on('memory:new', onMemoryNew);
    socket.on('memory:liked', onMemoryLiked);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('init:data', onInitData);
      socket.off('settings:updated', onSettingsUpdated);
      socket.off('memories:updated', onMemoriesUpdated);
      socket.off('memory:new', onMemoryNew);
      socket.off('memory:liked', onMemoryLiked);
    };
  }, []);

  // Handle adding new guest memory persistently
  const handleAddNewMemory = (newMem) => {
    if (!newMem) return;
    setLatestMemory(newMem);
    setMemories((prev) => {
      const exists = prev.some((m) => m.id === newMem.id);
      const updated = exists ? prev.map((m) => (m.id === newMem.id ? newMem : m)) : [newMem, ...prev];
      try {
        localStorage.setItem('wedding_memories', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Toggle Love / Unlove per client
  const handleLikeMemory = async (id) => {
    const isAlreadyLiked = likedMemoryIds.includes(id);
    const nextLikedIds = isAlreadyLiked
      ? likedMemoryIds.filter((mId) => mId !== id)
      : [...likedMemoryIds, id];

    setLikedMemoryIds(nextLikedIds);
    try {
      localStorage.setItem('user_liked_memories', JSON.stringify(nextLikedIds));
    } catch (e) {}

    // Optimistic UI update for likesCount
    setMemories((prev) => {
      const updated = prev.map((m) => {
        if (m.id === id) {
          const delta = isAlreadyLiked ? -1 : 1;
          const count = Math.max(0, (m.likesCount || 0) + delta);
          return { ...m, likesCount: count };
        }
        return m;
      });
      try {
        localStorage.setItem('wedding_memories', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    try {
      const res = await fetch(`/api/memories/${id}/like`, { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        setMemories((prev) => {
          const updated = prev.map((m) => (m.id === id ? { ...m, likesCount: json.data.likesCount } : m));
          try {
            localStorage.setItem('wedding_memories', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    } catch (err) {
      console.warn('Like request network error (handled locally):', err);
    }
  };

  const handleDeleteMemory = async (id) => {
    setMemories((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try { localStorage.setItem('wedding_memories', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  const handlePinMemory = async (id) => {
    try {
      await fetch(`/api/memories/${id}/pin`, { method: 'POST' });
    } catch (err) {
      console.error('Error pinning memory:', err);
    }
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
