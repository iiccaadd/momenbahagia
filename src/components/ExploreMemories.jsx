import React, { useState, useRef } from 'react';
import { Play, Pause, Heart, Download, Sparkles, X, Eye } from 'lucide-react';

export default function ExploreMemories({ memories = [], onLike, likedMemoryIds = [] }) {
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const audioPlayerRef = useRef(null);

  const handlePlayVoice = (id, url) => {
    if (activeAudioId === id) {
      if (audioPlayerRef.current) audioPlayerRef.current.pause();
      setActiveAudioId(null);
    } else {
      setActiveAudioId(id);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play().catch(console.error);
      }
    }
  };

  if (memories.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-[#E9DDC5]/40 text-[#263727] flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-7 h-7 text-[#263727]" />
        </div>
        <h4 className="font-cinzel font-bold text-base text-[#263727]">
          Belum Ada Kenangan
        </h4>
        <p className="text-xs text-[#999794] max-w-xs mx-auto">
          Jadilah yang pertama mengabadikan momen spesial dan mengirimkan ucapan doa untuk kedua mempelai!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <audio
        ref={audioPlayerRef}
        onEnded={() => setActiveAudioId(null)}
        className="hidden"
      />

      {/* Grid / List of Memories */}
      <div className="space-y-4">
        {memories.map((m) => {
          const isLiked = likedMemoryIds.includes(m.id);

          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-[#E9DDC5] space-y-3.5 transition-all hover:shadow-md"
            >
              {/* Header: Guest Name & Time */}
              <div className="flex items-center justify-between border-b border-[#F6F4EE] pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#263727] text-[#F6F4EE] flex items-center justify-center text-xs font-bold font-cinzel">
                    {m.guestName?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-xs sm:text-sm text-[#263727]">
                      {m.guestName}
                    </h4>
                    <span className="text-[10px] text-[#999794]">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onLike && onLike(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-90 select-none shadow-xs ${
                      isLiked
                        ? 'bg-rose-50 text-[#E11D48] border border-rose-200 shadow-rose-100'
                        : 'bg-[#F6F4EE] text-[#55524e] border border-[#E9DDC5] hover:bg-[#E9DDC5]/50'
                    }`}
                    title={isLiked ? "Batal menyukai (Klik untuk Unlove)" : "Sukai kenangan ini (Klik untuk Love)"}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-all duration-200 ${
                        isLiked ? 'fill-[#E11D48] text-[#E11D48] scale-110' : 'text-[#999794]'
                      }`}
                    />
                    <span className={`font-bold ${isLiked ? 'text-[#E11D48]' : 'text-[#263727]'}`}>
                      {m.likesCount || 0}
                    </span>
                  </button>
                </div>
              </div>

              {/* Photostrip Image Card (Click to open full detail modal) */}
              <div
                onClick={() => setSelectedMemory(m)}
                className="rounded-xl overflow-hidden bg-[#F6F4EE] p-2 flex justify-center cursor-pointer group relative shadow-inner"
              >
                <img
                  src={m.stripUrl}
                  alt={m.guestName}
                  className="max-h-[280px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="px-3.5 py-2 rounded-full bg-white/95 text-[#263727] text-xs font-cinzel font-bold flex items-center gap-1.5 shadow-lg">
                    <Eye className="w-3.5 h-3.5" /> Buka Kenangan
                  </span>
                </div>
              </div>

              {/* Voice Message Player */}
              {m.audioUrl && (
                <div className="p-2.5 rounded-xl bg-[#F6F4EE] border border-[#E9DDC5] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handlePlayVoice(m.id, m.audioUrl)}
                      className="w-8 h-8 rounded-full bg-[#263727] text-[#F6F4EE] flex items-center justify-center shadow hover:bg-[#1d2b1e]"
                    >
                      {activeAudioId === m.id ? (
                        <Pause className="w-3.5 h-3.5 fill-white" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      )}
                    </button>
                    <div>
                      <span className="text-[11px] font-bold text-[#263727] font-cinzel block">
                        {activeAudioId === m.id ? 'Memutar Pesan Suara...' : 'Pesan Suara Tamu'}
                      </span>
                      <span className="text-[10px] text-[#999794]">
                        {m.audioDuration ? `${m.audioDuration} detik` : 'Audio Kenangan'}
                      </span>
                    </div>
                  </div>

                  {/* Animated Waveform Bars during playback */}
                  <div className="flex items-center gap-1 h-5 px-1">
                    {[8, 14, 20, 12, 16, 22, 10, 18].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          activeAudioId === m.id ? 'bg-[#263727] animate-wmpulse' : 'bg-[#263727]/30'
                        }`}
                        style={{
                          height: `${h}px`,
                          animationDelay: `${(i % 3) * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Wishes Text */}
              {m.guestMessage && (
                <div className="text-xs text-[#000000] italic bg-[#FAFAF3] p-3 rounded-xl border border-[#E9DDC5]/60">
                  "{m.guestMessage}"
                </div>
              )}

              {/* Download & View Action Bar */}
              <div className="flex items-center justify-between pt-1 border-t border-[#F6F4EE]">
                <button
                  type="button"
                  onClick={() => setSelectedMemory(m)}
                  className="inline-flex items-center gap-1 text-xs text-[#263727] hover:underline font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" /> Detail
                </button>

                <a
                  href={m.stripUrl}
                  download={`wedding-memory-${m.guestName}.png`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#263727] hover:underline font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Softfile
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Elegant & Lightweight Memory Detail Modal (KisahKekal / Luxury Theme) */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-wmfadein">
          <div className="relative w-full max-w-sm sm:max-w-md bg-[#263727] text-[#F6F4EE] rounded-[32px] border border-[#E9DDC5]/40 shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden animate-wmsheetin my-auto">
            {/* Top Bar: Unduh Softfile & Tutup */}
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <a
                href={selectedMemory.stripUrl}
                download={`wedding-photostrip-${(selectedMemory.guestName || 'memory').replace(/\s+/g, '-')}.png`}
                className="inline-flex items-center gap-1.5 text-xs font-cinzel font-bold text-[#F6F4EE] hover:text-[#E9DDC5] border-b border-[#E9DDC5] pb-0.5 tracking-wider transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> UNDUH SOFTFILE
              </a>

              <button
                type="button"
                onClick={() => {
                  if (audioPlayerRef.current) audioPlayerRef.current.pause();
                  setSelectedMemory(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-cinzel font-bold text-[#F6F4EE] hover:text-[#E9DDC5] border-b border-[#E9DDC5] pb-0.5 tracking-wider transition-colors"
              >
                TUTUP <X className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {/* Framed Photostrip Image */}
            <div className="rounded-2xl overflow-hidden bg-[#F6F4EE] p-3 flex justify-center shadow-inner border border-[#E9DDC5]">
              <img
                src={selectedMemory.stripUrl}
                alt={selectedMemory.guestName}
                className="max-h-[48vh] sm:max-h-[52vh] w-auto rounded-xl object-contain shadow"
              />
            </div>

            {/* Voice Message Capsule (if available) */}
            {selectedMemory.audioUrl && (
              <div className="p-3 rounded-full bg-[#F6F4EE] text-[#263727] flex items-center justify-between gap-3 shadow-md border border-[#E9DDC5]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handlePlayVoice(selectedMemory.id, selectedMemory.audioUrl)}
                    className="w-10 h-10 rounded-full bg-[#263727] text-[#F6F4EE] flex items-center justify-center shadow hover:bg-[#1b281c] transition-transform active:scale-95"
                  >
                    {activeAudioId === selectedMemory.id ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                  <span className="font-cinzel font-bold text-xs sm:text-sm text-[#263727]">
                    {selectedMemory.audioDuration
                      ? `00:${String(selectedMemory.audioDuration).padStart(2, '0')}`
                      : '00:05'}
                  </span>
                </div>

                {/* Animated sound wave bars */}
                <div className="flex items-center gap-1 h-6 px-3">
                  {[10, 18, 24, 14, 20, 26, 12, 22, 16, 20, 10, 16].map((h, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all ${
                        activeAudioId === selectedMemory.id
                          ? 'bg-[#263727] animate-wmpulse'
                          : 'bg-[#263727]/30'
                      }`}
                      style={{
                        height: `${h}px`,
                        animationDelay: `${(i % 4) * 0.12}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Guest Name & Wishes */}
            <div className="space-y-1 pt-1">
              <h3 className="font-cinzel text-xl sm:text-2xl font-bold tracking-[0.08em] text-[#F6F4EE] uppercase">
                {selectedMemory.guestName}
              </h3>
              {selectedMemory.guestMessage && (
                <p className="text-xs sm:text-sm text-[#F6F4EE]/90 italic font-serif bg-white/10 p-3 rounded-2xl border border-white/10 leading-relaxed">
                  "{selectedMemory.guestMessage}"
                </p>
              )}
            </div>

            {/* Footer: Date, Time, and Love Button */}
            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-[#E9DDC5] font-cinzel">
              <span className="font-medium tracking-wider">
                {new Date(selectedMemory.createdAt).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }).toUpperCase()}
              </span>

              <div className="flex items-center gap-3">
                <span className="tracking-wider text-[11px] text-[#F6F4EE]/80">
                  {new Date(selectedMemory.createdAt).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })} WIB
                </span>

                <button
                  type="button"
                  onClick={() => onLike && onLike(selectedMemory.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    likedMemoryIds.includes(selectedMemory.id)
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                  title={
                    likedMemoryIds.includes(selectedMemory.id)
                      ? 'Batal suka (Unlove)'
                      : 'Sukai kenangan ini (Love)'
                  }
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      likedMemoryIds.includes(selectedMemory.id)
                        ? 'fill-white text-white'
                        : 'text-white'
                    }`}
                  />
                  <span>
                    {memories.find((m) => m.id === selectedMemory.id)?.likesCount ||
                      selectedMemory.likesCount ||
                      0}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
