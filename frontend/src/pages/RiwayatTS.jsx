import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

export function RiwayatTS() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSite = searchParams.get('site') || '';

  const [troubleshoots, setTroubleshoots] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);

  // Filters State
  const [search, setSearch] = useState(initialSite);
  const [searchInput, setSearchInput] = useState(initialSite);
  const [regional, setRegional] = useState('');
  const [statusFilter, setStatusFilter] = useState('FINISHED'); // default: FINISHED (DONE & TROUBLE)
  const [deviceFilter, setDeviceFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [options, setOptions] = useState({ regionals: [] });
  const [loading, setLoading] = useState(true);

  // Edit Modal
  const [editingTs, setEditingTs] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState('DONE');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const optRes = await api.getSiteOptions();
      setOptions(optRes || { regionals: [] });

      const queryParams = {
        page,
        status: statusFilter === 'ALL' ? '' : statusFilter,
      };

      if (search.trim()) {
        queryParams.search = search.trim();
      }
      if (regional) {
        queryParams.regional = regional;
      }
      if (deviceFilter) {
        queryParams.device = deviceFilter;
      }
      if (dateFrom) {
        queryParams.date_from = dateFrom;
      }
      if (dateTo) {
        queryParams.date_to = dateTo;
      }

      const res = await api.getTroubleshoots(queryParams);
      setTroubleshoots(res.results || []);
      setCount(res.count || 0);
    } catch (err) {
      console.error('Gagal memuat riwayat troubleshoot:', err);
      setTroubleshoots([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, regional, statusFilter, deviceFilter, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleResetFilter = () => {
    setSearch('');
    setSearchInput('');
    setRegional('');
    setStatusFilter('FINISHED');
    setDeviceFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setSearchParams({});
  };

  const handleDelete = async (id, siteCode) => {
    if (window.confirm(`Yakin ingin menghapus permanen riwayat TS untuk site ${siteCode}?`)) {
      try {
        await api.deleteTroubleshoot(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleOpenEdit = (ts) => {
    setEditingTs(ts);
    setEditDesc(ts.description || ts.problem || '');
    setEditNote(ts.result_note || '');
    setEditStatus(ts.status);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await api.updateTroubleshoot(editingTs.id, {
        description: editDesc,
        result_note: editNote,
        status: editStatus,
      });
      setEditingTs(null);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // URL Export Excel yang dinamis mengikuti filter aktif
  const getExportUrl = () => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    if (regional) params.set('regional', regional);
    if (deviceFilter) params.set('device', deviceFilter);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return `/api/export/troubleshoots.xlsx?${params.toString()}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman Riwayat Troubleshoot</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Tabel riwayat penanganan troubleshoot seluruh site (data Excel awal & data terbaru)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={getExportUrl()}
            className="btn-secondary"
            download
            title="Download Excel sesuai filter aktif"
          >
            Export Excel
          </a>
          <Link to="/ts-form" className="btn-primary">
            + Tambah Plan TS
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* Filter Bar Lengkap */}
        <div className="filter-bar" style={{ gap: 10, marginBottom: 16 }}>
          {/* Form Pencarian Bebas */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: '1 1 260px', minWidth: 240 }}>
            <input
              type="text"
              placeholder="Cari Site ID, Nama Site, PIC, atau Keterangan..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary">
              Cari
            </button>
          </form>

          {/* Filter Regional */}
          <select
            value={regional}
            onChange={(e) => {
              setRegional(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Regional</option>
            {options.regionals?.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {/* Filter Status Hasil */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="FINISHED">Hasil: Selesai & Masih Trouble</option>
            <option value="DONE">Hasil: Selesai (DONE)</option>
            <option value="TROUBLE">Hasil: Masih Trouble</option>
            <option value="ALL">Semua Status (Termasuk Ongoing)</option>
          </select>

          {/* Filter Perangkat */}
          <select
            value={deviceFilter}
            onChange={(e) => {
              setDeviceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua Perangkat</option>
            <option value="CCTV1">CCTV 1</option>
            <option value="CCTV2">CCTV 2</option>
            <option value="BLACKBOX">Blackbox</option>
            <option value="VPN">VPN</option>
            <option value="ROTARY">Rotary</option>
            <option value="SPEAKER">Speaker</option>
            <option value="RUT">RUT</option>
          </select>

          {/* Filter Rentang Tanggal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              title="Dari tanggal"
              style={{ fontSize: 12.5, padding: '7px 8px' }}
            />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              title="Sampai tanggal"
              style={{ fontSize: 12.5, padding: '7px 8px' }}
            />
          </div>

          {/* Tombol Reset Filter jika ada filter aktif */}
          {(search || regional || statusFilter !== 'FINISHED' || deviceFilter || dateFrom || dateTo) && (
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleResetFilter}
              style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Tabel Riwayat Site Tunggal */}
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Tgl Aktual TS</th>
                <th>Site ID</th>
                <th>Nama Site</th>
                <th>Regional</th>
                <th>Status VPN</th>
                <th>Respon</th>
                <th>Perangkat</th>
                <th>Keterangan Tindakan</th>
                <th>Status Hasil</th>
                <th>Catatan Hasil</th>
                <th>PIC Kunjungan</th>
                <th>Sumber</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                    Memuat riwayat troubleshoot...
                  </td>
                </tr>
              ) : troubleshoots.length === 0 ? (
                <tr>
                  <td colSpan="13" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    Tidak ada riwayat TS yang sesuai filter.
                    <div style={{ marginTop: 8 }}>
                      <button className="btn-secondary btn-sm" onClick={handleResetFilter}>
                        Tampilkan Semua Riwayat
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                troubleshoots.map((t) => (
                  <tr key={t.id}>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {t.actual_date || t.plan_date || '-'}
                    </td>
                    <td>
                      <Link to={`/sites/${encodeURIComponent(t.site_code)}`} style={{ fontWeight: 600 }}>
                        {t.site_code}
                      </Link>
                    </td>
                    <td>{t.site_name}</td>
                    <td>{t.regional || '-'}</td>
                    <td><StatusBadge status={t.vpn_status} type="vpn" /></td>
                    <td><StatusBadge status={t.response} type="response" /></td>
                    <td>
                      {t.devices?.length > 0 ? (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {t.devices.map((d) => (
                            <span key={d} className="badge badge-muted" style={{ fontSize: 11 }}>{d}</span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 260, fontSize: 13 }}>
                      {t.description || t.problem || '-'}
                    </td>
                    <td>
                      <StatusBadge status={t.status} type="ts" />
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                      {t.result_note || '-'}
                    </td>
                    <td style={{ fontSize: 12.5 }}>
                      <div>{t.pic1 || '-'}</div>
                      {t.pic2 && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t.pic2}</div>}
                    </td>
                    <td>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>
                        {t.source === 'IMPORT' ? 'Import Excel' : 'Input'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(t)}
                          title="Edit riwayat"
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(t.id, t.site_code)}
                          title="Hapus riwayat"
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

      {/* Modal Edit Riwayat TS */}
      {editingTs && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16 }}>
                Edit Riwayat TS: <strong>{editingTs.site_code}</strong>
              </h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setEditingTs(null)}
              >
                &times; Tutup
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Status Hasil</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="DONE">Selesai (DONE)</option>
                  <option value="TROUBLE">Masih Trouble</option>
                  <option value="PLAN">Direncanakan (PLAN)</option>
                  <option value="PROGRESS">Sedang Dikerjakan</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Keterangan / Tindakan Perbaikan *</label>
                <textarea
                  rows="3"
                  style={{ width: '100%' }}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Hasil Tambahan</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Contoh: tapi BB nya error, menunggu permit..."
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingTs(null)}
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
    </div>
  );
}
