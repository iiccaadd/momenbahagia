import React, { useState, useRef } from 'react';
import { Play, Pause, Heart, Download, Sparkles, MessageCircle, Volume2, User, Eye, X } from 'lucide-react';

export default function ExploreMemories({ memories = [], onLike }) {
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
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

      <div className="space-y-4">
        {memories.map((m) => (
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
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F6F4EE] text-[#263727] hover:bg-[#E9DDC5] text-xs font-semibold transition-colors"
                >
                  <Heart className="w-3.5 h-3.5 fill-[#CB3A30] text-[#CB3A30]" />
                  <span>{m.likesCount || 0}</span>
                </button>
              </div>
            </div>

            {/* Photostrip Image Card */}
            <div
              onClick={() => setZoomImage(m.stripUrl)}
              className="rounded-xl overflow-hidden bg-[#F6F4EE] p-2 flex justify-center cursor-pointer group relative shadow-inner"
            >
              <img
                src={m.stripUrl}
                alt={m.guestName}
                className="max-h-[280px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <span className="px-3 py-1.5 rounded-full bg-white/90 text-[#263727] text-xs font-bold flex items-center gap-1 shadow">
                  <Eye className="w-3.5 h-3.5" /> Lihat Penuh
                </span>
              </div>
            </div>

            {/* Voice Message Player (KisahKekal Style) */}
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

            {/* Download Link */}
            <div className="flex justify-end pt-1 border-t border-[#F6F4EE]">
              <a
                href={m.stripUrl}
                download={`wedding-memory-${m.guestName}.png`}
                className="inline-flex items-center gap-1.5 text-xs text-[#263727] hover:underline font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Softfile
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Full-Screen Zoom Modal */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-wmfadein cursor-pointer"
        >
          <div className="relative max-h-[90vh] max-w-[90vw] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-[#E9DDC5] p-1"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={zoomImage}
              alt="Zoom Preview"
              className="max-h-[85vh] w-auto rounded-2xl shadow-2xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
