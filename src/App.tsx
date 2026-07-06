import React, { useState } from 'react';
import { CitizenPortal } from './components/CitizenPortal';
import { AdminPortal } from './components/AdminPortal';
import { Landmark, ShieldAlert, Sparkles, User, ShieldCheck } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'citizen' | 'admin'>('citizen');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Handle Mock Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminLoggedIn(true);
        setAdminEmail('');
        setAdminPassword('');
      } else {
        setLoginError(data.error || 'Email atau password salah');
      }
    } catch (e) {
      setLoginError('Koneksi terputus. Gagal menghubungi server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col font-sans text-[#1C1A17]">
      {/* Dynamic Global Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#E5E1DA] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Logo & Village Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1C1A17] text-[#FAF9F5] rounded-md shadow-sm">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif font-black text-xl text-[#1C1A17] tracking-tight leading-none flex items-center gap-2">
                Surat Desa Online
                <span className="bg-[#8C8170]/10 text-[#8C8170] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">v2.0</span>
              </h1>
              <p className="text-[10px] text-[#8C8170] font-mono uppercase tracking-wider mt-1">Sistem Pelayanan Administrasi Mandiri Desa Harapan Jaya</p>
            </div>
          </div>

          {/* Quick Switch Switcher for AI Studio Preview ease-of-use */}
          <div className="flex bg-[#FAF9F5] p-1 rounded-lg border border-[#E5E1DA]">
            <button
              onClick={() => setRole('citizen')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all ${
                role === 'citizen'
                  ? 'bg-[#1C1A17] text-white shadow-sm'
                  : 'text-[#8C8170] hover:text-[#1C1A17]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Portal Warga
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs font-bold transition-all ${
                role === 'admin'
                  ? 'bg-[#1C1A17] text-white shadow-sm'
                  : 'text-[#8C8170] hover:text-[#1C1A17]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Panel Pamong Desa
            </button>
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 bg-[#FAF9F5]">
        {role === 'citizen' ? (
          /* Render Citizen Portal directly */
          <CitizenPortal />
        ) : isAdminLoggedIn ? (
          /* Render Admin Portal if logged in */
          <AdminPortal onLogout={handleAdminLogout} />
        ) : (
          /* Render elegant Admin login page if role is admin but not logged in */
          <div className="max-w-md mx-auto my-16 px-4">
            <div className="bg-white p-8 rounded-lg border border-[#E5E1DA] shadow-[0_4px_24px_rgba(28,26,23,0.04)] space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#FAF9F5] text-[#1C1A17] border border-[#E5E1DA] rounded-md flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-serif font-bold text-[#1C1A17]">Sistem Autentikasi Pamong</h2>
                <p className="text-xs text-[#8C8170]">Gunakan akun admin resmi desa Anda untuk memproses berkas masuk.</p>
              </div>

              {loginError && (
                <div className="p-3 bg-[#FCF5F5] text-[#9E2A2B] rounded border border-[#F5E1E2] text-xs flex gap-1.5 items-center">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Explicit Admin Credentials Helper Badge */}
              <div className="bg-[#FDFBF7] p-4 rounded border border-[#E5DBCF] space-y-1 text-xs">
                <div className="flex items-center gap-1 font-bold text-[#8C8170] uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5 text-[#AF9F86]" />
                  <span>Kredensial Pengujian (Demo Admin):</span>
                </div>
                <p className="font-mono text-[11px] text-[#5C5549] leading-relaxed pt-0.5">
                  📧 <strong>Email:</strong> malingpingpos@gmail.com<br />
                  🔑 <strong>Sandi:</strong> admindesa123
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1">Email Administrator</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@pamong.harapanjaya.desa.id"
                    className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#8C8170] uppercase tracking-wider mb-1">Kata Sandi</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#FAF9F5] border border-[#E5E1DA] rounded-md px-4 py-2.5 text-xs text-[#1C1A17] focus:outline-none focus:border-[#1C1A17] focus:bg-white transition"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-[#1C1A17] hover:bg-[#2D2A25] text-white font-bold py-3 rounded-md text-xs tracking-wider uppercase transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loginLoading ? 'Memeriksa Sandi...' : 'Masuk Panel Keamanan'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Clean elegant Village Footer */}
      <footer className="bg-white border-t border-[#E5E1DA] py-6 text-center text-[10px] text-[#8C8170] font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© 2026 Pemerintah Desa Harapan Jaya. Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1">
            Teknologi TTE Terverifikasi & Sandi Mandiri Digital Desa • <span className="bg-[#EAF2ED] text-[#3F5E4D] border border-[#CDE1D5] font-bold px-1.5 py-0.5 rounded text-[8px]">ONLINE</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
