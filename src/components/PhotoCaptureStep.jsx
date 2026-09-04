import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCw, Trash2, Zap, Sparkles, Check, RefreshCw, ZoomIn, ZoomOut, Sliders } from 'lucide-react';

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
}) {
  const [activeSlot, setActiveSlot] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [flash, setFlash] = useState(false);
  
  // Adjust Photo Modal State
  const [adjustingSlot, setAdjustingSlot] = useState(null);
  const [adjustZoom, setAdjustZoom] = useState(1);
  const [adjustPan, setAdjustPan] = useState({ x: 0, y: 0 });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (mode = facingMode) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera access error:', err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takePhotoWithCountdown = () => {
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
    if (!videoRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;
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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhotos = [...photos];
        newPhotos[activeSlot] = event.target.result;
        setPhotos(newPhotos);
        if (activeSlot < slotCount - 1) {
          setActiveSlot(activeSlot + 1);
        }
      };
      reader.readAsDataURL(file);
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
      {/* Viewfinder Header info */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#263727] font-cinzel">
          Foto {activeSlot + 1} dari {slotCount}
        </span>
        <span className="text-[11px] text-[#999794]">
          {photos.filter(Boolean).length} / {slotCount} Foto terisi
        </span>
      </div>

      {/* Main Viewfinder Box */}
      <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#1a231b] border border-[#E9DDC5] shadow-inner flex items-center justify-center">
        {/* Flash Effect */}
        {flash && <div className="absolute inset-0 bg-white z-40 animate-pulse" />}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-xs flex items-center justify-center">
            <span className="text-7xl font-cinzel font-bold text-[#F6F4EE] animate-bounce">
              {countdown}
            </span>
          </div>
        )}

        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <Camera className="w-10 h-10 text-[#999794] mx-auto opacity-50" />
            <p className="text-xs text-[#F6F4EE]/70 max-w-[200px]">
              Kamera tidak aktif atau belum diizinkan. Gunakan tombol galeri di bawah.
            </p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-4 py-2 rounded-full bg-[#F6F4EE] text-[#263727] text-xs font-semibold hover:bg-white shadow"
            >
              Aktifkan Kamera
            </button>
          </div>
        )}

        {/* Viewfinder Top Controls */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="pointer-events-auto w-9 h-9 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/60 shadow"
            title="Pindah Kamera Depan/Belakang"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-black/40 text-white backdrop-blur-md text-xs font-medium flex items-center gap-1.5 hover:bg-black/60 shadow"
          >
            <Upload className="w-3.5 h-3.5" /> Galeri
          </button>
        </div>

        {/* Center Guide Marks */}
        <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-6 rounded-xl" />
      </div>

      {/* Capture Shutter & Action Bar */}
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

      {/* Slots Preview Strip */}
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

      {/* Filter Selection Chips */}
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
