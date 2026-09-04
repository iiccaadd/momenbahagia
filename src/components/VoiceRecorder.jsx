import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Volume2, Sparkles, Trash2 } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';

export default function VoiceRecorder({ onRecordingComplete, onRemoveAudio }) {
  const notify = useNotify();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        if (onRecordingComplete) {
          onRecordingComplete({
            blob: blob,
            url: url,
            duration: recordingTime,
          });
        }
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      notify.warning('Tidak dapat mengakses mikrofon. Mohon periksa dan izinkan akses mikrofon di browser Anda.', 'Izin Mikrofon');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioPlayerRef.current) {
      setPlaybackTime(Math.floor(audioPlayerRef.current.currentTime));
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (onRemoveAudio) onRemoveAudio();
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#FAFAF3] rounded-2xl p-4 border border-[#E9DDC5] space-y-4">
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          onTimeUpdate={handleTimeUpdate}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-[#263727] font-cinzel block">
          Rekam Harapan untuk Mempelai
        </span>
        <p className="text-[11px] text-[#999794]">
          Sampaikan doa & harapanmu — tanpa batas waktu
        </p>
      </div>

      {/* Main Record Area */}
      {!audioUrl ? (
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          {/* Animated Pulse Waveform Bars */}
          {isRecording ? (
            <div className="flex items-center justify-center gap-1.5 h-12">
              {[18, 28, 40, 24, 36, 44, 20, 32, 42, 26, 38].map((height, i) => (
                <div
                  key={i}
                  className="w-1.5 bg-[#CB3A30] rounded-full animate-wmpulse"
                  style={{
                    height: `${height}px`,
                    animationDelay: `${(i % 4) * 0.15}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1 h-8 opacity-40">
              {[12, 16, 22, 14, 18, 24, 16, 20].map((h, i) => (
                <div key={i} className="w-1 bg-[#263727] rounded-full" style={{ height: `${h}px` }} />
              ))}
            </div>
          )}

          {/* Record Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isRecording
                ? 'bg-[#CB3A30] text-white animate-pulse ring-4 ring-[#CB3A30]/30'
                : 'bg-[#263727] text-[#F6F4EE] hover:bg-[#1d2b1e] hover:scale-105'
            }`}
          >
            {isRecording ? <Square className="w-6 h-6 fill-white" /> : <Mic className="w-7 h-7" />}
          </button>

          {/* Status Label & Timer */}
          <div className="text-center">
            <span className="font-cinzel text-sm font-bold text-[#263727] block">
              {formatTime(recordingTime)}
            </span>
            <span className="text-[11px] text-[#999794]">
              {isRecording ? 'Sedang merekam suara... Tekan kotak merah untuk selesai' : 'Ketuk mikrofon untuk mulai rekam'}
            </span>
          </div>
        </div>
      ) : (
        /* Audio Recorded Playback Card */
        <div className="bg-[#F6F4EE] rounded-xl p-3 border border-[#E9DDC5] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-[#263727] text-[#F6F4EE] flex items-center justify-center shadow hover:bg-[#1d2b1e]"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>
              <div>
                <span className="text-xs font-bold text-[#263727] block font-cinzel">
                  Pesan Suara ({formatTime(recordingTime)})
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  {isPlaying ? `Memutar: ${formatTime(playbackTime)}` : 'Siap dikirim bersama foto'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetRecording}
              className="p-2 text-[#999794] hover:text-[#CB3A30] hover:bg-rose-50 rounded-lg transition-colors"
              title="Rekam Ulang"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Visualizer Waveform Bar */}
          <div className="flex items-center gap-1 h-6 px-1">
            {[10, 18, 24, 14, 20, 26, 12, 22, 28, 16, 14, 20, 24, 12].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  isPlaying ? 'bg-[#263727]' : 'bg-[#263727]/30'
                }`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
