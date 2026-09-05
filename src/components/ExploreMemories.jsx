import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Heart, Download, Sparkles, X, Eye, Volume2 } from 'lucide-react';

export default function ExploreMemories({
  memories = [],
  onLike,
  likedMemoryIds = [],
  couple = {},
}) {
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const audioPlayerRef = useRef(null);

  // Lock background scroll when detail modal is open
  useEffect(() => {
    if (selectedMemory) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [selectedMemory]);

  const handlePlayVoice = (id, url, e) => {
    if (e) e.stopPropagation();
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

  const formatAudioTime = (seconds) => {
    const sec = Math.max(0, parseInt(seconds || 0, 10));
    const mins = Math.floor(sec / 60);
    const remaining = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString) => {
    try {
      const d = new Date(isoString || Date.now());
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();
    } catch (e) {
      return '03 SEP 2026';
    }
  };

  const formatTime = (isoString) => {
    try {
      const d = new Date(isoString || Date.now());
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch (e) {
      return '17.49 WIB';
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
    <div className="space-y-4">
      <audio
        ref={audioPlayerRef}
        onEnded={() => setActiveAudioId(null)}
        className="hidden"
      />

      {/* 2-Column Parallel Grid for Photobooth Results (Posisi Sejajar Sesuai Foto) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {memories.map((m) => {
          const isLiked = likedMemoryIds.includes(m.id);

          return (
            <div
              key={m.id}
              onClick={() => setSelectedMemory(m)}
              className="group relative flex flex-col bg-[#263727] text-[#F6F4EE] rounded-2xl sm:rounded-[22px] overflow-hidden border border-[#E9DDC5]/40 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer select-none"
            >
              {/* Photostrip Image Preview Area */}
              <div className="w-full min-h-[220px] sm:min-h-[260px] bg-[#1d2b1e] p-1 sm:p-1.5 flex items-center justify-center relative overflow-hidden rounded-t-2xl sm:rounded-t-[22px]">
                {m.stripImage || m.stripUrl ? (
                  <img
                    src={m.stripImage || m.stripUrl}
                    alt={m.guestName}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.image-fallback-box');
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                    className="w-full h-auto max-h-[340px] sm:max-h-[380px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : null}

                {/* Aesthetic Fallback Tile if image is not present or failed to load */}
                <div
                  className={`image-fallback-box w-full min-h-[220px] sm:min-h-[260px] rounded-xl flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#223323] to-[#172318] border border-dashed border-[#E9DDC5]/30 ${
                    m.stripImage || m.stripUrl ? 'hidden' : 'flex'
                  }`}
                >
                  <Sparkles className="w-8 h-8 text-[#E9DDC5] mb-2 opacity-70 animate-pulse" />
                  <span className="font-cinzel text-xs font-bold text-[#F6F4EE] uppercase tracking-wider line-clamp-1">
                    {m.guestName}
                  </span>
                  <span className="text-[10px] text-[#E9DDC5]/70 mt-1 font-serif italic line-clamp-2 px-2">
                    {m.message || m.guestMessage || 'Momen Bahagia Resepsi'}
                  </span>
                </div>

                {/* Floating Love Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onLike) onLike(m.id);
                  }}
                  className={`absolute top-2.5 right-2.5 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md shadow-md transition-all active:scale-90 z-10 ${
                    isLiked
                      ? 'bg-rose-600/90 text-white border border-rose-400'
                      : 'bg-black/50 text-white/90 hover:bg-black/70 border border-white/20'
                  }`}
                  title={isLiked ? "Batal suka (Unlove)" : "Sukai kenangan (Love)"}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      isLiked ? 'fill-white text-white scale-110' : 'text-white'
                    }`}
                  />
                  <span>{m.likesCount || 0}</span>
                </button>

                {/* Voice Note Capsule Floating Badge */}
                {m.audioUrl && (
                  <button
                    type="button"
                    onClick={(e) => handlePlayVoice(m.id, m.audioUrl, e)}
                    className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full text-[10px] font-cinzel font-semibold bg-black/70 text-[#E9DDC5] backdrop-blur-md border border-[#E9DDC5]/40 flex items-center gap-1.5 hover:bg-black/90 transition-all shadow-md z-10"
                    title="Putar Pesan Suara"
                  >
                    {activeAudioId === m.id ? (
                      <Pause className="w-3 h-3 fill-[#E9DDC5] text-[#E9DDC5]" />
                    ) : (
                      <Play className="w-3 h-3 fill-[#E9DDC5] text-[#E9DDC5]" />
                    )}
                    <span>{m.audioDuration ? `${m.audioDuration}s` : 'Voice'}</span>
                  </button>
                )}
              </div>

              {/* Bottom Card Bar (Matching User Screenshot Layout in Sage Green) */}
              <div className="px-3 py-2.5 bg-[#263727] flex flex-col justify-between">
                {/* Guest Name in Bold Uppercase */}
                <h4 className="font-cinzel font-bold text-xs sm:text-sm text-[#F6F4EE] tracking-wider uppercase truncate">
                  {m.guestName}
                </h4>

                {/* Fine Horizontal Dividing Line */}
                <div className="w-full h-[1px] bg-white/20 my-1.5" />

                {/* Date on Left, Time on Right */}
                <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-white/80 font-cinzel tracking-wider">
                  <span>{formatDate(m.createdAt)}</span>
                  <span>{formatTime(m.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Elegant Detail Pop-up Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-wmfadein">
          <div className="relative w-full max-w-sm sm:max-w-md bg-[#263727] text-[#F6F4EE] rounded-[32px] border border-[#E9DDC5]/40 shadow-2xl p-5 sm:p-6 space-y-4 overflow-hidden animate-wmsheetin my-auto">
            {/* Top Bar: Unduh Softfile & Tutup */}
            <div className="flex items-center justify-between pb-1 border-b border-white/10">
              <a
                href={selectedMemory.stripImage || selectedMemory.stripUrl}
                download={`wedding-photostrip-${(selectedMemory.guestName || 'memory').replace(/\s+/g, '-')}.jpg`}
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
              {selectedMemory.stripImage || selectedMemory.stripUrl ? (
                <img
                  src={selectedMemory.stripImage || selectedMemory.stripUrl}
                  alt={selectedMemory.guestName}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const fallback = e.target.parentElement.querySelector('.modal-fallback-box');
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                  className="max-h-[48vh] sm:max-h-[52vh] w-auto rounded-xl object-contain shadow"
                />
              ) : null}

              <div
                className={`modal-fallback-box w-full min-h-[220px] rounded-xl flex flex-col items-center justify-center p-6 text-center bg-[#1d2b1e] text-[#F6F4EE] ${
                  selectedMemory.stripImage || selectedMemory.stripUrl ? 'hidden' : 'flex'
                }`}
              >
                <Sparkles className="w-10 h-10 text-[#E9DDC5] mb-2 opacity-80" />
                <span className="font-cinzel text-base font-bold uppercase tracking-wider">{selectedMemory.guestName}</span>
                <span className="text-xs text-[#E9DDC5]/70 mt-1 font-serif italic">Kenangan Indah Resepsi</span>
              </div>
            </div>

            {/* Voice Message Capsule (if available) */}
            {selectedMemory.audioUrl && (
              <div className="p-3 rounded-full bg-[#F6F4EE] text-[#263727] flex items-center justify-between gap-3 shadow-md border border-[#E9DDC5]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => handlePlayVoice(selectedMemory.id, selectedMemory.audioUrl, e)}
                    className="w-10 h-10 rounded-full bg-[#263727] text-[#F6F4EE] flex items-center justify-center shadow hover:bg-[#1b281c] transition-transform active:scale-95"
                  >
                    {activeAudioId === selectedMemory.id ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>
                  <span className="font-cinzel font-bold text-xs sm:text-sm text-[#263727]">
                    {formatAudioTime(selectedMemory.audioDuration || 5)}
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
              {(selectedMemory.message || selectedMemory.guestMessage) && (
                <p className="text-xs sm:text-sm text-[#F6F4EE]/90 italic font-serif bg-white/10 p-3 rounded-2xl border border-white/10 leading-relaxed">
                  &ldquo;{selectedMemory.message || selectedMemory.guestMessage}&rdquo;
                </p>
              )}
            </div>

            {/* Footer: Date, Time, and Love Button */}
            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs text-[#E9DDC5] font-cinzel">
              <span className="font-medium tracking-wider">
                {formatDate(selectedMemory.createdAt)}
              </span>

              <div className="flex items-center gap-3">
                <span className="tracking-wider text-[11px] text-[#F6F4EE]/80">
                  {formatTime(selectedMemory.createdAt)}
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
