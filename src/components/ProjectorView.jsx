import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Maximize,
  Minimize,
  Sparkles,
  ArrowLeft,
  Volume2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Heart,
  QrCode,
  SlidersHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ProjectorView({
  weddingSettings,
  memories = [],
  onClose,
  latestMemory,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingSlide, setIsPlayingSlide] = useState(true);
  const [slideDirection, setSlideDirection] = useState('next'); // 'next' or 'prev'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showCelebration, setShowCelebration] = useState(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [activeVoicePlaying, setActiveVoicePlaying] = useState(false);

  const canvasRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const touchStartX = useRef(null);
  const SLIDE_DURATION = 7000; // 7s per slide

  const couple = weddingSettings?.couple || {
    displayNames: "Atikah & Shafiq",
    formattedDate: "08 AUGUST 2026",
    subtitle: "LIVE WEDDING PHOTOBOOTH",
  };

  // Fetch QR Code
  useEffect(() => {
    fetch('/api/qrcode')
      .then((r) => r.json())
      .then((data) => {
        if (data.qrCode) setQrCodeUrl(data.qrCode);
      })
      .catch(console.error);
  }, []);

  // Golden Particles & Floating Petals Physics Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = [];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 4 + 1.5,
        speedX: (Math.random() - 0.5) * 0.4 + 0.2,
        speedY: Math.random() * 0.5 + 0.25,
        opacity: Math.random() * 0.7 + 0.2,
        isPetal: i % 4 === 0,
        angle: Math.random() * 360,
        spinSpeed: (Math.random() - 0.5) * 1.5,
        hue: Math.random() > 0.6 ? 42 : 345,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(p.y * 0.01) * 0.4 + p.speedX;
        p.angle += p.spinSpeed;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 20) p.x = -20;
        if (p.x < -20) p.x = width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);

        if (p.isPetal) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 2.5, p.size * 1.2, 0, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.opacity * 0.65})`;
          ctx.fill();
        } else {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
          gradient.addColorStop(0, `rgba(255, 240, 190, ${p.opacity})`);
          gradient.addColorStop(0.5, `rgba(212, 175, 55, ${p.opacity * 0.45})`);
          gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Slide navigation with direction animation
  const goToNextSlide = useCallback(() => {
    if (memories.length <= 1) return;
    setSlideDirection('next');
    setIsTransitioning(true);
    setSlideProgress(0);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % memories.length);
      setIsTransitioning(false);
    }, 280);
  }, [memories.length]);

  const goToPrevSlide = useCallback(() => {
    if (memories.length <= 1) return;
    setSlideDirection('prev');
    setIsTransitioning(true);
    setSlideProgress(0);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + memories.length) % memories.length);
      setIsTransitioning(false);
    }, 280);
  }, [memories.length]);

  const jumpToSlide = (index) => {
    if (index === currentIndex) return;
    setSlideDirection(index > currentIndex ? 'next' : 'prev');
    setIsTransitioning(true);
    setSlideProgress(0);
    setTimeout(() => {
      setCurrentIndex(index);
      setIsTransitioning(false);
    }, 280);
  };

  // Keyboard navigation (Left/Right Arrow keys, Space for play/pause)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goToNextSlide();
      } else if (e.key === 'ArrowLeft') {
        goToPrevSlide();
      } else if (e.key === ' ') {
        setIsPlayingSlide((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSlide, goToPrevSlide]);

  // Touch Swipe Gesture handler
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNextSlide(); // swipe left -> next
      } else {
        goToPrevSlide(); // swipe right -> prev
      }
    }
    touchStartX.current = null;
  };

  // Slideshow Auto-Timer
  useEffect(() => {
    if (!isPlayingSlide || memories.length <= 1) return;

    let start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION) * 100);
      setSlideProgress(pct);

      if (elapsed >= SLIDE_DURATION) {
        start = Date.now();
        setSlideProgress(0);
        goToNextSlide();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPlayingSlide, memories.length, currentIndex, goToNextSlide]);

  // Real-time celebration when a guest uploads new photostrip
  useEffect(() => {
    if (latestMemory) {
      setShowCelebration(latestMemory);
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      function fire(particleRatio, opts) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
          colors: ['#d4af37', '#eed8b7', '#ff7597', '#ffffff', '#e8dfd5'],
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });

      const timer = setTimeout(() => {
        setShowCelebration(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [latestMemory]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const currentMem = memories[currentIndex] || memories[0];

  const toggleVoiceNote = (url) => {
    if (!voiceAudioRef.current || !url) return;
    if (activeVoicePlaying) {
      voiceAudioRef.current.pause();
      setActiveVoicePlaying(false);
    } else {
      voiceAudioRef.current.src = url;
      voiceAudioRef.current.play().then(() => {
        setActiveVoicePlaying(true);
      }).catch(console.error);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-50 bg-[#0a060d] text-white flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Background Audio Player for Voice Notes */}
      <audio
        ref={voiceAudioRef}
        onEnded={() => setActiveVoicePlaying(false)}
        className="hidden"
      />

      {/* Dynamic Animated Ambient Glow Mesh */}
      <div className="absolute -top-32 -left-32 w-[650px] h-[650px] rounded-full bg-gradient-to-br from-[#852554]/30 to-[#d4af37]/20 blur-[130px] animate-aura-1 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[750px] h-[750px] rounded-full bg-gradient-to-tl from-[#4a1c3d]/40 to-[#c5a880]/20 blur-[140px] animate-aura-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full bg-radial-gradient from-[#2d122b]/40 to-transparent blur-[120px] pointer-events-none" />

      {/* Floating Canvas Physics (Golden Particles & Petals) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10 pointer-events-none"
      />

      {/* Top Header Navigation Bar */}
      <header className="relative z-30 px-6 sm:px-12 py-4 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-transform hover:scale-105"
            title="Keluar dari layar proyektor"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[11px] font-cinzel tracking-[0.3em] text-[#eed8b7] uppercase font-semibold">
                {couple.subtitle || "LIVE WEDDING PHOTOBOOTH"}
              </span>
            </div>
            <h1 className="font-script text-3xl sm:text-4xl text-white tracking-wide drop-shadow-lg">
              {couple.displayNames}
            </h1>
          </div>
        </div>

        {/* Center Slideshow Progress Bar */}
        {memories.length > 1 && (
          <div className="hidden md:flex flex-col items-center gap-1.5 w-72">
            <div className="flex items-center justify-between w-full text-[10px] tracking-widest text-[#eed8b7]/80 uppercase font-medium">
              <span>Momen {currentIndex + 1} dari {memories.length}</span>
              <span>{isPlayingSlide ? `${Math.round(slideProgress)}%` : 'Dijeda'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#c5a880] via-[#ffd700] to-[#f3e5ab] transition-all duration-75"
                style={{ width: `${slideProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-cinzel tracking-widest text-[#dfcbb5] font-semibold">
              {couple.formattedDate}
            </div>
            <div className="text-xs text-white/60">
              {memories.length} Kenangan Tersimpan ✨
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md transition-all shadow-lg hover:scale-105"
            title={isFullscreen ? 'Exit Fullscreen' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Prominent Floating Left Side Arrow Button */}
      {memories.length > 1 && (
        <button
          type="button"
          onClick={goToPrevSlide}
          className="fixed left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/40 hover:bg-[#c5a880] text-white hover:text-[#1a0c1a] border border-white/25 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] active:scale-95 group"
          title="Momen Sebelumnya (Panah Kiri)"
        >
          <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:-translate-x-1" />
        </button>
      )}

      {/* Prominent Floating Right Side Arrow Button */}
      {memories.length > 1 && (
        <button
          type="button"
          onClick={goToNextSlide}
          className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/40 hover:bg-[#c5a880] text-white hover:text-[#1a0c1a] border border-white/25 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] active:scale-95 group"
          title="Momen Berikutnya (Panah Kanan)"
        >
          <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:translate-x-1" />
        </button>
      )}

      {/* Main Center Showcase with Directional Slide Transitions */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-16 sm:px-24 py-2">
        {currentMem ? (
          <div
            key={currentMem.id || currentIndex}
            className={`flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-14 max-w-6xl w-full transition-all duration-500 ease-out transform ${
              isTransitioning
                ? slideDirection === 'next'
                  ? 'opacity-0 scale-95 translate-x-12'
                  : 'opacity-0 scale-95 -translate-x-12'
                : 'opacity-100 scale-100 translate-x-0'
            }`}
          >
            {/* Photostrip Showcase Card with Golden Glow & Shimmer */}
            <div className="relative group max-h-[68vh] rounded-3xl p-3 sm:p-4 bg-gradient-to-b from-white/15 via-white/5 to-black/30 border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-center animate-float-smooth animate-glow-gleam overflow-hidden">
              {/* Shimmer Sweep Light Animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-1/2 animate-shimmer-sweep pointer-events-none" />

              {/* Photostrip Image */}
              <img
                src={currentMem.stripUrl}
                alt={currentMem.guestName}
                className="max-h-[60vh] w-auto rounded-2xl object-contain shadow-2xl drop-shadow-[0_20px_35px_rgba(0,0,0,0.8)]"
              />

              {/* Like Counter Floating Badge */}
              <div className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-rose-400 text-xs font-bold flex items-center gap-1.5 shadow-lg">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>{currentMem.likesCount || 0}</span>
              </div>
            </div>

            {/* Guest Wishes & Interactive Sound Player */}
            <div className="max-w-md lg:max-w-lg space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#c5a880]/30 to-[#a8895b]/20 border border-[#d4af37]/40 text-[#f3e5ab] text-xs font-semibold uppercase tracking-widest shadow-md">
                <Sparkles className="w-4 h-4 text-[#ffd700]" />
                Kenangan Tamu Undangan #{currentIndex + 1}
              </div>

              <div className="space-y-1">
                <h2 className="text-3xl sm:text-4xl font-bold font-serif-elegant text-white tracking-wide drop-shadow-md">
                  {currentMem.guestName}
                </h2>
                <div className="text-xs text-[#eed8b7]/70 font-medium">
                  {new Date(currentMem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Momen Bahagia
                </div>
              </div>

              {/* Guest Wishes Quote Box */}
              {currentMem.guestMessage ? (
                <div className="relative p-6 rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-black/20 backdrop-blur-xl border border-white/15 text-base sm:text-lg text-white/95 italic font-serif leading-relaxed shadow-xl">
                  <span className="text-[#d4af37] text-3xl font-serif leading-none mr-1.5">“</span>
                  {currentMem.guestMessage}
                  <span className="text-[#d4af37] text-3xl font-serif leading-none ml-1.5">”</span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-xs text-white/60 italic">
                  Telah mengabadikan photostrip 3-grid kenangan di resepsi pernikahan {couple.displayNames}
                </div>
              )}

              {/* Voice Note Big Screen Player */}
              {currentMem.audioUrl && (
                <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-amber-600/15 to-transparent border border-amber-400/30 backdrop-blur-md flex items-center justify-between gap-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleVoiceNote(currentMem.audioUrl)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 ${
                        activeVoicePlaying
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-[#d4af37] text-[#241324]'
                      }`}
                      title={activeVoicePlaying ? 'Jeda Voice Note' : 'Putar Voice Note di Layar'}
                    >
                      {activeVoicePlaying ? (
                        <Pause className="w-5 h-5 fill-white" />
                      ) : (
                        <Play className="w-5 h-5 fill-[#241324] ml-0.5" />
                      )}
                    </button>

                    <div>
                      <div className="text-sm font-bold text-[#eed8b7] flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-[#ffd700]" />
                        {activeVoicePlaying ? 'Sedang Memutar Pesan Suara...' : 'Pesan Suara dari Tamu'}
                      </div>
                      <div className="text-[11px] text-white/60">
                        {activeVoicePlaying ? 'Klik untuk jeda' : 'Klik untuk dengarkan ucapan doa'}
                      </div>
                    </div>
                  </div>

                  {/* Animated Equalizer Waveform */}
                  <div className="flex items-center gap-1 h-6 pr-2">
                    {[8, 16, 24, 12, 20, 28, 14, 22, 10, 18].map((h, i) => (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          activeVoicePlaying
                            ? 'bg-[#ffd700] animate-pulse'
                            : 'bg-white/20'
                        }`}
                        style={{
                          height: activeVoicePlaying ? `${h}px` : '4px',
                          animationDelay: `${i * 80}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Slideshow Control Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={goToPrevSlide}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 hover:scale-105"
                  title="Momen Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </button>

                <button
                  type="button"
                  onClick={() => setIsPlayingSlide(!isPlayingSlide)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 shadow-md ${
                    isPlayingSlide
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-[#c5a880] text-[#1e0e1e] font-bold'
                  }`}
                >
                  {isPlayingSlide ? (
                    <>
                      <Pause className="w-4 h-4" /> Jeda Slide
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" /> Lanjut Otomatis
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={goToNextSlide}
                  className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 hover:scale-105"
                  title="Momen Berikutnya"
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 max-w-md">
            <div className="w-20 h-20 rounded-full bg-[#c5a880]/20 border border-[#c5a880]/40 flex items-center justify-center mx-auto shadow-2xl animate-pulse">
              <Sparkles className="w-10 h-10 text-[#ffd700]" />
            </div>
            <h3 className="text-3xl font-serif-elegant font-bold text-white">
              Menanti Foto Pertama Para Tamu...
            </h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Scan QR code di pojok bawah menggunakan kamera smartphone Anda untuk mengambil foto 3-grid dan meninggalkan pesan suara!
            </p>
          </div>
        )}
      </main>

      {/* Luxury Real-time Upload Celebration Popup Banner */}
      {showCelebration && (
        <div className="absolute inset-x-4 top-24 max-w-lg mx-auto z-50 p-5 rounded-3xl bg-gradient-to-r from-[#2c132b]/95 via-[#3d1a3b]/95 to-[#241024]/95 border-2 border-[#d4af37] shadow-[0_20px_60px_rgba(212,175,55,0.4)] backdrop-blur-2xl animate-bounce flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ffd700] to-[#c5a880] text-[#200e1f] flex items-center justify-center shadow-xl font-bold text-2xl animate-spin">
            ✨
          </div>
          <div className="flex-1">
            <div className="text-[11px] text-[#ffd700] font-bold tracking-widest uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Foto Baru Saja Masuk!
            </div>
            <div className="text-lg font-bold text-white">
              {showCelebration.guestName}
            </div>
            <div className="text-xs text-white/80 italic truncate max-w-[280px]">
              {showCelebration.guestMessage || 'Telah membagikan photostrip kenangan indahnya! 🥂'}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer with Thumbnail Navigation & Live QR Code */}
      <footer className="relative z-30 px-6 sm:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent backdrop-blur-[2px]">
        {/* Left: Interactive Thumbnail Carousel */}
        {memories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-md py-1 scrollbar-none">
            {memories.map((m, idx) => (
              <button
                key={m.id || idx}
                type="button"
                onClick={() => jumpToSlide(idx)}
                className={`relative w-10 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                  currentIndex === idx
                    ? 'border-[#ffd700] scale-110 shadow-[0_0_12px_rgba(212,175,55,0.7)]'
                    : 'border-white/20 opacity-50 hover:opacity-100 hover:scale-105'
                }`}
                title={`Lihat foto ${m.guestName}`}
              >
                <img
                  src={m.stripUrl}
                  alt={m.guestName}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* QR Code Scan Invitation Card */}
        {qrCodeUrl && (
          <div className="flex items-center gap-3.5 p-2.5 sm:p-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur-xl border border-white/25 shadow-2xl transition-transform hover:scale-105 ml-auto">
            <img
              src={qrCodeUrl}
              alt="Scan to upload"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white p-1 shadow-md"
            />
            <div className="text-left">
              <div className="text-xs font-bold text-[#eed8b7] flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-[#ffd700]" />
                Scan QR Code Meja
              </div>
              <div className="text-[11px] text-white/80 font-medium">
                Ambil 3 Foto & Voice Note
              </div>
              <div className="text-[9px] text-[#ffd700]/90 font-mono mt-0.5">
                Langsung dari HP Anda
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
