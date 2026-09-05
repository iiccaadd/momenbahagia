import React, { useState } from 'react';
import { Lock, User, KeyRound, Eye, EyeOff, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLogin({ onLoginSuccess, onCancel, couple = {} }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // Required credentials: username "mirstyvan", password "11nov2026"
    if (cleanUser === 'mirstyvan' && cleanPass === '11nov2026') {
      try {
        localStorage.setItem('wedding_admin_auth', 'true');
        localStorage.setItem('wedding_admin_user', 'mirstyvan');
      } catch (e) {}

      setTimeout(() => {
        setIsLoading(false);
        onLoginSuccess();
      }, 400);
    } else {
      setTimeout(() => {
        setIsLoading(false);
        setErrorMsg('Username atau password tidak sesuai. Akses khusus pengantin / panitia.');
      }, 300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-wmfadein select-none">
      <div className="w-full max-w-sm bg-[#F6F4EE] rounded-[32px] shadow-2xl border border-[#E9DDC5] overflow-hidden animate-wmsheetin text-[#263727]">
        {/* Top Header Decorative Banner */}
        <div className="bg-[#263727] text-[#F6F4EE] p-6 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6 text-[#E9DDC5]" />
          </div>

          <span className="text-[10px] tracking-[0.2em] font-cinzel uppercase text-[#E9DDC5]/80 font-semibold">
            CONTROL PANEL
          </span>
          <h2 className="font-serif-elegant font-bold text-xl text-white mt-0.5">
            Masuk Sebagai Admin
          </h2>
          <p className="text-[11px] text-[#E9DDC5]/70 font-sans mt-1">
            {couple.displayNames || 'Adisty & Irsyad'} • Wedding Control
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-cinzel font-bold text-[#263727] uppercase tracking-wider">
              Username Admin
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#999794]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-[#E9DDC5] text-sm text-[#263727] placeholder-[#999794] focus:outline-none focus:ring-2 focus:ring-[#263727]/30 transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-cinzel font-bold text-[#263727] uppercase tracking-wider">
              Kata Sandi
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#999794]">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white border border-[#E9DDC5] text-sm text-[#263727] placeholder-[#999794] focus:outline-none focus:ring-2 focus:ring-[#263727]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#999794] hover:text-[#263727] transition-colors"
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full py-3.5 rounded-2xl bg-[#263727] hover:bg-[#1d2b1e] active:scale-98 text-[#F6F4EE] font-cinzel font-bold text-xs tracking-[0.14em] uppercase shadow-lg transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>MEMVERIFIKASI...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>MASUK KE PANEL ADMIN</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 text-xs font-semibold text-[#5e4b3c] hover:text-[#263727] transition-colors flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Tamu</span>
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="bg-[#E9DDC5]/40 px-6 py-3 border-t border-[#E9DDC5] text-center">
          <p className="text-[10px] text-[#7a6b5d]">
            Halaman ini khusus untuk mempelai & panitia pengelola acara.
          </p>
        </div>
      </div>
    </div>
  );
}
