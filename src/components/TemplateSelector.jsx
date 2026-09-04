import React, { useState, useRef } from 'react';
import { Sparkles, Check, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TemplateSelector({ templates = [], selectedTemplate, onSelectTemplate }) {
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'strip', 'polaroid', '4r'
  const scrollContainerRef = useRef(null);

  // Exact categories requested by user: Semua, Strip, Polaroid, 4R
  const categories = [
    { id: 'all', label: 'Semua' },
    { id: 'strip', label: 'Strip (3 Foto)' },
    { id: 'polaroid', label: 'Polaroid (1 Foto)' },
    { id: '4r', label: '4R (2 Foto)' },
  ];

  const filteredTemplates = templates.filter((tpl) => {
    const slots = Number(tpl.slotCount) || 3;
    if (activeCategory === 'all') return true;
    if (activeCategory === 'strip') return slots >= 3 || tpl.category?.toLowerCase().includes('strip');
    if (activeCategory === 'polaroid') return slots === 1 || tpl.category?.toLowerCase().includes('polaroid');
    if (activeCategory === '4r') return slots === 2 || tpl.category?.toLowerCase().includes('4r');
    return true;
  });

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Filter Chips: Strip, Polaroid, 4R */}
      <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none justify-start sm:justify-center">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                isSelected
                  ? 'bg-[#263727] text-[#F6F4EE] shadow-md scale-105'
                  : 'bg-[#E9DDC5]/50 text-[#263727] hover:bg-[#E9DDC5]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Frame Carousel Swiper */}
      <div className="relative group px-1">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={scrollLeft}
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#F6F4EE] text-[#263727] shadow-lg border border-[#E9DDC5] flex items-center justify-center transition-all hover:scale-110 hover:bg-[#263727] hover:text-[#F6F4EE]"
          title="Geser Kiri"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={scrollRight}
          className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-[#F6F4EE] text-[#263727] shadow-lg border border-[#E9DDC5] flex items-center justify-center transition-all hover:scale-110 hover:bg-[#263727] hover:text-[#F6F4EE]"
          title="Geser Kanan"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Horizontal Scroll Track */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto py-3 px-3 scroll-smooth snap-x snap-mandatory scrollbar-none justify-start"
        >
          {filteredTemplates.map((tpl) => {
            // Strictly check unique ID matching
            const isSelected = selectedTemplate?.id && tpl.id ? selectedTemplate.id === tpl.id : false;
            const slotCount = tpl.slotCount || 3;

            return (
              <div
                key={tpl.id}
                onClick={() => onSelectTemplate(tpl)}
                className={`snap-center flex-shrink-0 w-36 sm:w-40 rounded-2xl p-3 cursor-pointer transition-all duration-300 border flex flex-col items-center text-center select-none relative ${
                  isSelected
                    ? 'border-[#263727] ring-2 ring-[#263727] shadow-xl scale-105 bg-[#F6F4EE] -translate-y-1.5 z-10'
                    : 'border-[#E9DDC5] bg-[#FAFAF3] opacity-85 hover:opacity-100 hover:border-[#263727]/60 hover:bg-white hover:scale-[1.02]'
                }`}
              >
                {/* Active Check Badge - Only on truly selected card */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#263727] text-[#F6F4EE] rounded-full flex items-center justify-center shadow-md animate-wmfadein z-20">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Custom Badge Tag */}
                {(tpl.isCustom || tpl.customFrameUrl) && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#263727] text-[#F6F4EE] text-[8px] font-bold z-20 shadow-sm">
                    Custom
                  </span>
                )}

                {/* Frame Preview Visual with Prominent Slot Cutouts */}
                <div
                  className="w-24 h-52 rounded-xl p-2 flex flex-col justify-between items-center shadow-inner mb-2 transition-transform duration-300 relative overflow-hidden"
                  style={{
                    backgroundColor: tpl.bgColor || '#F6F4EE',
                    color: tpl.textColor || '#263727',
                    border: `1.5px solid ${tpl.accentColor || '#c5a880'}`,
                  }}
                >
                  {/* Custom Uploaded Frame Image */}
                  {tpl.customFrameUrl && (
                    <img
                      src={tpl.customFrameUrl}
                      alt={tpl.name}
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-90"
                    />
                  )}

                  {/* Top Title */}
                  {tpl.showText !== false && (
                    <div className="relative z-10 w-full text-center">
                      <div className="text-[7px] font-bold tracking-widest uppercase opacity-90 font-cinzel">
                        {tpl.topTitle || "HAPPY"}
                      </div>
                      {tpl.mainScript ? (
                        <div className="font-script text-[11px] leading-tight truncate">
                          {tpl.mainScript}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Photo Slots with High-Contrast Visible White Boxes */}
                  <div className="flex flex-col gap-1 w-full my-auto relative z-10">
                    {[...Array(slotCount)].map((_, slotIdx) => (
                      <div
                        key={slotIdx}
                        className="w-full rounded-sm bg-white/70 border-2 border-white flex items-center justify-center overflow-hidden shadow-sm backdrop-blur-[1px]"
                        style={{
                          height: slotCount === 1 ? '76px' : slotCount === 2 ? '44px' : '28px',
                          borderColor: tpl.frameBorderColor || '#ffffff',
                        }}
                      >
                        <span className="text-[7.5px] font-bold text-[#263727] drop-shadow-xs">
                          Foto #{slotIdx + 1}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer Names & Date */}
                  {tpl.showText !== false && (
                    <div className="w-full text-center relative z-10">
                      <div className="font-script text-[9px] truncate">
                        {tpl.footerNames || "Love & Joy"}
                      </div>
                      <div className="text-[6.5px] tracking-wider opacity-90 font-cinzel">
                        {tpl.footerDate || "2026"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Name & Format Info */}
                <div className="w-full">
                  <h4 className="text-xs font-bold text-[#263727] truncate font-cinzel uppercase">
                    {tpl.name}
                  </h4>
                  <span className="inline-block mt-0.5 text-[10px] font-medium text-[#999794]">
                    {slotCount} Foto • {slotCount === 1 ? 'Polaroid' : slotCount === 2 ? '4R' : 'Strip'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-[11px] text-[#999794]">
        Bingkai terpilih: <strong className="text-[#263727] font-semibold">{selectedTemplate?.name || 'Classic'}</strong> ({selectedTemplate?.slotCount || 3} Foto)
      </div>
    </div>
  );
}
