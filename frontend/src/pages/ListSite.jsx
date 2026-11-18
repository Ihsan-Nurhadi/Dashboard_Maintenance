import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

export function ListSite() {
  const [sites, setSites] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [regional, setRegional] = useState('');
  const [partner, setPartner] = useState('');
  const [condition, setCondition] = useState('');
  const [options, setOptions] = useState({ regionals: [], partners: [] });
  const [loading, setLoading] = useState(true);

  // State Edit Site
  const [editingSite, setEditingSite] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    project_id: '',
    regional: '',
    city: '',
    ip_vpn: '',
    tower_type: '',
    partner: '',
    address: '',
    maps_url: '',
    implementation_team: '',
    team_leader: '',
    iot_number: '',
    branch: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // State Import Excel
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(null);

  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportError('');
    setImportSuccess(null);
    setShowImportModal(true);
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    if (importSuccess) {
      loadData();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setImportError('File harus berformat Excel (.xlsx atau .xls).');
        setImportFile(null);
        return;
      }
      setImportError('');
      setImportFile(file);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Silakan pilih file Excel terlebih dahulu.');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportSuccess(null);
    try {
      const res = await api.importSites(importFile);
      setImportSuccess(res);
      loadData();
    } catch (err) {
      setImportError(err.message || 'Gagal mengimpor file Excel.');
    } finally {
      setImportLoading(false);
    }
  };

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [siteRes, optRes] = await Promise.all([
        api.getSites({
          search,
          regional,
          partner,
          condition,
          page,
        }),
        api.getSiteOptions(),
      ]);
      setSites(siteRes.results || []);
      setCount(siteRes.count || 0);
      setOptions(optRes || { regionals: [], partners: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, regional, partner, condition]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDelete = async (siteId, siteName) => {
    if (window.confirm(`Yakin ingin mengarsipkan site ${siteId} (${siteName})? Riwayat TS site tetap tersimpan.`)) {
      try {
        await api.deleteSite(siteId);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleOpenEdit = (site) => {
    setEditingSite(site);
    setEditError('');
    setEditForm({
      name: site.name || '',
      project_id: site.project_id || '',
      regional: site.regional || '',
      city: site.city || '',
      ip_vpn: site.ip_vpn || '',
      tower_type: site.tower_type || '',
      partner: site.partner || '',
      address: site.address || '',
      maps_url: site.maps_url || '',
      implementation_team: site.implementation_team || '',
      team_leader: site.team_leader || '',
      iot_number: site.iot_number || '',
      branch: site.branch || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingSite) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      await api.updateSite(editingSite.site_id, editForm);
      setEditingSite(null);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Gagal menyimpan perubahan site.');
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman List Site</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Master data site DMT (1.008 site awal + site baru)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleOpenImportModal}
            title="Import Site dari File Excel"
          >
            Import Excel
          </button>
          <a
            href="/api/export/sites.xlsx"
            className="btn-secondary"
            download
          >
            Export Excel
          </a>
          <Link to="/riwayat-pemasangan" className="btn-primary">
            + Form Add Site Baru
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="filter-bar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Cari Site ID, Nama Site, Project ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary">
              Cari
            </button>
          </form>

          <select value={regional} onChange={(e) => { setRegional(e.target.value); setPage(1); }}>
            <option value="">Semua Regional</option>
            {options.regionals.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select value={partner} onChange={(e) => { setPartner(e.target.value); setPage(1); }}>
            <option value="">Semua Mitra</option>
            {options.partners.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select value={condition} onChange={(e) => { setCondition(e.target.value); setPage(1); }}>
            <option value="">Semua Kondisi</option>
            <option value="ONLINE">Online</option>
            <option value="DEGRADED">Degraded</option>
            <option value="OFFLINE">Offline</option>
          </select>
        </div>

        {/* Tabel List Site */}
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Site ID</th>
                <th>Project ID</th>
                <th>Nama Site</th>
                <th>Regional</th>
                <th>Kab/Kota</th>
                <th>IP VPN</th>
                <th>Mitra</th>
                <th>Kondisi Terakhir</th>
                <th>Jumlah TS</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Memuat daftar site...
                  </td>
                </tr>
              ) : sites.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Tidak ada site yang cocok dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                sites.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/sites/${encodeURIComponent(s.site_id)}`} style={{ fontWeight: 600 }}>
                        {s.site_id}
                      </Link>
                    </td>
                    <td>{s.project_id || '-'}</td>
                    <td>{s.name}</td>
                    <td>{s.regional || '-'}</td>
                    <td>{s.city || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.ip_vpn || '-'}</td>
                    <td>{s.partner || '-'}</td>
                    <td>
                      <StatusBadge status={s.last_status} type="site_condition" />
                    </td>
                    <td>
                      <Link to={`/riwayat-ts?site=${encodeURIComponent(s.site_id)}`}>
                        {s.ts_count} TS
                      </Link>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => navigate(`/ts-form?siteId=${encodeURIComponent(s.site_id)}`)}
                          title="Buat Plan TS"
                        >
                          + Plan
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(s)}
                          title="Edit data site"
                        >
                          Edit
                        </button>
                        <Link
                          to={`/sites/${encodeURIComponent(s.site_id)}`}
                          className="btn-secondary btn-sm"
                        >
                          Detail
                        </Link>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(s.site_id, s.name)}
                          title="Arsipkan site"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          count={count}
          pageSize={25}
          currentPage={page}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modal Edit Master Site */}
      {editingSite && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          padding: 20,
          overflowY: 'auto',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>
                Edit Data Site: <strong>{editingSite.site_id}</strong>
              </h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setEditingSite(null)}
              >
                &times; Tutup
              </button>
            </div>

            {editError && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--st-trouble-bg)',
                color: 'var(--st-trouble-text)',
                borderRadius: 4,
                marginBottom: 14,
                fontSize: 13
              }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Site ID (Kunci Master)</label>
                  <input
                    type="text"
                    style={{ width: '100%', backgroundColor: '#F3F4F6' }}
                    value={editingSite.site_id}
                    disabled
                  />
                  <div className="form-hint">Site ID unik tidak dapat diubah.</div>
                </div>

                <div className="form-group">
                  <label className="form-label">Project ID</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.project_id}
                    onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Site *</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Regional</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.regional}
                    onChange={(e) => setEditForm({ ...editForm, regional: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kabupaten / Kota</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">IP VPN</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.ip_vpn}
                    onChange={(e) => setEditForm({ ...editForm, ip_vpn: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tinggi & Tipe Tower</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.tower_type}
                    onChange={(e) => setEditForm({ ...editForm, tower_type: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mitra</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.partner}
                    onChange={(e) => setEditForm({ ...editForm, partner: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Lengkap</label>
                <textarea
                  rows="2"
                  style={{ width: '100%' }}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tim Implementasi</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Nama / Nomor HP"
                    value={editForm.implementation_team}
                    onChange={(e) => setEditForm({ ...editForm, implementation_team: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nama Team Leader</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Nama / Nomor HP"
                    value={editForm.team_leader}
                    onChange={(e) => setEditForm({ ...editForm, team_leader: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingSite(null)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Import Excel Master Site */}
      {showImportModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200,
          padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>📥</span>
                <h3 style={{ fontSize: 16 }}>Import Master Site dari Excel</h3>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleCloseImportModal}
              >
                &times; Tutup
              </button>
            </div>

            {/* Kotak Petunjuk & Download Template */}
            <div className="info-box" style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
              <div>
                <strong>Petunjuk Format Excel:</strong>
                <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
                  Unggah file Excel (<strong>.xlsx</strong>) yang memuat kolom <code>SITE ID</code> (wajib), <code>SITE NAME</code>, <code>REGIONAL</code>, <code>KABUPATEN/KODYA</code>, <code>IP VPN</code>, <code>LAT LONG</code>, <code>ALAMAT</code>, dll.
                </p>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <a
                    href="/api/sites/template/"
                    download="template_import_site.xlsx"
                    className="btn-secondary btn-sm"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>📑</span> Unduh Template Excel (+ Contoh Data Dummy)
                  </a>
                </div>
              </div>
            </div>

            {importError && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'var(--st-trouble-bg)',
                color: 'var(--st-trouble-text)',
                borderRadius: 6,
                marginBottom: 14,
                fontSize: 13,
                border: '1px solid var(--st-trouble-border)',
              }}>
                ⚠️ {importError}
              </div>
            )}

            {importSuccess && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'var(--st-done-bg)',
                color: 'var(--st-done-text)',
                borderRadius: 6,
                marginBottom: 14,
                fontSize: 13,
                border: '1px solid var(--st-done-border)',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  ✅ {importSuccess.message}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  • Site baru ditambahkan: <strong>{importSuccess.created_count}</strong><br />
                  • Site diperbarui: <strong>{importSuccess.updated_count}</strong><br />
                  {importSuccess.sample && importSuccess.sample.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      Contoh: {importSuccess.sample.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!importSuccess ? (
              <form onSubmit={handleImportSubmit}>
                <div className="form-group">
                  <label className="form-label">Pilih File Excel (.xlsx)</label>
                  <div
                    style={{
                      border: '2px dashed var(--border)',
                      borderRadius: 8,
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: 'var(--bg-subtle)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                    onClick={() => document.getElementById('site-excel-file-input').click()}
                  >
                    <input
                      id="site-excel-file-input"
                      type="file"
                      accept=".xlsx, .xls"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                    {importFile ? (
                      <div>
                        <strong style={{ color: 'var(--primary)' }}>{importFile.name}</strong>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Ukuran: {(importFile.size / 1024).toFixed(1)} KB (Klik untuk ganti file)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          Klik untuk memilih file Excel dari komputer Anda
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          Format didukung: .xlsx atau .xls
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCloseImportModal}
                    disabled={importLoading}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={importLoading || !importFile}
                  >
                    {importLoading ? 'Sedang Memproses...' : 'Mulai Import'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleCloseImportModal}
                >
                  Selesai & Lihat List Site
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

