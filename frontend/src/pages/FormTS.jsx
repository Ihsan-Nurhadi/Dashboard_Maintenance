import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export function FormTS() {
  const [searchParams] = useSearchParams();
  const initialSiteId = searchParams.get('siteId') || '';

  const [siteQuery, setSiteQuery] = useState(initialSiteId);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSiteSummary, setSelectedSiteSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Form Fields
  const [vpnStatus, setVpnStatus] = useState('NEW_VPN');
  const [responseStatus, setResponseStatus] = useState('NO_RESPONSE');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [pic1, setPic1] = useState('');
  const [pic2, setPic2] = useState('');
  const [problem, setProblem] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // Autocomplete search
  useEffect(() => {
    if (!siteQuery || siteQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.lookupSites(siteQuery);
        setSuggestions(res || []);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [siteQuery]);

  // Load site summary saat site dipilih
  const loadSiteDetail = async (sid) => {
    setLoadingSummary(true);
    setError('');
    try {
      const data = await api.getSiteSummary(sid);
      setSelectedSiteSummary(data);
      setSiteQuery(data.site.site_id);
      setSuggestions([]);

      // Auto-fill PIC dari master jika kosong
      if (data.site.implementation_team) setPic1(data.site.implementation_team);
      if (data.site.team_leader) setPic2(data.site.team_leader);
    } catch (err) {
      setError('Site ID tidak ditemukan di master data.');
      setSelectedSiteSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (initialSiteId) {
      loadSiteDetail(initialSiteId);
    }
  }, [initialSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSiteSummary?.site) {
      setError('Silakan pilih Site ID yang valid dari daftar master site.');
      return;
    }
    if (!planDate) {
      setError('Tanggal plan kunjungan wajib diisi.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await api.createTroubleshoot({
        site_id: selectedSiteSummary.site.site_id,
        status: 'PLAN',
        vpn_status: vpnStatus,
        response: responseStatus,
        plan_date: planDate,
        pic1,
        pic2,
        problem,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan Plan TS.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman Form TS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Buat rencana penanganan troubleshoot (Plan TS) untuk site bermasalah
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
          Kembali
        </button>
      </div>

      <div className="page-body" style={{ maxWidth: 900 }}>
        {error && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--st-trouble-bg)',
            color: 'var(--st-trouble-text)',
            borderRadius: 4,
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Bagian Pencarian Site ID */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>1. Cari Master Data Site</h3>
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Search Bar (Site ID / Nama Site) *</label>
              <input
                type="text"
                style={{ width: '100%' }}
                placeholder="Ketik minimal 2 karakter (contoh: TAB, BKS, DPR)..."
                value={siteQuery}
                onChange={(e) => setSiteQuery(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  borderRadius: 6,
                  zIndex: 20,
                  maxHeight: 200,
                  overflowY: 'auto',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  {suggestions.map((s) => (
                    <div
                      key={s.site_id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 13,
                        color: 'var(--text-main)',
                      }}
                      onMouseDown={() => loadSiteDetail(s.site_id)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <strong>{s.site_id}</strong> - {s.name} ({s.regional} / {s.city})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loadingSummary && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Memuat informasi site...</p>
            )}

            {/* Tampilan Data Site Master */}
            {selectedSiteSummary?.site && (
              <div className="info-box" style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}>
                <div><strong>Site ID:</strong> {selectedSiteSummary.site.site_id}</div>
                <div><strong>Nama Site:</strong> {selectedSiteSummary.site.name}</div>
                <div><strong>Regional:</strong> {selectedSiteSummary.site.regional || '-'}</div>
                <div><strong>Kab/Kota:</strong> {selectedSiteSummary.site.city || '-'}</div>
                <div><strong>IP VPN:</strong> {selectedSiteSummary.site.ip_vpn || '-'}</div>
                <div><strong>Mitra:</strong> {selectedSiteSummary.site.partner || '-'}</div>
              </div>
            )}
          </div>

          {/* Ringkasan Riwayat TS Site Terkait */}
          {selectedSiteSummary && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15 }}>
                  Ringkasan Riwayat TS Site Ini ({selectedSiteSummary.history_total} Total)
                </h3>
                {selectedSiteSummary.history_total > 0 && (
                  <Link
                    to={`/riwayat-ts?site=${encodeURIComponent(selectedSiteSummary.site.site_id)}`}
                    style={{ fontSize: 13 }}
                  >
                    Lihat Semua Riwayat &rarr;
                  </Link>
                )}
              </div>

              {selectedSiteSummary.ongoing?.length > 0 && (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--st-plan-bg)',
                  color: 'var(--st-plan-text)',
                  borderRadius: 4,
                  marginBottom: 12,
                  fontSize: 13
                }}>
                  Peringatan: Site ini masih memiliki {selectedSiteSummary.ongoing.length} TS ongoing yang belum selesai.
                </div>
              )}

              {selectedSiteSummary.recent_history.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada riwayat TS sebelumnya untuk site ini.</p>
              ) : (
                <table style={{ fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Tanggal TS</th>
                      <th>Status Hasil</th>
                      <th>Keterangan Masalah / Tindakan</th>
                      <th>PIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSiteSummary.recent_history.map((h) => (
                      <tr key={h.id}>
                        <td>{h.actual_date || h.plan_date || '-'}</td>
                        <td><StatusBadge status={h.status} type="ts" /></td>
                        <td>{h.description || h.problem || '-'}</td>
                        <td>{h.pic1 || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Form Detail Plan TS */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 16 }}>2. Form Detail Plan Troubleshoot</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Status VPN</label>
                <select value={vpnStatus} onChange={(e) => setVpnStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="NEW_VPN">NEW VPN</option>
                  <option value="OLD_VPN">OLD VPN</option>
                  <option value="VPN_GONE">VPN GONE</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Kondisi Respon</label>
                <select value={responseStatus} onChange={(e) => setResponseStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="NO_RESPONSE">NO RESPONSE</option>
                  <option value="RESPONSE">RESPONSE</option>
                  <option value="RESPONSE_OFFLINE">RESPONSE | OFFLINE</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Plan Kunjungan (Tanggal) *</label>
                <input
                  type="date"
                  style={{ width: '100%' }}
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">PIC 1 (Tim / Teknisi)</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Nama / Nomor HP"
                  value={pic1}
                  onChange={(e) => setPic1(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">PIC 2 (Team Leader)</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Nama / Nomor HP"
                  value={pic2}
                  onChange={(e) => setPic2(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan / Indikasi Masalah</label>
              <textarea
                rows="3"
                style={{ width: '100%' }}
                placeholder="Deskripsikan kendala yang dialami site (misal: RUT mati, adaptor rusak, CCTV no signal)..."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !selectedSiteSummary?.site}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Plan TS'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

