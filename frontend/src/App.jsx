import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api/client';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { OngoingTS } from './pages/OngoingTS';
import { FormTS } from './pages/FormTS';
import { ListSite } from './pages/ListSite';
import { SiteDetail } from './pages/SiteDetail';
import { ReportAfterTS } from './pages/ReportAfterTS';
import { RiwayatTS } from './pages/RiwayatTS';
import { RiwayatPemasangan } from './pages/RiwayatPemasangan';
import { DaftarPIC } from './pages/DaftarPIC';

export function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Periksa status login sesi Django
    const checkAuth = async () => {
      try {
        const res = await api.me();
        if (res.authenticated) {
          setUser({ username: res.username });
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        color: 'var(--text-muted)'
      }}>
        Memuat aplikasi NMS Dashboard...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/" replace /> : <Login onLoginSuccess={(u) => setUser(u)} />
          }
        />

        {/* Halaman yang butuh login */}
        {user ? (
          <Route element={<Layout user={user} onLogout={() => setUser(null)} />}>
            <Route path="/" element={<OngoingTS />} />
            <Route path="/ts-form" element={<FormTS />} />
            <Route path="/sites" element={<ListSite />} />
            <Route path="/sites/:siteId" element={<SiteDetail />} />
            <Route path="/report-after-ts" element={<ReportAfterTS />} />
            <Route path="/riwayat-ts" element={<RiwayatTS />} />
            <Route path="/riwayat-pemasangan" element={<RiwayatPemasangan />} />
            <Route path="/pics" element={<DaftarPIC />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

export default App;

