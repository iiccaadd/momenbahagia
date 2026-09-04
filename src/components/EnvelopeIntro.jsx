import React, { useState } from 'react';

export default function EnvelopeIntro({
  couple,
  onOpenComplete,
}) {
  // Opening states: 'idle' -> 'opening' -> 'opened'
  const [openingState, setOpeningState] = useState('idle');

  // Extract initials of both bride and groom
  const brideInitial = (
    couple?.brideName?.trim()?.charAt(0) ||
    couple?.displayNames?.split('&')?.[0]?.trim()?.charAt(0) ||
    'A'
  ).toUpperCase();

  const groomInitial = (
    couple?.groomName?.trim()?.charAt(0) ||
    couple?.displayNames?.split('&')?.[1]?.trim()?.charAt(0) ||
    'I'
  ).toUpperCase();

  const handleOpenEnvelope = () => {
    if (openingState !== 'idle') return;
    setOpeningState('opening');

    // Sequence:
    // 0ms: seal cracks & scales
    // 300ms: flap flips open in 3D
    // 600ms: letter rises up
    // 1200ms: smooth transition into main screen
    setTimeout(() => {
      setOpeningState('opened');
      if (onOpenComplete) onOpenComplete();
    }, 1300);
  };

  const isOpening = openingState === 'opening';
  const isOpened = openingState === 'opened';

  return (
    <div
      onClick={handleOpenEnvelope}
      className={`fixed inset-0 z-50 bg-[#263727] flex flex-col items-center justify-between py-12 px-4 cursor-pointer select-none transition-all duration-700 font-body ${
        isOpened ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 40%, #3a4d3b 0%, #1c271d 100%)',
      }}
    >
      {/* Top Header Text Overlay */}
      <div className="text-center space-y-1 pt-6 transition-all duration-500">
        <h3 className="text-[#F6F4EE]/90 text-xs sm:text-sm font-cinzel font-semibold tracking-[0.25em] uppercase drop-shadow">
          {couple.subtitle || "WEDDING MEMORIES"}
        </h3>
        <h1 className="text-[#F6F4EE] font-script text-4xl sm:text-5xl drop-shadow-md tracking-wide py-1">
          {couple.displayNames || "Adisty & Irsyad"}
        </h1>
      </div>

      {/* 3D Realistic Interactive Envelope */}
      <div className="relative w-[300px] sm:w-[340px] h-[210px] sm:h-[230px] my-auto flex items-center justify-center">
        {/* Envelope Container */}
        <div
          className={`relative w-full h-full rounded-xl overflow-visible shadow-2xl transition-transform duration-700 ${
            isOpening ? 'scale-105' : 'hover:scale-[1.02]'
          }`}
          style={{
            perspective: '1000px',
          }}
        >
          {/* 1. Envelope Back Background Wall */}
          <div className="absolute inset-0 bg-[#19241a] rounded-xl shadow-inner border border-[#121c13]" />

          {/* 2. Letter Inside (Slides Upward when opening) */}
          <div
            className="absolute inset-x-3 bottom-2 h-[88%] bg-[#F6F4EE] rounded-lg p-3 shadow-md border border-[#E9DDC5] flex flex-col items-center justify-between text-center transition-all duration-700 ease-out z-10"
            style={{
              transform: isOpening
                ? 'translateY(-120px) scale(1.02)'
                : 'translateY(0px)',
              opacity: isOpening ? 1 : 0.85,
            }}
          >
            <div className="space-y-0.5">
              <span className="text-[8px] font-bold tracking-[0.2em] text-[#999794] uppercase font-cinzel">
                THE WEDDING CELEBRATION
              </span>
              <div className="font-script text-lg text-[#263727]">
                {couple.displayNames}
              </div>
            </div>

            <div className="w-16 h-16 rounded-md overflow-hidden bg-[#263727] shadow-sm border border-[#E9DDC5]">
              <img
                src={couple.heroImage || "/assets/sample_couple.jpg"}
                alt="Couple"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="text-[8px] tracking-widest text-[#263727] font-cinzel font-semibold">
              {couple.formattedDate}
            </div>
          </div>

          {/* 3. Left Flap */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              clipPath: 'polygon(0 0, 0 100%, 50% 50%)',
              backgroundColor: '#233224',
              boxShadow: 'inset -2px 0 6px rgba(0,0,0,0.25)',
            }}
          />

          {/* 4. Right Flap */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)',
              backgroundColor: '#1f2e20',
              boxShadow: 'inset 2px 0 6px rgba(0,0,0,0.25)',
            }}
          />

          {/* 5. Bottom Flap */}
          <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{
              clipPath: 'polygon(0 100%, 100% 100%, 50% 48%)',
              backgroundColor: '#293a2a',
              boxShadow: '0 -4px 10px rgba(0,0,0,0.18)',
            }}
          />

          {/* 6. Top Flap (Flips Open 180° in 3D) */}
          <div
            className="absolute top-0 inset-x-0 h-full origin-top transition-transform duration-700 ease-in-out"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 50% 52%)',
              backgroundColor: '#334734',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              transform: isOpening ? 'rotateX(180deg)' : 'rotateX(0deg)',
              transformStyle: 'preserve-3d',
              zIndex: isOpening ? 5 : 30,
            }}
          />

          {/* 7. Golden Wax Seal Button with Perfectly Scaled Monogram */}
          <div
            className={`absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 z-40 transition-all duration-500 flex items-center justify-center ${
              isOpening
                ? 'scale-150 opacity-0'
                : 'hover:scale-105 active:scale-95 animate-wmbreathe'
            }`}
          >
            {/* Wax Seal Circle */}
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#f0dfb6] via-[#d5b97b] to-[#a8894d] shadow-[0_4px_14px_rgba(0,0,0,0.4)] border-2 border-[#f7ecd3] flex items-center justify-center p-1.5">
              {/* Outer Wax Ring with Inner Shadow */}
              <div className="w-full h-full rounded-full border border-[#b89552] flex items-center justify-center bg-[#dfc58e] shadow-inner px-2 overflow-hidden">
                {/* Scaled Couple Initials Fitting 100% Inside the Circle */}
                <div className="flex items-center justify-center font-script text-[#263727] font-bold select-none drop-shadow-sm leading-none whitespace-nowrap">
                  <span className="text-[17px] sm:text-[19px]">{brideInitial}</span>
                  <span className="text-[11px] sm:text-[12px] font-cinzel opacity-75 mx-1 font-semibold">&</span>
                  <span className="text-[17px] sm:text-[19px]">{groomInitial}</span>
                </div>
              </div>

              {/* Wax Glow Sparkle */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-white/60 rounded-full blur-[1px]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Prompt Text with Subtle Accent Underline */}
      <div className="text-center pb-8 space-y-2 transition-all duration-300">
        <p className="font-cinzel text-xs sm:text-sm font-semibold tracking-[0.25em] text-[#F6F4EE]/90 uppercase animate-wmbreathe">
          KETUK UNTUK MEMBUKA
        </p>
        <div className="w-10 h-[1px] bg-[#F6F4EE]/40 mx-auto" />
      </div>
    </div>
  );
}
