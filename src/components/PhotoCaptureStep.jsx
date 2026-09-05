import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCw, Trash2, AlertCircle, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';

const FILTERS = [
  { id: 'normal', name: 'Original', style: 'none' },
  { id: 'bw', name: 'Black & White', style: 'grayscale(100%) contrast(115%)' },
  { id: 'vintage', name: 'Vintage (Sepia)', style: 'sepia(45%) contrast(110%) saturate(85%)' },
];

export default function PhotoCaptureStep({
  photos = [],
  setPhotos,
  activeFilter = 'normal',
  setActiveFilter,
  slotCount = 3,
  weddingSettings,
}) {
  const notify = useNotify();
  const [activeSlot, setActiveSlot] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [flash, setFlash] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Derive wedding couple title
  const groomName = weddingSettings?.couple?.groomName || "Irsyad";
  const brideName = weddingSettings?.couple?.brideName || "Adisty";
  const weddingTitle = `${groomName} & ${brideName}`;

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (mode = facingMode) => {
    stopCamera();
    setCameraError(null);
    setIsStartingCamera(true);

    let stream = null;

    // Multi-tier fallback to ensure camera compatibility across all devices/browsers
    try {
      // 1. Try ideal resolution with specified facing mode
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
    } catch (err1) {
      console.warn('Initial camera constraint failed, attempting facingMode fallback:', err1);
      try {
        // 2. Try simple facingMode
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
          audio: false,
        });
      } catch (err2) {
        console.warn('facingMode fallback failed, attempting basic video:', err2);
        try {
          // 3. Try standard basic video (best for desktops, laptops, custom webcams)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err3) {
          console.error('All camera initialization attempts failed:', err3);
          let userMsg = 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser Anda.';
          if (err3.name === 'NotAllowedError' || err3.name === 'PermissionDeniedError') {
            userMsg = 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser atau klik "Coba Izinkan Kamera".';
          } else if (err3.name === 'NotFoundError' || err3.name === 'DevicesNotFoundError') {
            userMsg = 'Perangkat kamera tidak terdeteksi pada perangkat ini.';
          } else if (err3.name === 'NotReadableError' || err3.name === 'TrackStartError') {
            userMsg = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.';
          }
          setCameraError(userMsg);
          setIsCameraActive(false);
          setIsStartingCamera(false);
          return;
        }
      }
    }

    if (stream) {
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video auto-play warning:', playErr);
        }
      }
      setIsCameraActive(true);
      setCameraError(null);
    }
    setIsStartingCamera(false);
  };

  // Re-attach stream when element mounts or updates
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(console.warn);
    }
  }, [isCameraActive]);

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const processImageFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Max dimension 1000px for high quality with low footprint
          const maxDim = 1000;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        };
        img.onerror = () => reject(new Error('Gagal memproses gambar'));
        img.src = event.target.result;
      };
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    });
  };

  const takePhotoWithCountdown = () => {
    const video = videoRef.current;
    if (!isCameraActive || !video || video.readyState < 2 || !video.videoWidth) {
      notify?.warning?.('Kamera belum aktif atau belum siap. Silakan izinkan akses kamera atau pilih foto dari Galeri.', 'Kamera Belum Siap');
      fileInputRef.current?.click();
      return;
    }

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          captureCurrentFrame();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const captureCurrentFrame = () => {
    const video = videoRef.current;
    if (!video || !isCameraActive || video.readyState < 2 || !video.videoWidth) {
      notify?.warning?.('Frame kamera belum siap. Silakan coba kembali atau pilih foto dari Galeri.', 'Kamera Belum Siap');
      return;
    }

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const newPhotos = [...photos];
    newPhotos[activeSlot] = dataUrl;
    setPhotos(newPhotos);

    // Auto move to next empty slot
    if (activeSlot < slotCount - 1) {
      setActiveSlot(activeSlot + 1);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const newPhotos = [...photos];
      let startSlot = activeSlot;

      // If user uploaded multiple files (e.g. 3 files), fill consecutive slots
      for (let i = 0; i < files.length && (startSlot + i) < slotCount; i++) {
        const dataUrl = await processImageFile(files[i]);
        newPhotos[startSlot + i] = dataUrl;
      }

      setPhotos(newPhotos);

      // Advance to next empty slot or last slot
      const nextEmpty = newPhotos.findIndex((p) => !p);
      if (nextEmpty !== -1) {
        setActiveSlot(nextEmpty);
      } else {
        setActiveSlot(Math.min(slotCount - 1, startSlot + files.length));
      }
    } catch (err) {
      console.error('Upload photo error:', err);
      notify?.warning?.('Gagal memproses file foto. Pastikan format file adalah gambar (JPG/PNG/WebP).', 'Format Foto');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleDeletePhoto = (slotIndex, e) => {
    e.stopPropagation();
    const newPhotos = [...photos];
    newPhotos[slotIndex] = null;
    setPhotos(newPhotos);
    setActiveSlot(slotIndex);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header The Wedding of Nama Mempelai */}
      <div className="text-center pb-1 border-b border-[#E9DDC5]/70">
        <p className="text-[10px] tracking-[0.22em] text-[#999794] uppercase font-cinzel font-semibold">
          THE WEDDING OF
        </p>
        <h4 className="font-playfair italic text-lg sm:text-xl font-bold text-[#263727] tracking-wide mt-0.5">
          {weddingTitle}
        </h4>
      </div>

      {/* 2. Viewfinder Slot Info */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#263727] font-cinzel">
          Foto {activeSlot + 1} dari {slotCount}
        </span>
        <span className="text-[11px] text-[#999794]">
          {photos.filter(Boolean).length} / {slotCount} Foto terisi
        </span>
      </div>

      {/* 3. Main Viewfinder Box */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#1a231b] border border-[#E9DDC5] shadow-inner flex items-center justify-center">
        {/* Flash Effect */}
        {flash && <div className="absolute inset-0 bg-white z-40 animate-pulse" />}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex items-center justify-center">
            <span className="text-7xl font-cinzel font-bold text-[#F6F4EE] animate-bounce">
              {countdown}
            </span>
          </div>
        )}

        {/* Live Camera Video (Always mounted to retain DOM ref) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            if (videoRef.current) videoRef.current.play().catch(console.warn);
          }}
          onCanPlay={() => {
            if (videoRef.current) videoRef.current.play().catch(console.warn);
          }}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Fallback & Error State Overlay (when camera is inactive/error) */}
        {!isCameraActive && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-[#1a231b]/95 space-y-3">
            {cameraError ? (
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto animate-pulse" />
            ) : (
              <Camera className="w-10 h-10 text-[#999794] mx-auto opacity-70" />
            )}

            <div className="space-y-1 max-w-[280px]">
              <p className="text-xs font-medium text-[#F6F4EE]">
                {cameraError || 'Kamera sedang disiapkan...'}
              </p>
              <p className="text-[11px] text-[#F6F4EE]/60">
                Atau Anda juga dapat mengunggah foto langsung dari Galeri HP/Komputer.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                disabled={isStartingCamera}
                className="px-4 py-2 rounded-full bg-[#F6F4EE] text-[#263727] text-xs font-semibold hover:bg-white shadow flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isStartingCamera ? 'animate-spin' : ''}`} />
                {isStartingCamera ? 'Menghubungkan...' : 'Coba Aktifkan Kamera'}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-white/20 text-[#F6F4EE] text-xs font-medium hover:bg-white/30 shadow flex items-center gap-1.5 transition-transform active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" /> Pilih dari Galeri
              </button>
            </div>
          </div>
        )}

        {/* Viewfinder Top Controls */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/60 shadow transition-transform active:scale-95"
            title="Pindah Kamera Depan/Belakang"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-black/40 text-white backdrop-blur-md text-xs font-medium flex items-center gap-1.5 hover:bg-black/60 shadow transition-transform active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" /> Galeri
          </button>
        </div>

        {/* Center Guide Frame */}
        <div className="absolute inset-0 pointer-events-none border border-white/20 m-6 rounded-xl" />
      </div>

      {/* 4. Capture Shutter Button */}
      <div className="flex items-center justify-center py-1">
        <button
          type="button"
          onClick={takePhotoWithCountdown}
          disabled={countdown !== null}
          className="relative w-16 h-16 rounded-full bg-[#263727] p-1 shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center disabled:opacity-50"
        >
          <div className="w-13 h-13 rounded-full border-2 border-[#F6F4EE] bg-[#263727] flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#F6F4EE]" />
          </div>
        </button>
      </div>

      {/* 5. Slots Preview Strip */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-[#263727] uppercase tracking-wider font-cinzel">
          Slot Foto ({slotCount} Foto):
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[...Array(slotCount)].map((_, idx) => {
            const hasPhoto = !!photos[idx];
            const isCurrent = activeSlot === idx;

            return (
              <div
                key={idx}
                onClick={() => setActiveSlot(idx)}
                className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-[#263727] ring-2 ring-[#263727]/30 bg-[#F6F4EE]'
                    : 'border-[#E9DDC5] bg-[#FAFAF3] opacity-80'
                }`}
              >
                {hasPhoto ? (
                  <>
                    <img
                      src={photos[idx]}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                      style={{
                        filter: FILTERS.find((f) => f.id === activeFilter)?.style || 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => handleDeletePhoto(idx, e)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-rose-600 transition-colors"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#999794] text-xs">
                    <Camera className="w-4 h-4 mb-0.5 opacity-50" />
                    <span>#{idx + 1}</span>
                  </div>
                )}

                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[9px] font-bold">
                  #{idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Filter Selection Chips */}
      <div className="pt-2 border-t border-[#E9DDC5] space-y-2">
        <span className="text-[11px] font-bold text-[#263727] uppercase tracking-wider font-cinzel block">
          Pilih Efek Filter:
        </span>
        <div className="flex gap-2">
          {FILTERS.map((f) => {
            const isSel = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                  isSel
                    ? 'bg-[#263727] text-[#F6F4EE] border-[#263727] shadow-sm'
                    : 'bg-[#F6F4EE] text-[#263727] border-[#E9DDC5] hover:bg-white'
                }`}
              >
                {f.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
