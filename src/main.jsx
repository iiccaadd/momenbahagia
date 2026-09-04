import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error Boundary caught:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('wedding_memories');
      localStorage.removeItem('wedding_settings');
      localStorage.removeItem('wedding_templates');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F6F4EE] flex flex-col items-center justify-center p-6 text-center select-none font-body text-[#263727]">
          <div className="max-w-md w-full bg-white p-6 rounded-3xl shadow-xl border border-[#E9DDC5] space-y-4">
            <h2 className="font-cinzel font-bold text-lg text-[#263727]">
              Wedding Photobooth & Live Memories
            </h2>
            <p className="text-xs text-[#64748B]">
              Sedang memperbarui aplikasi ke versi terbaru. Silakan klik tombol di bawah untuk memuat ulang halaman.
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 rounded-xl bg-[#263727] text-[#F6F4EE] font-cinzel font-bold text-xs tracking-wider uppercase shadow-md hover:bg-[#1b281c] transition-all"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
