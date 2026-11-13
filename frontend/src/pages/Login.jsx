import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ username: username.trim(), password });
      onLoginSuccess(res);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Username atau password salah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1E232A'
    }}>
      <div className="card" style={{ width: 380, padding: 36, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, #C91D24, #991419)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 18,
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 3px 6px rgba(201, 29, 36, 0.35)'
          }}>
            DMT
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Masuk Sistem</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Dashboard Monitoring & Maintenance NMS
          </p>
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'var(--st-trouble-bg)',
            color: 'var(--st-trouble-text)',
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 13
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              name="username"
              autoComplete="off"
              style={{ width: '100%' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: 12,
                  padding: 0,
                  cursor: 'pointer',
                  boxShadow: 'none',
                }}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              style={{ width: '100%' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

