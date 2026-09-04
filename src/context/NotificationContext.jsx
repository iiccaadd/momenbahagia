import React, { createContext, useContext, useState, useCallback } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, HelpCircle, XCircle, Heart, X } from 'lucide-react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info', // 'info', 'warning', 'success', 'error', 'confirm'
    title: '',
    message: '',
    confirmText: 'Mengerti',
    cancelText: 'Batal',
    resolve: null,
  });

  const [toast, setToast] = useState(null);

  // Trigger modal alert
  const showAlert = useCallback(({ message, title = '', type = 'info', confirmText = 'Mengerti' }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type,
        title: title || (type === 'error' ? 'Terjadi Kesalahan' : type === 'warning' ? 'Perhatian' : type === 'success' ? 'Berhasil' : 'Pemberitahuan'),
        message,
        confirmText,
        cancelText: '',
        resolve,
      });
    });
  }, []);

  // Trigger modal confirm
  const showConfirm = useCallback(({ message, title = 'Konfirmasi', confirmText = 'Ya, Lanjutkan', cancelText = 'Batal' }) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        confirmText,
        cancelText,
        resolve,
      });
    });
  }, []);

  // Quick helper methods
  const notify = {
    info: (message, title = 'Pemberitahuan') => showAlert({ message, title, type: 'info' }),
    warning: (message, title = 'Perhatian') => showAlert({ message, title, type: 'warning' }),
    success: (message, title = 'Berhasil') => showAlert({ message, title, type: 'success' }),
    error: (message, title = 'Terjadi Kesalahan') => showAlert({ message, title, type: 'error' }),
    confirm: (message, title = 'Konfirmasi', confirmText, cancelText) => showConfirm({ message, title, confirmText, cancelText }),
    toast: (message, type = 'info') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleConfirm = () => {
    if (modalState.resolve) modalState.resolve(true);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (modalState.resolve) modalState.resolve(false);
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}

      {/* Elegant Wedding Modal Popup */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-wmfadein select-none">
          <div className="relative w-full max-w-sm bg-[#FBF9F5] rounded-[28px] border border-[#E9DDC5] shadow-2xl p-6 sm:p-7 text-center space-y-4 overflow-hidden animate-wmsheetin">
            {/* Top decorative lace ornament */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#E9DDC5] via-[#263727] to-[#E9DDC5]" />

            {/* Icon Badge */}
            <div className="mx-auto flex items-center justify-center">
              {modalState.type === 'warning' && (
                <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-inner">
                  <AlertCircle className="w-7 h-7 stroke-[2]" />
                </div>
              )}
              {modalState.type === 'error' && (
                <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-inner">
                  <XCircle className="w-7 h-7 stroke-[2]" />
                </div>
              )}
              {modalState.type === 'success' && (
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-7 h-7 stroke-[2]" />
                </div>
              )}
              {modalState.type === 'confirm' && (
                <div className="w-14 h-14 rounded-full bg-[#F3EDE2] border border-[#E9DDC5] text-[#263727] flex items-center justify-center shadow-inner">
                  <HelpCircle className="w-7 h-7 stroke-[2]" />
                </div>
              )}
              {modalState.type === 'info' && (
                <div className="w-14 h-14 rounded-full bg-[#F3EDE2] border border-[#E9DDC5] text-[#263727] flex items-center justify-center shadow-inner">
                  <Sparkles className="w-7 h-7 text-[#263727]" />
                </div>
              )}
            </div>

            {/* Title & Content */}
            <div className="space-y-1.5 pt-1">
              <h4 className="font-cinzel font-bold text-lg sm:text-xl text-[#263727] tracking-[0.04em] uppercase">
                {modalState.title}
              </h4>
              <p className="text-xs sm:text-sm text-[#55524e] leading-relaxed px-2 font-serif">
                {modalState.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-center gap-2.5">
              {modalState.cancelText && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 py-2.5 px-4 rounded-full border border-[#E9DDC5] text-[#6b6864] text-xs font-cinzel font-semibold hover:bg-[#E9DDC5]/40 transition-colors shadow-xs active:scale-95"
                >
                  {modalState.cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                className="flex-1 py-2.5 px-5 rounded-full bg-[#263727] text-[#F6F4EE] text-xs font-cinzel font-bold tracking-wider hover:bg-[#1b281c] transition-transform shadow-md hover:scale-[1.02] active:scale-95"
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 inset-x-0 z-[9999] flex justify-center pointer-events-none px-4 animate-wmfadein">
          <div className="pointer-events-auto max-w-sm px-4 py-2.5 rounded-full bg-[#263727]/95 text-[#F6F4EE] backdrop-blur-md border border-[#E9DDC5]/30 shadow-2xl flex items-center gap-2.5 text-xs">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Fallback if context not mounted
    return {
      info: (msg) => alert(msg),
      warning: (msg) => alert(msg),
      success: (msg) => alert(msg),
      error: (msg) => alert(msg),
      confirm: (msg) => Promise.resolve(window.confirm(msg)),
      toast: (msg) => console.log(msg),
    };
  }
  return ctx;
}
