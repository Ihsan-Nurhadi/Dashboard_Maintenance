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

            <span className="user-profile-badge">
              👤 {user?.username || 'admin'}
            </span>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

