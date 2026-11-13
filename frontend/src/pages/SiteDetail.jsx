import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export function SiteDetail() {
  const { siteId } = useParams();
  const [site, setSite] = useState(null);
  const [summary, setSummary] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [cctvAccounts, setCctvAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info'); // 'info' | 'ts' | 'status_logs' | 'cctv'

  // Modal / Form Catat Status Baru
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('ONLINE');
  const [newReason, setNewReason] = useState('');
  const [newPic, setNewPic] = useState('');

  const navigate = useNavigate();

  const loadAll = async () => {
    setLoading(true);
    try {
      const [siteRes, sumRes, logsRes, cctvRes] = await Promise.all([
        api.getSite(siteId),
        api.getSiteSummary(siteId),
        api.getSiteStatusLogs(siteId),
        api.getSiteCctv(siteId),
      ]);
      setSite(siteRes);
      setSummary(sumRes);
      setStatusLogs(logsRes.results || logsRes || []);
      setCctvAccounts(cctvRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [siteId]);

  const handleAddStatusLog = async (e) => {
    e.preventDefault();
    try {
      await api.addSiteStatusLog(siteId, {
        date: new Date().toISOString(),
        status: newStatus,
        reason: newReason,
        pic: newPic,
      });
      setShowStatusModal(false);
      setNewReason('');
      setNewPic('');
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div className="page-body">Memuat informasi detail site...</div>;
  }

  if (!site) {
    return (
      <div className="page-body">
        <p>Site tidak ditemukan.</p>
        <Link to="/sites" className="btn-secondary" style={{ marginTop: 12, display: 'inline-block' }}>
          &larr; Kembali ke List Site
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title">{site.site_id} - {site.name}</h1>
            <StatusBadge status={site.last_status} type="site_condition" />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {site.regional} &bull; {site.city} &bull; Project ID: {site.project_id || '-'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-primary"
            onClick={() => navigate(`/ts-form?siteId=${encodeURIComponent(site.site_id)}`)}
          >
            + Buat Plan TS
          </button>
          <button className="btn-secondary" onClick={() => navigate('/sites')}>
            Kembali
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          <button
            type="button"
            className={tab === 'info' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab('info')}
          >
            Informasi Site & Perangkat
          </button>
          <button
            type="button"
            className={tab === 'ts' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab('ts')}
          >
            Riwayat Troubleshoot ({summary?.history_total || 0})
          </button>
          <button
            type="button"
            className={tab === 'status_logs' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab('status_logs')}
          >
            Log Kondisi & Degraded ({statusLogs.length})
          </button>
          <button
            type="button"
            className={tab === 'cctv' ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab('cctv')}
          >
            Akun CCTV ({cctvAccounts.length})
          </button>
        </div>

        {/* Tab 1: Info Master Site */}
        {tab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Data Utama Site</h3>
              <table style={{ fontSize: 13 }}>
                <tbody>
                  <tr><th style={{ width: 140 }}>Site ID</th><td>{site.site_id}</td></tr>
                  <tr><th>Project ID</th><td>{site.project_id || '-'}</td></tr>
                  <tr><th>Nama Site</th><td>{site.name}</td></tr>
                  <tr><th>Label Lengkap</th><td>{site.site_label || '-'}</td></tr>
                  <tr><th>Regional</th><td>{site.regional || '-'}</td></tr>
                  <tr><th>Kabupaten/Kota</th><td>{site.city || '-'}</td></tr>
                  <tr><th>Tinggi & Tipe Tower</th><td>{site.tower_type || '-'}</td></tr>
                  <tr><th>IP VPN</th><td style={{ fontFamily: 'monospace' }}>{site.ip_vpn || '-'}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Alamat & Lokasi</h3>
              <table style={{ fontSize: 13 }}>
                <tbody>
                  <tr><th style={{ width: 140 }}>Alamat</th><td>{site.address || '-'}</td></tr>
                  <tr><th>Koordinat</th><td>{site.latitude && site.longitude ? `${site.latitude}, ${site.longitude}` : '-'}</td></tr>
                  <tr>
                    <th>Google Maps</th>
                    <td>
                      {site.google_maps_url ? (
                        <a href={site.google_maps_url} target="_blank" rel="noopener noreferrer">
                          Buka di Google Maps &rarr;
                        </a>
                      ) : '-'}
                    </td>
                  </tr>
                  <tr><th>Mitra</th><td>{site.partner || '-'}</td></tr>
                  <tr><th>Milestone</th><td>{site.milestone || '-'}</td></tr>
                  <tr><th>No IoT</th><td>{site.iot_number || '-'}</td></tr>
                  <tr><th>Branch</th><td>{site.branch || '-'}</td></tr>
                  <tr><th>Tim Implementasi</th><td>{site.implementation_team || '-'}</td></tr>
                  <tr><th>Team Leader</th><td>{site.team_leader || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Riwayat TS */}
        {tab === 'ts' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 15 }}>Riwayat Troubleshoot Site {site.site_id}</h3>
              <Link to={`/ts-form?siteId=${encodeURIComponent(site.site_id)}`} className="btn-primary btn-sm">
                + Tambah Plan TS
              </Link>
            </div>

            {summary?.recent_history?.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Belum ada data riwayat troubleshoot.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tanggal Aktual</th>
                    <th>Status Hasil</th>
                    <th>Status VPN</th>
                    <th>Keterangan / Tindakan</th>
                    <th>Catatan Hasil</th>
                    <th>PIC</th>
                    <th>Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recent_history.map((t) => (
                    <tr key={t.id}>
                      <td>{t.actual_date || t.plan_date || '-'}</td>
                      <td><StatusBadge status={t.status} type="ts" /></td>
                      <td><StatusBadge status={t.vpn_status} type="vpn" /></td>
                      <td>{t.description || t.problem || '-'}</td>
                      <td>{t.result_note || '-'}</td>
                      <td>{t.pic1 || '-'}</td>
                      <td><span className="badge badge-muted">{t.source === 'IMPORT' ? 'Import Excel' : 'Input'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Log Status & Degraded */}
        {tab === 'status_logs' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 15 }}>Log Kondisi & Riwayat Degraded</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Data dari sheet REPORT SITE, DEGREED, dan input manual
                </p>
              </div>
              <button className="btn-secondary btn-sm" onClick={() => setShowStatusModal(true)}>
                + Catat Kondisi Site
              </button>
            </div>

            {statusLogs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Belum ada catatan log status untuk site ini.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Waktu / Tanggal</th>
                    <th>Kondisi Site</th>
                    <th>Status VPN</th>
                    <th>Respon</th>
                    <th>Keterangan / Reason</th>
                    <th>PIC</th>
                    <th>Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {statusLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.date ? new Date(log.date).toLocaleDateString('id-ID') : '-'}</td>
                      <td><StatusBadge status={log.status} type="site_condition" /></td>
                      <td><StatusBadge status={log.vpn_status} type="vpn" /></td>
                      <td><StatusBadge status={log.response} type="response" /></td>
                      <td>{log.reason || log.note || '-'}</td>
                      <td>{log.pic || '-'}</td>
                      <td><span className="badge badge-muted">{log.source}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Akun CCTV */}
        {tab === 'cctv' && (
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Daftar Akun CCTV Terkait</h3>
            {cctvAccounts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Tidak ada data akun CCTV terdaftar.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Nama CCTV</th>
                    <th>Akun (Email)</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {cctvAccounts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.cctv_name || '-'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{c.account_email || '-'}</td>
                      <td>{c.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Tambah Status Log */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div className="card" style={{ width: 440 }}>
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>Catat Kondisi Site Baru</h3>
            <form onSubmit={handleAddStatusLog}>
              <div className="form-group">
                <label className="form-label">Kondisi Site</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ width: '100%' }}>
                  <option value="ONLINE">Online</option>
                  <option value="DEGRADED">Degraded</option>
                  <option value="OFFLINE">Offline</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Keterangan / Alasan (Reason)</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Contoh: CCTV no signal, power PLN padam..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">PIC Pelapor</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Nama / Kontak pelapor"
                  value={newPic}
                  onChange={(e) => setNewPic(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowStatusModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

