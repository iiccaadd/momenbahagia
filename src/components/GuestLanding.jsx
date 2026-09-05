import React, { useState, useRef, useEffect } from 'react';
import { Camera, Volume2, VolumeX, Lock, Tv, Sparkles, X, ArrowLeft, Heart, Mail, Clock, CheckCircle2 } from 'lucide-react';
import ExploreMemories from './ExploreMemories';
import AddMemoryModal from './AddMemoryModal';
import PolaroidIntro from './PolaroidIntro';
import { isDummyMemory } from '../services/dbStorage';
import { useUploadLimit } from '../hooks/useUploadLimit';

export default function GuestLanding({
  weddingSettings,
  templates = [],
  memories = [],
  onLikeMemory,
  likedMemoryIds = [],
  onAddMemory,
  onOpenAdmin,
  onOpenProjector,
  isConnected = false,
  syncCount = 0,
}) {
  const validMemories = (memories || []).filter((m) => !isDummyMemory(m));
  const {
    uploadCount,
    isLimitReached,
    isCoolingDown,
    formattedCooldown,
    remainingUploads,
    recordUpload,
  } = useUploadLimit();
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const audioRef = useRef(null);

  const couple = weddingSettings?.couple || {
    groomName: "Irsyad",
    brideName: "Adisty",
    displayNames: "Adisty & Irsyad",
    formattedDate: "11 November 2026",
    subtitle: "WEDDING MEMORIES",
    tagline: "ABADIKAN SETIAP MOMEN INDAH DAN CIPTAKAN KENANGAN BERSAMA",
    quote: "LET’S CELEBRATE THIS DAY THROUGH YOUR EYES",
    heroImage: "/uploads/covers/1787992347172-237784708.jpg",
    bgmUrl: "/uploads/audio/1788001682912-733496316.mp3",
    bgmTitle: "PARAMORE-The_Only_Exception_.mp3",
  };

  const toggleBgm = () => {
    if (!audioRef.current) return;
    if (isPlayingBgm) {
      audioRef.current.pause();
      setIsPlayingBgm(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingBgm(true);
      }).catch((e) => {
        console.log("Audio play error:", e);
      });
    }
  };

  // Lock background scrolling when explore or add modal is open
  useEffect(() => {
    if (isExploreOpen || isAddModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isExploreOpen, isAddModalOpen]);

  const handleEnvelopeOpened = () => {
    setIsIntroOpen(false);
    // Automatically attempt to play music on user gesture
    if (audioRef.current && !isPlayingBgm) {
      audioRef.current.play().then(() => {
        setIsPlayingBgm(true);
      }).catch((e) => {
        console.log("Auto play prevented:", e);
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F4EE] flex flex-col items-center justify-center p-0 sm:py-6 select-none font-body text-[#000000]">
      {/* Background BGM Audio Element */}
      {couple.bgmUrl && (
        <audio
          ref={audioRef}
          src={couple.bgmUrl}
          loop
          preload="auto"
        />
      )}

      {/* 1. Animated Interactive Polaroid Camera Intro Screen */}
      {isIntroOpen && (
        <PolaroidIntro
          couple={couple}
          onOpenComplete={handleEnvelopeOpened}
        />
      )}

      {/* Floating Top Nav / Control Badges */}
      <header className="fixed top-3 inset-x-3 sm:inset-x-6 z-40 flex items-center justify-between pointer-events-none">
        {/* Clean Live Status Badge */}
        <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md text-[#F6F4EE] text-[11px] font-medium shadow-md bg-black/45">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`}></span>
          <span className="opacity-90 tracking-wide font-cinzel text-[10px]">LIVE WEDDING</span>
        </div>

        {/* Quick Actions for Guests (Replay Polaroid Intro, BGM Toggle) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Re-open Polaroid Intro Button */}
          <button
            type="button"
            onClick={() => setIsIntroOpen(true)}
            className="p-2.5 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md shadow-md transition-all"
            title="Buka Ulang Kamera Polaroid"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* BGM Toggle Button */}
          {couple.bgmUrl && (
            <button
              type="button"
              onClick={toggleBgm}
              className={`p-2.5 rounded-full backdrop-blur-md shadow-md transition-all ${
                isPlayingBgm
                  ? 'bg-[#263727] text-[#F6F4EE] ring-2 ring-[#E9DDC5]'
                  : 'bg-black/45 text-white hover:bg-black/65'
              }`}
              title={isPlayingBgm ? 'Matikan Musik' : 'Putar Musik Romantis'}
            >
              {isPlayingBgm ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Cover Container - Styled after KisahKekal High-End Mobile Shell */}
      <main className="w-full max-w-[420px] bg-[#F6F4EE] shadow-2xl relative flex flex-col min-h-screen sm:min-h-0 sm:rounded-[32px] overflow-hidden border border-[#E9DDC5]/60">
        {/* Top Couple Photo Header with Dark Vignette */}
        <div className="relative w-full aspect-[9/11] max-h-[500px] overflow-hidden bg-[#263727]">
          <img
            src={couple.heroImage || "/assets/sample_couple.jpg"}
            alt={couple.displayNames}
            className="w-full h-full object-cover object-center"
          />

          {/* Vignette & Soft Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/65" />

          {/* Top Header Title Overlay */}
          <div className="absolute top-12 inset-x-0 text-center px-4 space-y-1 z-10">
            <h3 className="text-[#F6F4EE] text-xs sm:text-sm font-cinzel font-semibold tracking-[0.2em] drop-shadow-md">
              {couple.subtitle || "WEDDING MEMORIES"}
            </h3>
            <h1 className="text-[#F6F4EE] font-script text-4xl sm:text-5xl drop-shadow-lg tracking-wide py-1 text-center">
              {couple.displayNames || "Adisty & Irsyad"}
            </h1>
          </div>

          {/* Bottom Hero Overlay (Date & Tagline) */}
          <div className="absolute bottom-5 inset-x-0 px-5 flex items-end justify-between text-[#F6F4EE] z-10">
            <div className="text-[11px] sm:text-xs font-cinzel font-medium tracking-[0.16em] drop-shadow-md">
              {couple.formattedDate || "11 November 2026"}
            </div>
            <div className="text-[9px] uppercase font-sans tracking-widest text-right max-w-[160px] leading-tight drop-shadow-md opacity-90">
              {couple.tagline || "ABADIKAN SETIAP MOMEN INDAH DAN CIPTAKAN KENANGAN BERSAMA"}
            </div>
          </div>
        </div>

        {/* Minimalist Ornamental Divider */}
        <div className="w-full py-1.5 flex items-center justify-center bg-[#F6F4EE]">
          <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-[#263727]/30 to-transparent" />
        </div>

        {/* Bottom Action Area (KisahKekal Style) */}
        <div className="px-6 py-6 flex-1 flex flex-col items-center justify-between text-center space-y-5 bg-[#F6F4EE]">
          {/* Quote & Message */}
          <div className="space-y-2 max-w-[320px]">
            <p className="font-cinzel text-xs sm:text-sm tracking-[0.08em] font-semibold text-[#263727] uppercase leading-relaxed">
              {couple.quote || "LET’S CELEBRATE THIS DAY THROUGH YOUR EYES"}
            </p>
            <div className="w-12 h-[1px] bg-[#263727]/20 mx-auto" />
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3 pt-2">
            {isLimitReached ? (
              /* Apabila batas upload sudah sampai 3 kali: HILANGKAN TOMBOL UPLOAD FOTO */
              <div className="space-y-3 animate-wmfadein">
                <div className="w-full py-3.5 px-4 rounded-xl bg-[#263727]/10 border border-[#263727]/20 text-[#263727] flex flex-col items-center justify-center gap-1 shadow-xs text-center">
                  <div className="flex items-center gap-1.5 font-cinzel font-bold text-xs tracking-wider uppercase">
                    <CheckCircle2 className="w-4 h-4 text-[#263727]" />
                    Batas Upload Tercapai (3/3)
                  </div>
                  <p className="text-[11px] text-[#263727]/80 font-serif italic">
                    Terima kasih telah berbagi kenangan indah bersama kami! ✨
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className="w-full py-3.5 rounded-lg bg-[#263727] hover:bg-[#1d2b1e] text-[#F6F4EE] font-cinzel font-semibold text-xs sm:text-sm tracking-[0.12em] uppercase shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#E9DDC5]" />
                  Jelajahi Kenangan ({validMemories.length})
                </button>
              </div>
            ) : isCoolingDown ? (
              /* Batasan waktu selama 5 menit setelah tamu upload */
              <div className="space-y-2 animate-wmfadein">
                <button
                  type="button"
                  disabled
                  className="w-full py-4 rounded-lg bg-[#263727]/50 text-[#F6F4EE]/90 font-cinzel font-semibold text-xs sm:text-sm tracking-[0.12em] uppercase shadow-sm cursor-not-allowed flex items-center justify-center gap-2 border border-[#263727]/30"
                  title="Harap menunggu 5 menit sebelum dapat mengupload momen berikutnya"
                >
                  <Clock className="w-4 h-4 animate-pulse text-[#E9DDC5]" />
                  TUNGGU {formattedCooldown} (SESI {uploadCount}/3)
                </button>
                <p className="text-[10.5px] text-[#8c827a] font-cinzel tracking-wider">
                  Jeda 5 menit antar upload • Tersisa {remainingUploads} kesempatan
                </p>

                {/* Secondary Link: Jelajahi Kenangan */}
                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className="w-full py-2 text-xs font-semibold text-[#263727] hover:text-[#1d2b1e] tracking-[0.06em] uppercase underline underline-offset-4 transition-colors"
                >
                  Jelajahi Kenangan ({validMemories.length})
                </button>
              </div>
            ) : (
              /* Tombol Upload Normal (Belum 3 kali dan tidak sedang cooldown) */
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full py-4 rounded-lg bg-[#263727] hover:bg-[#1d2b1e] text-[#F6F4EE] font-cinzel font-semibold text-sm sm:text-base tracking-[0.12em] uppercase shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-98 flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  TAMBAHKAN MOMEN {uploadCount > 0 ? `(${uploadCount}/3)` : ''}
                </button>

                {/* Secondary Link: Jelajahi Kenangan */}
                <button
                  type="button"
                  onClick={() => setIsExploreOpen(true)}
                  className="w-full py-2 text-xs font-semibold text-[#263727] hover:text-[#1d2b1e] tracking-[0.06em] uppercase underline underline-offset-4 transition-colors"
                >
                  Jelajahi Kenangan ({validMemories.length})
                </button>
              </div>
            )}
          </div>

          {/* Subtle Watermark Footer */}
          <div className="pt-2 flex items-center justify-center gap-1.5">
            <span className="text-[10px] tracking-widest text-[#999794] uppercase font-cinzel">
              Wedding Memories • {couple.displayNames || `${couple.brideName || 'Adisty'} & ${couple.groomName || 'Irsyad'}`}
            </span>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="p-1 text-[#999794]/30 hover:text-[#263727] transition-colors"
              title="Akses Panitia"
            >
              <Lock className="w-2.5 h-2.5 opacity-30 hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </main>

      {/* Explore Memories Slide-Over Drawer Modal */}
      {isExploreOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 animate-wmfadein">
          <div className="w-full max-w-lg bg-[#F6F4EE] rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-[#E9DDC5] max-h-[92vh] flex flex-col overflow-hidden animate-wmsheetin">
            {/* Modal Header - Centered Wedding Album style with Zenaida Script */}
            <div className="relative px-4 sm:px-6 py-4 bg-[#F6F4EE] border-b border-[#E9DDC5] flex items-center justify-between">
              {/* Back Arrow Button on Left */}
              <button
                type="button"
                onClick={() => setIsExploreOpen(false)}
                className="w-9 h-9 rounded-full bg-[#E9DDC5]/50 text-[#263727] flex items-center justify-center hover:bg-[#E9DDC5] transition-colors shadow-xs"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Centered Header Text */}
              <div className="flex-1 text-center px-2 space-y-0.5">
                <span className="text-[11px] sm:text-xs font-bold tracking-[0.25em] text-[#263727] uppercase font-cinzel block">
                  WEDDING ALBUM
                </span>
                <h2 className="font-zenaida text-3xl sm:text-4xl text-[#263727] tracking-wide leading-none py-0.5">
                  {couple.brideName || 'Adisty'} & {couple.groomName || 'Irsyad'}
                </h2>
                <span className="text-[9px] sm:text-[10px] tracking-[0.2em] text-[#8c827a] uppercase font-cinzel font-medium block">
                  {couple.formattedDate || "11 NOVEMBER 2026"}
                </span>
              </div>

              {/* Close Button on Right */}
              <button
                type="button"
                onClick={() => setIsExploreOpen(false)}
                className="w-9 h-9 rounded-full bg-[#E9DDC5]/50 text-[#263727] flex items-center justify-center hover:bg-[#E9DDC5] transition-colors shadow-xs"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1">
              <ExploreMemories
                memories={validMemories}
                onLike={onLikeMemory}
                likedMemoryIds={likedMemoryIds}
                couple={couple}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Memory 4-Step Workflow Modal */}
      <AddMemoryModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsExploreOpen(true);
        }}
        weddingSettings={weddingSettings || { couple }}
        templates={templates}
        onMemorySubmitted={async (newMem) => {
          recordUpload();
          if (onAddMemory) {
            await onAddMemory(newMem);
          }
        }}
      />
    </div>
  );
}
