import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Download,
  Send,
  Sparkles,
  Heart,
  CheckCircle2,
  Loader2,
  Camera,
  Volume2,
  Check,
  RotateCcw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import VoiceRecorder from './VoiceRecorder';
import TemplateSelector from './TemplateSelector';
import PhotoCaptureStep from './PhotoCaptureStep';
import { renderPhotostrip } from '../utils/canvasExport';
import { useNotify } from '../context/NotificationContext';
import { saveMemoryOnline } from '../services/cloudSync';
import {
  getStoredUploadCount,
  getStoredLastUploadTime,
  calculateCooldownRemaining,
  MAX_GUEST_UPLOADS,
} from '../hooks/useUploadLimit';

export default function AddMemoryModal({
  isOpen,
  onClose,
  weddingSettings,
  templates = [],
  onMemorySubmitted,
}) {
  // Steps:
  // 1: Dari Siapa Kenangan Ini? (Name & Wishes)
  // 2: Pilih Bingkai (Frame Selector)
  // 3: Sesi Foto & Rekam Harapan (Camera & Voice Note)
  // 4: Mencetak Momen & Bagikan (Printing animation, download, submit)
  const [currentStep, setCurrentStep] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [audioData, setAudioData] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0] || null);
  const [photos, setPhotos] = useState([null, null, null]);
  const [activeFilter, setActiveFilter] = useState('normal');
  const [generatedStripUrl, setGeneratedStripUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates]);

  // Adjust photos array length when selected template slotCount changes
  useEffect(() => {
    const count = selectedTemplate?.slotCount || 3;
    setPhotos((prev) => {
      const arr = new Array(count).fill(null);
      for (let i = 0; i < count; i++) {
        if (prev[i]) arr[i] = prev[i];
      }
      return arr;
    });
  }, [selectedTemplate]);

  // Reset modal state, check limits, and lock background scroll when opened
  useEffect(() => {
    if (isOpen) {
      if (currentStep === 1 && !isSubmitting && !isSuccess) {
        const count = getStoredUploadCount();
        if (count >= MAX_GUEST_UPLOADS) {
          notify.info('Batas upload kenangan telah mencapai maksimal 3 kali. Terima kasih!', 'Batas Tercapai');
          onClose();
          return;
        }
        const cooldown = calculateCooldownRemaining(getStoredLastUploadTime());
        if (cooldown > 0) {
          const mins = Math.ceil(cooldown / 60);
          notify.warning(`Harap menunggu waktu jeda ${mins} menit sebelum upload berikutnya.`, 'Waktu Tunggu');
          onClose();
          return;
        }
      }

      setCurrentStep(1);
      setGuestName('');
      setGuestMessage('');
      setPhotos(new Array(selectedTemplate?.slotCount || 3).fill(null));
      setAudioData(null);
      setGeneratedStripUrl(null);
      setIsSuccess(false);
      setIsSubmitting(false);
      setIsPrinting(false);

      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const coupleNames = weddingSettings?.couple?.displayNames || weddingSettings?.displayNames || "Adisty & Irsyad";
  const weddingDate = weddingSettings?.couple?.formattedDate || weddingSettings?.formattedDate || "11 November 2026";
  const slotCount = selectedTemplate?.slotCount || 3;

  // Generate Photostrip Canvas for Step 4
  const generateStrip = async () => {
    if (!selectedTemplate) return;
    setIsGenerating(true);
    setIsPrinting(true);
    try {
      const stripData = await renderPhotostrip({
        template: selectedTemplate,
        photos: photos,
        coupleNames: coupleNames,
        weddingDate: weddingDate,
        guestName: guestName.trim(),
        filter: activeFilter,
        width: 600,
        height: 1800,
      });
      setGeneratedStripUrl(stripData);
    } catch (err) {
      console.error('Error generating photostrip:', err);
    } finally {
      setIsGenerating(false);
      setTimeout(() => setIsPrinting(false), 2000);
    }
  };

  const notify = useNotify();

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!guestName.trim()) {
        notify.warning('Mohon masukkan nama Anda terlebih dahulu sebelum melanjutkan.', 'Nama Diperlukan');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!selectedTemplate) {
        notify.warning('Silakan pilih salah satu frame photobooth terlebih dahulu.', 'Pilih Bingkai');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const filledPhotos = photos.filter(Boolean);
      if (filledPhotos.length === 0) {
        notify.warning('Mohon ambil foto dengan kamera atau unggah minimal 1 foto dari galeri.', 'Foto Diperlukan');
        return;
      }
      setCurrentStep(4);
      generateStrip();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDownloadStrip = () => {
    if (!generatedStripUrl) return;
    const link = document.createElement('a');
    link.href = generatedStripUrl;
    link.download = `wedding-photostrip-${guestName.replace(/\s+/g, '-') || 'memory'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
    });
  };

  const handleSubmitMemory = async () => {
    if (!generatedStripUrl) return;

    // Periksa batas 3 kali upload
    const currentUploadCount = getStoredUploadCount();
    if (currentUploadCount >= MAX_GUEST_UPLOADS) {
      notify.error('Batas upload Anda telah mencapai maksimal 3 kali. Terima kasih!', 'Batas Tercapai');
      onClose();
      return;
    }

    // Periksa jeda cooldown 5 menit
    const remainingCooldown = calculateCooldownRemaining(getStoredLastUploadTime());
    if (remainingCooldown > 0) {
      const mins = Math.ceil(remainingCooldown / 60);
      notify.warning(`Harap menunggu waktu jeda ${mins} menit sebelum mengunggah foto berikutnya.`, 'Waktu Tunggu');
      onClose();
      return;
    }

    setIsSubmitting(true);

    try {
      // Compress the strip image to max ~450px width (~70KB - 100KB JPEG) so Supabase Realtime WebSocket never drops it
      const compressedStrip = await compressBase64Image(generatedStripUrl, 450, 0.78);
      const finalStripImage = (compressedStrip && compressedStrip.startsWith('data:image/') && compressedStrip.length > 500)
        ? compressedStrip
        : generatedStripUrl;

      const memoryData = {
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        guestName: guestName.trim() || 'Tamu Spesial',
        message: guestMessage.trim() || '',
        guestMessage: guestMessage.trim() || '',
        stripImage: finalStripImage,          // ← valid, lightweight photostrip JPEG
        stripUrl: finalStripImage,            // ← backward compatibility
        galleryPhotos: [],                    // ← keep payload under 120KB so Realtime WebSocket and cloud sync never drop columns
        templateId: selectedTemplate?.id || 'classic',
        audioUrl: audioData?.dataUrl || audioData?.url || null,
        audioDuration: audioData?.duration || 0,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        likedIps: [],
        isPinned: false
      };

      // Direct save to local storage & cloud to guarantee persistence
      try {
        await saveMemoryOnline(memoryData);
      } catch (saveErr) {
        console.warn('[AddModal] Direct save warning:', saveErr);
      }

      // Pass to onMemorySubmitted which saves and updates App.jsx memories state
      if (onMemorySubmitted) {
        await onMemorySubmitted(memoryData);
      }

      setIsSuccess(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Submit memory error:', err);
      notify.error('Terjadi kendala saat memproses kenangan Anda. Silakan coba beberapa saat lagi.', 'Gagal Mengirim');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compress base64 image safely to target width and quality without producing empty "data:,"
  async function compressBase64Image(dataUrl, maxWidth = 450, quality = 0.78) {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return dataUrl;
    }

    return new Promise((resolve) => {
      // Safety timeout in case image loading stalls on slow devices
      const timeout = setTimeout(() => resolve(dataUrl), 2500);

      const img = new Image();
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;

          if (!naturalW || !naturalH || naturalW <= 0 || naturalH <= 0) {
            return resolve(dataUrl);
          }

          const scale = Math.min(1, maxWidth / naturalW);
          const w = Math.max(1, Math.round(naturalW * scale));
          const h = Math.max(1, Math.round(naturalH * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          // Fill white background to avoid transparent sections turning black
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          if (compressed && compressed.startsWith('data:image/jpeg') && compressed.length > 500) {
            resolve(compressed);
          } else {
            resolve(dataUrl);
          }
        } catch (e) {
          console.warn('[Compress] Exception during image compression, using original:', e);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        console.warn('[Compress] Failed to load image for compression, using original');
        resolve(dataUrl);
      };

      img.src = dataUrl;
    });
  }


  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-wmfadein select-none">
      <div className="w-full max-w-lg bg-[#F6F4EE] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-[#E9DDC5] max-h-[95vh] flex flex-col overflow-hidden animate-wmsheetin text-[#000000]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#F6F4EE] border-b border-[#E9DDC5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.16em] text-[#999794] uppercase font-cinzel">
              LANGKAH {currentStep} DARI 4
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#E9DDC5]/50 text-[#263727] flex items-center justify-center hover:bg-[#E9DDC5] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: DARI SIAPA KENANGAN INI? */}
          {currentStep === 1 && (
            <div className="space-y-6 py-2">
              <div className="text-center space-y-2">
                <h3 className="font-cinzel font-bold text-xl sm:text-2xl text-[#263727] tracking-[0.06em] uppercase">
                  DARI SIAPA KENANGAN INI?
                </h3>
                <p className="text-xs text-[#999794]">
                  Sampaikan namamu agar tersimpan abadi di hari bahagia mempelai
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-[#263727] uppercase tracking-wider font-cinzel block mb-1">
                    Nama Kamu
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Tulis nama kamu..."
                    autoFocus
                    className="w-full px-4 py-3.5 rounded-xl bg-white border border-[#E9DDC5] focus:outline-none focus:ring-2 focus:ring-[#263727] text-sm text-[#000000] placeholder:text-[#999794]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#263727] uppercase tracking-wider font-cinzel block mb-1">
                    Pesan & Doa Singkat (Opsional)
                  </label>
                  <textarea
                    value={guestMessage}
                    onChange={(e) => setGuestMessage(e.target.value)}
                    placeholder="Tuliskan ucapan selamat atau doa untuk kedua mempelai..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-[#E9DDC5] focus:outline-none focus:ring-2 focus:ring-[#263727] text-sm text-[#000000] placeholder:text-[#999794] resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PILIH BINGKAI */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="font-cinzel font-bold text-lg text-[#263727] tracking-[0.06em] uppercase">
                  PILIH BINGKAI PHOTOBOOTH
                </h3>
                <p className="text-xs text-[#999794]">
                  Pilih format bingkai yang kamu inginkan (Polaroid, 4R, atau Strip)
                </p>
              </div>

              <TemplateSelector
                templates={templates}
                selectedTemplate={selectedTemplate}
                onSelectTemplate={(tpl) => setSelectedTemplate(tpl)}
              />
            </div>
          )}

          {/* STEP 3: SESI FOTO & REKAM HARAPAN */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <PhotoCaptureStep
                photos={photos}
                setPhotos={setPhotos}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                slotCount={slotCount}
                weddingSettings={weddingSettings}
              />

              <VoiceRecorder
                onRecordingComplete={(data) => setAudioData(data)}
                onRemoveAudio={() => setAudioData(null)}
              />
            </div>
          )}

          {/* STEP 4: MENCETAK MOMEN & BAGIKAN */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              {isSuccess ? (
                <div className="py-8 space-y-4 animate-wmfadein">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-emerald-700" />
                  </div>
                  <h3 className="font-cinzel font-bold text-2xl text-[#263727]">
                    Kenangan Berhasil Dikirim! ✨
                  </h3>
                  <p className="text-xs text-[#999794] max-w-xs mx-auto">
                    Terima kasih telah berbagi momen indah bersama kedua mempelai. Foto kamu sudah tampil di layar resepsi!
                  </p>
                </div>
              ) : isPrinting ? (
                /* Animated Printing Sheet Effect (KisahKekal @keyframes wmprint) */
                <div className="py-12 space-y-6">
                  <div className="relative w-48 h-72 mx-auto overflow-hidden bg-black/10 rounded-xl border border-[#E9DDC5] shadow-inner flex items-center justify-center">
                    <div className="absolute inset-x-0 top-0 h-1 bg-[#263727] animate-pulse" />
                    {generatedStripUrl && (
                      <img
                        src={generatedStripUrl}
                        alt="Printing strip"
                        className="w-full h-auto animate-wmprint object-contain"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="font-cinzel font-bold text-base text-[#263727] tracking-wider uppercase block">
                      Mencetak Momen...
                    </span>
                    <span className="text-xs text-[#999794]">
                      Sedang menyusun layout photostrip estetika tinggi
                    </span>
                  </div>
                </div>
              ) : (
                /* Final Photostrip Preview & Share */
                <div className="space-y-5 animate-wmfadein">
                  <div className="text-center space-y-1">
                    <h3 className="font-cinzel font-bold text-lg text-[#263727] tracking-wider uppercase">
                      HASIL PHOTOSTRIP KAMU
                    </h3>
                    <p className="text-xs text-[#999794]">
                      Simpan softfile ke ponselmu dan bagikan langsung ke layar resepsi!
                    </p>
                  </div>

                  {generatedStripUrl && (
                    <div className="max-w-[210px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-[#E9DDC5] bg-black">
                      <img
                        src={generatedStripUrl}
                        alt="Final Photostrip"
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadStrip}
                      className="w-full py-3.5 rounded-xl bg-white border border-[#263727] text-[#263727] hover:bg-[#F6F4EE] font-cinzel font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <Download className="w-4 h-4" /> Unduh Softfile PNG
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitMemory}
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-xl bg-[#263727] hover:bg-[#1d2b1e] text-[#F6F4EE] font-cinzel font-bold text-sm tracking-[0.1em] uppercase shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-98 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Mengirim ke Layar Resepsi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Bagikan Momen & Harapan ✨
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {!isSuccess && !isPrinting && currentStep < 4 && (
          <div className="px-6 py-4 bg-[#F6F4EE] border-t border-[#E9DDC5] flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#263727] hover:bg-[#E9DDC5]/40 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-3 rounded-xl bg-[#263727] hover:bg-[#1d2b1e] text-[#F6F4EE] font-cinzel font-bold text-xs tracking-wider uppercase shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              {currentStep === 3 ? 'Lihat Hasil' : 'Selanjutnya'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
