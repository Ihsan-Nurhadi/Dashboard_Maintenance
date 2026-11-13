import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export function Layout({ user, onLogout }) {
  const navigate = useNavigate();

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
      {/* Sidebar Navigasi Utama sesuai Diagram PRD */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand-badge">DMT</div>
          <div>
            <div className="sidebar-title">NMS Dashboard</div>
            <div className="sidebar-subtitle">Maintenance & Troubleshoot</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Ongoing Troubleshoot
          </NavLink>

          <NavLink
            to="/sites"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Halaman List Site
          </NavLink>

          <NavLink
            to="/ts-form"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Halaman Form TS
          </NavLink>

          <NavLink
            to="/report-after-ts"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Report After TS
          </NavLink>

          <NavLink
            to="/riwayat-ts"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Riwayat TS
          </NavLink>

          <NavLink
            to="/riwayat-pemasangan"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Riwayat Pemasangan
          </NavLink>

          <NavLink
            to="/pics"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          >
            Daftar PIC & Teknisi
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
        {/* Topbar dengan Tombol Filter Light / Dark Mode di Kanan Atas */}
        <header className="top-nav-bar">
          <div className="top-nav-status">
            <span className="live-dot"></span>
            <span>DMT NMS Maintenance System</span>
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

