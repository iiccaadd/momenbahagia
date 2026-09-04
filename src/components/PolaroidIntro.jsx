import React, { useState, useRef, useEffect } from 'react';

export default function PolaroidIntro({
  couple,
  onOpenComplete,
}) {
  // States: 'idle' -> 'clicking' -> 'ejecting' -> 'developed' -> 'completing'
  const [animState, setAnimState] = useState('idle');
  const [isFlashActive, setIsFlashActive] = useState(false);
  const audioCtxRef = useRef(null);
  const autoTransitionTimerRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoTransitionTimerRef.current) {
        clearTimeout(autoTransitionTimerRef.current);
      }
    };
  }, []);

  // Synthesize realistic shutter snap + instant camera motor whir sound via Web Audio API
  const playCameraSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      // 1. Shutter Mechanical Click (High snap)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      // 2. White Noise Burst for Mechanical Shutter Snap
      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1600, now);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);

      // 3. Film Motor Eject Whir Sound (0.12s to 1.1s)
      const motorOsc = ctx.createOscillator();
      const motorGain = ctx.createGain();
      motorOsc.type = 'sawtooth';
      motorOsc.frequency.setValueAtTime(130, now + 0.1);
      motorOsc.frequency.linearRampToValueAtTime(175, now + 0.35);
      motorOsc.frequency.linearRampToValueAtTime(115, now + 1.0);

      const motorFilter = ctx.createBiquadFilter();
      motorFilter.type = 'lowpass';
      motorFilter.frequency.setValueAtTime(650, now + 0.1);

      motorGain.gain.setValueAtTime(0.0, now);
      motorGain.gain.setValueAtTime(0.2, now + 0.12);
      motorGain.gain.linearRampToValueAtTime(0.25, now + 0.5);
      motorGain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);

      motorOsc.connect(motorFilter);
      motorFilter.connect(motorGain);
      motorGain.connect(ctx.destination);
      motorOsc.start(now + 0.1);
      motorOsc.stop(now + 1.1);
    } catch (e) {
      console.log('Audio synthesis unavailable:', e);
    }
  };

  const handleTriggerCapture = (e) => {
    e?.stopPropagation();
    if (animState !== 'idle') return;

    // Trigger sound
    playCameraSound();

    // 1. Shutter Click & Xenon Flash
    setAnimState('clicking');
    setIsFlashActive(true);

    setTimeout(() => {
      setIsFlashActive(false);
    }, 150);

    // 2. Start Ejection of Polaroid Photo Paper from slot
    setTimeout(() => {
      setAnimState('ejecting');
    }, 180);

    // 3. Photo is fully ejected and developed in full view
    setTimeout(() => {
      setAnimState('developed');

      // 4. Exact 2-second delay after photo comes out before automatically opening the photobooth page!
      autoTransitionTimerRef.current = setTimeout(() => {
        handleEnterMain();
      }, 2000);
    }, 1100);
  };

  const handleEnterMain = () => {
    if (animState === 'completing') return;
    setAnimState('completing');
    setTimeout(() => {
      if (onOpenComplete) onOpenComplete();
    }, 600);
  };

  const isIdle = animState === 'idle';
  const isClicking = animState === 'clicking';
  const isEjecting = animState === 'ejecting';
  const isDeveloped = animState === 'developed';
  const isCompleting = animState === 'completing';
  const isAfterEject = isEjecting || isDeveloped || isCompleting;

  return (
    <div
      onClick={isIdle ? handleTriggerCapture : handleEnterMain}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between py-6 sm:py-10 px-4 cursor-pointer select-none transition-all duration-700 font-body overflow-hidden ${
        isCompleting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 36%, #314432 0%, #202d21 60%, #151e16 100%)',
      }}
    >
      {/* Camera Flash Screen Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-white pointer-events-none transition-opacity duration-200 ${
          isFlashActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Top Header Information */}
      <div
        className={`text-center space-y-1 pt-1 sm:pt-3 z-20 transition-all duration-500 ${
          isAfterEject ? 'opacity-70 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="w-6 h-[1px] bg-[#E9DDC5]/40"></span>
          <h3 className="text-[#F6F4EE]/90 text-[11px] sm:text-xs font-cinzel font-semibold tracking-[0.25em] uppercase drop-shadow">
            {couple?.subtitle || "WEDDING MEMORIES"}
          </h3>
          <span className="w-6 h-[1px] bg-[#E9DDC5]/40"></span>
        </div>

        <h1 className="text-[#F6F4EE] font-script text-3xl sm:text-4xl drop-shadow-md tracking-wide py-0.5">
          {couple?.displayNames || "Adisty & Irsyad"}
        </h1>

        <p className="text-[#E9DDC5]/80 text-[10px] sm:text-[11px] font-cinzel tracking-widest uppercase">
          {couple?.formattedDate || "11 NOVEMBER 2026"}
        </p>
      </div>

      {/* Center Interactive Animated Polaroid Camera & Photo Stage */}
      <div className="relative w-full max-w-[340px] sm:max-w-[380px] h-[380px] sm:h-[420px] my-auto flex flex-col items-center justify-center">
        {/* Main Camera Body Container */}
        <div
          className={`relative w-[290px] sm:w-[330px] aspect-square transition-all duration-700 ease-out ${
            isAfterEject
              ? '-translate-y-12 sm:-translate-y-16 scale-[0.96]'
              : isClicking
              ? 'scale-95 translate-y-1'
              : isIdle
              ? 'hover:scale-[1.02] animate-wmbreathe'
              : 'scale-100'
          }`}
          style={{ perspective: '1000px' }}
        >
          {/* Layer 1: Back Camera Body (Image with Drop Shadow) */}
          <img
            src="/assets/polaroid_camera.png"
            alt="Polaroid OneStep+ Camera"
            className="absolute inset-0 w-full h-full object-contain block drop-shadow-[0_22px_45px_rgba(0,0,0,0.65)] pointer-events-none z-10 select-none"
          />

          {/* Layer 2: Emerging Polaroid Photo Paper (Exactly matching slot slit width & position) */}
          <div
            onClick={handleEnterMain}
            className={`absolute left-[50%] z-20 bg-[#FFFFFF] rounded-md p-1.5 sm:p-2 shadow-[0_18px_35px_rgba(0,0,0,0.6)] border border-[#E2E8F0] flex flex-col items-center cursor-pointer transition-all ${
              isAfterEject
                ? isEjecting
                  ? 'duration-[1000ms] ease-out opacity-95'
                  : 'duration-500 ease-out opacity-100 hover:scale-105'
                : 'opacity-0 pointer-events-none'
            }`}
            style={{
              width: '51.8%', // Exactly matches the horizontal slot slit width on the camera
              top: '63.2%', // Emerge directly starting from the slot slit
              transform: isAfterEject
                ? isEjecting
                  ? 'translateX(-50%) translateY(12px) scale(0.98)'
                  : 'translateX(-50%) translateY(45px) scale(1)'
                : 'translateX(-50%) translateY(-90%) scale(0.9)',
              transformOrigin: 'top center',
            }}
          >
            {/* Photo Area with Emulsion Developing Animation */}
            <div className="w-full aspect-[4/4.2] rounded-sm overflow-hidden bg-[#1E293B] relative shadow-inner border border-[#E2E8F0]">
              <img
                src={couple?.heroImage || "/assets/sample_couple.jpg"}
                alt={couple?.displayNames || "Couple"}
                className={`w-full h-full object-cover transition-all duration-[1400ms] ease-out ${
                  isEjecting
                    ? 'filter contrast(160%) brightness(25%) grayscale(70%) blur(2px)'
                    : 'filter contrast(105%) brightness(102%) grayscale(0%) blur(0px)'
                }`}
              />

              {/* Subtle vintage instant film sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

              {/* Captured Badge Stamp */}
              {isDeveloped && (
                <div className="absolute top-1 right-1 px-1 py-0.2 rounded-full bg-black/55 backdrop-blur-md text-[#F6F4EE] text-[6.5px] font-bold tracking-wider uppercase font-cinzel">
                  Captured ✨
                </div>
              )}
            </div>

            {/* Handwritten Couple Signature - Styled & Scaled to Fit Perfectly */}
            <div className="w-full pt-1.5 pb-0.5 text-center space-y-0.5 select-none">
              <div className="font-script text-sm sm:text-base text-[#263727] leading-tight truncate">
                {couple?.displayNames || "Adisty & Irsyad"}
              </div>
              <div className="text-[6.5px] tracking-widest text-[#64748B] font-cinzel font-semibold uppercase">
                {couple?.formattedDate || "11 NOVEMBER 2026"}
              </div>
            </div>
          </div>

          {/* Layer 3: Front Lower Chin Lip of Camera (Overlays top of emerging paper so paper comes OUT OF THE SLIT) */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none z-30 select-none overflow-hidden"
            style={{
              clipPath: 'polygon(0% 63.4%, 100% 63.4%, 100% 100%, 0% 100%)',
            }}
          >
            <img
              src="/assets/polaroid_camera.png"
              alt=""
              className="w-full h-full object-contain"
            />
          </div>

          {/* Layer 4: Interactive Hotspots (Flash bulb & Shutter button) */}
          {/* Glowing Flash Bulb */}
          <div className="absolute top-[28%] left-[23%] w-7 h-11 rounded-sm bg-cyan-200/10 flex items-center justify-center pointer-events-none z-40">
            <div
              className={`w-3 h-3 rounded-full bg-white transition-all duration-200 ${
                isFlashActive
                  ? 'scale-[6] opacity-100 shadow-[0_0_40px_#ffffff]'
                  : isIdle
                  ? 'opacity-40 animate-pulse'
                  : 'opacity-10'
              }`}
            />
          </div>

          {/* Interactive Red Shutter Button (Clickable Hotspot) */}
          <div
            onClick={handleTriggerCapture}
            className="absolute top-[48%] left-[21%] w-10 h-10 rounded-full cursor-pointer z-40 group flex items-center justify-center"
            title="Tekan Tombol Merah"
          >
            {/* Ripple ring animation when idle */}
            {isIdle && (
              <div className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
            )}
            <div
              className={`w-full h-full rounded-full bg-red-500/0 flex items-center justify-center transition-transform duration-150 ${
                isClicking ? 'scale-90' : 'group-hover:scale-105 active:scale-95'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Bottom Text Prompt: ONLY "ketuk kamera untuk membuka" */}
      <div className="text-center pb-2 sm:pb-4 transition-all duration-300 z-20">
        <p className="font-cinzel text-xs sm:text-sm font-semibold tracking-[0.2em] text-[#F6F4EE]/90 uppercase animate-wmbreathe">
          {isDeveloped ? "MEMBUKA PHOTOBOOTH..." : "KETUK KAMERA UNTUK MEMBUKA"}
        </p>
        <div className="w-12 h-[1px] bg-[#E9DDC5]/40 mx-auto mt-1.5" />
      </div>
    </div>
  );
}
