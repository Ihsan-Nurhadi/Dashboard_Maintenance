import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export function Layout({ user, onLogout }) {
  const navigate = useNavigate();

  // State Sidebar: open | closed (persisted in localStorage)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('nms_sidebar_open');
    if (saved !== null) {
      return saved === 'true';
    }
    return typeof window !== 'undefined' ? window.innerWidth > 768 : true;
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem('nms_sidebar_open', String(next));
      return next;
    });
  };

  const handleNavClick = () => {
    if (window.innerWidth <= 768) {
      setIsSidebarOpen(false);
    }
  };

  // State Tema: 'light' | 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nms_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nms_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // State Modal Ganti Password
  const [showPassModal, setShowPassModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  const handleOpenPassModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPassError('');
    setPassSuccess('');
    setShowPassModal(true);
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword.length < 6) {
      setPassError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setPassLoading(true);
    try {
      await api.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPassSuccess('Password berhasil diubah! Gunakan password baru untuk login berikutnya.');
      setTimeout(() => {
        setShowPassModal(false);
      }, 1500);
    } catch (err) {
      setPassError(err.message || 'Gagal mengubah password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      onLogout();
      navigate('/login');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      {/* Backdrop saat sidebar terbuka di layar mobile */}
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar Navigasi Utama */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div className="sidebar-brand-badge">DMT</div>
            <div className="sidebar-brand-text">
              <div className="sidebar-title">NMS Dashboard</div>
              <div className="sidebar-subtitle">Maintenance & Troubleshoot</div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={toggleSidebar}
            title="Tutup Sidebar"
            aria-label="Tutup Sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
        </div>

        <nav className="sidebar-menu">
          <NavLink
            to="/"
            end
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            <span>Ongoing Troubleshoot</span>
          </NavLink>

          <NavLink
            to="/sites"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Halaman List Site</span>
          </NavLink>

          <NavLink
            to="/ts-form"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            <span>Halaman Form TS</span>
          </NavLink>

          <NavLink
            to="/report-after-ts"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"></path>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            <span>Report After TS</span>
          </NavLink>

          <NavLink
            to="/riwayat-ts"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>Riwayat TS</span>
          </NavLink>

          <NavLink
            to="/riwayat-pemasangan"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            <span>Riwayat Pemasangan</span>
          </NavLink>

          <NavLink
            to="/pics"
            onClick={handleNavClick}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>Daftar PIC & Teknisi</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span style={{ fontSize: 12.5, color: 'var(--sidebar-text-muted)' }}>
            User: <strong style={{ color: '#FFFFFF' }}>{user?.username || 'User'}</strong>
          </span>
          <button className="btn-secondary btn-sm" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </aside>

      {/* Konten Halaman */}
      <main className="main-content">
        {/* Topbar dengan Tombol Toggle Sidebar dan Dark / Light Mode */}
        <header className="top-nav-bar">
          <div className="top-nav-left">
            <button
              type="button"
              className={`sidebar-toggle-btn ${isSidebarOpen ? 'active' : ''}`}
              onClick={toggleSidebar}
              title={isSidebarOpen ? "Tutup Sidebar" : "Buka Sidebar"}
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              )}
            </button>

            <div className="top-nav-status">
              <span className="live-dot"></span>
              <span>DMT NMS Maintenance System</span>
            </div>
          </div>

          <div className="top-nav-actions">
            {/* Tombol Switch Light / Dark Mode */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {theme === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
            </button>

            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleOpenPassModal}
              title="Ganti Password Akun"
              style={{ fontSize: 12 }}
            >
              🔑 Ganti Password
            </button>

            <span className="user-profile-badge">
              👤 {user?.username || 'admin'}
            </span>
          </div>
        </header>

        <Outlet />
      </main>

      {/* Modal Ganti Password Langsung dari Dashboard */}
      {showPassModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
          padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16 }}>Ganti Password Akun</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowPassModal(false)}
              >
                &times; Tutup
              </button>
            </div>

            {passError && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--st-trouble-bg)',
                color: 'var(--st-trouble-text)',
                borderRadius: 4,
                marginBottom: 14,
                fontSize: 13,
              }}>
                {passError}
              </div>
            )}

            {passSuccess && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--st-done-bg)',
                color: 'var(--st-done-text)',
                borderRadius: 4,
                marginBottom: 14,
                fontSize: 13,
              }}>
                {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} autoComplete="off">
              <div className="form-group">
                <label className="form-label">Password Lama *</label>
                <input
                  type="password"
                  style={{ width: '100%' }}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password lama"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Baru (Minimal 6 Karakter) *</label>
                <input
                  type="password"
                  style={{ width: '100%' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Konfirmasi Password Baru *</label>
                <input
                  type="password"
                  style={{ width: '100%' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPassModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={passLoading}
                >
                  {passLoading ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

