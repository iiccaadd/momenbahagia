import { useState, useEffect, useCallback } from 'react';

export const MAX_GUEST_UPLOADS = 3;
export const GUEST_COOLDOWN_SECONDS = 5 * 60; // 5 menit = 300 detik

const STORAGE_KEY_COUNT = 'wedding_guest_upload_count';
const STORAGE_KEY_LAST_TIME = 'wedding_guest_last_upload_time';

export function getStoredUploadCount() {
  try {
    const val = localStorage.getItem(STORAGE_KEY_COUNT);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

export function getStoredLastUploadTime() {
  try {
    const val = localStorage.getItem(STORAGE_KEY_LAST_TIME);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

export function calculateCooldownRemaining(lastTime) {
  if (!lastTime) return 0;
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastTime) / 1000);
  const remaining = GUEST_COOLDOWN_SECONDS - elapsedSeconds;
  return Math.max(0, remaining);
}

export function formatTimeMMSS(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function useUploadLimit() {
  const [uploadCount, setUploadCount] = useState(() => getStoredUploadCount());
  const [lastUploadTime, setLastUploadTime] = useState(() => getStoredLastUploadTime());
  const [cooldownRemaining, setCooldownRemaining] = useState(() =>
    calculateCooldownRemaining(getStoredLastUploadTime())
  );

  const isLimitReached = uploadCount >= MAX_GUEST_UPLOADS;
  const isCoolingDown = !isLimitReached && cooldownRemaining > 0;
  const remainingUploads = Math.max(0, MAX_GUEST_UPLOADS - uploadCount);

  // Sync state with storage helper
  const syncFromStorage = useCallback(() => {
    const count = getStoredUploadCount();
    const lastTime = getStoredLastUploadTime();
    setUploadCount(count);
    setLastUploadTime(lastTime);
    setCooldownRemaining(calculateCooldownRemaining(lastTime));
  }, []);

  // Timer countdown loop when cooling down
  useEffect(() => {
    if (isLimitReached) {
      setCooldownRemaining(0);
      return;
    }

    const remaining = calculateCooldownRemaining(lastUploadTime);
    setCooldownRemaining(remaining);

    if (remaining <= 0) return;

    const timer = setInterval(() => {
      const currentRemaining = calculateCooldownRemaining(lastUploadTime);
      setCooldownRemaining(currentRemaining);
      if (currentRemaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUploadTime, isLimitReached]);

  // Listen to storage events (multi-tab sync) & window focus
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY_COUNT || e.key === STORAGE_KEY_LAST_TIME) {
        syncFromStorage();
      }
    };
    const handleFocus = () => syncFromStorage();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    // Development / Admin helper to reset limit from browser console
    if (typeof window !== 'undefined') {
      window.resetGuestUploadLimit = () => {
        try {
          localStorage.removeItem(STORAGE_KEY_COUNT);
          localStorage.removeItem(STORAGE_KEY_LAST_TIME);
          syncFromStorage();
          console.log('✨ [Photobooth] Batas upload tamu berhasil direset.');
        } catch (e) {}
      };
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncFromStorage]);

  // Record a successful upload
  const recordUpload = useCallback(() => {
    try {
      const currentCount = getStoredUploadCount();
      const newCount = currentCount + 1;
      const now = Date.now();

      localStorage.setItem(STORAGE_KEY_COUNT, newCount.toString());
      localStorage.setItem(STORAGE_KEY_LAST_TIME, now.toString());

      setUploadCount(newCount);
      setLastUploadTime(now);
      setCooldownRemaining(calculateCooldownRemaining(now));

      return {
        newCount,
        isLimitReached: newCount >= MAX_GUEST_UPLOADS,
      };
    } catch (e) {
      console.warn('Failed to record upload in localStorage:', e);
      return { newCount: uploadCount + 1, isLimitReached: false };
    }
  }, [uploadCount]);

  // Reset upload limit manually
  const resetUploadLimit = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_COUNT);
      localStorage.removeItem(STORAGE_KEY_LAST_TIME);
      syncFromStorage();
    } catch (e) {}
  }, [syncFromStorage]);

  return {
    uploadCount,
    maxUploads: MAX_GUEST_UPLOADS,
    isLimitReached,
    isCoolingDown,
    cooldownRemaining,
    formattedCooldown: formatTimeMMSS(cooldownRemaining),
    remainingUploads,
    recordUpload,
    resetUploadLimit,
  };
}
