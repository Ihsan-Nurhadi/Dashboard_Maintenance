import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

export function DaftarPIC() {
  const [pics, setPics] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [regional, setRegional] = useState('');
  const [role, setRole] = useState('');
  const [options, setOptions] = useState({ roles: [], regionals: [] });
  const [loading, setLoading] = useState(true);

  // State Modal CRUD PIC (Tambah & Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingPicId, setEditingPicId] = useState(null);
  const [picForm, setPicForm] = useState({
    name: '',
    phone: '',
    role: 'FIELD_ENGINEER',
    regional: '',
    partner: '',
    notes: '',
    is_active: true,
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // State Modal Detail Aktivitas & TS PIC
  const [selectedPicActivity, setSelectedPicActivity] = useState(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [picRes, optRes] = await Promise.all([
        api.getPics({ search, regional, role, page }),
        api.getPicOptions(),
      ]);
      setPics(picRes.results || []);
      setCount(picRes.count || 0);
      setOptions(optRes || { roles: [], regionals: [] });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, regional, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  // Buka Modal Tambah PIC Baru
  const handleOpenAdd = () => {
    setEditingPicId(null);
    setPicForm({
      name: '',
      phone: '',
      role: 'FIELD_ENGINEER',
      regional: '',
      partner: '',
      notes: '',
      is_active: true,
    });
    setModalError('');
    setShowModal(true);
  };

  // Buka Modal Edit PIC
  const handleOpenEdit = (p) => {
    setEditingPicId(p.id);
    setPicForm({
      name: p.name || '',
      phone: p.phone || '',
      role: p.role || 'FIELD_ENGINEER',
      regional: p.regional || '',
      partner: p.partner || '',
      notes: p.notes || '',
      is_active: p.is_active ?? true,
    });
    setModalError('');
    setShowModal(true);
  };

  // Simpan Tambah / Edit PIC
  const handleSavePic = async (e) => {
    e.preventDefault();
    if (!picForm.name.trim()) {
      setModalError('Nama lengkap PIC wajib diisi.');
      return;
    }
    setModalSubmitting(true);
    setModalError('');
    try {
      if (editingPicId) {
        await api.updatePic(editingPicId, picForm);
      } else {
        await api.createPic(picForm);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      setModalError(err.message || 'Gagal menyimpan data PIC.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Hapus PIC
  const handleDeletePic = async (id, name) => {
    if (window.confirm(`Yakin ingin menghapus data PIC "${name}"?`)) {
      try {
        await api.deletePic(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Buka Detail Aktivitas & TS PIC
  const handleViewActivity = async (p) => {
    setLoadingActivity(true);
    try {
      const data = await api.getPicActivities(p.id);
      setSelectedPicActivity(data);
    } catch (err) {
      alert(err.message || 'Gagal memuat aktivitas PIC.');
    } finally {
      setLoadingActivity(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman Daftar PIC (Person In Charge)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Data personil teknisi visit site, pemantauan TS ongoing yang sedang ditangani, dan arsip riwayat visit
          </p>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd}>
          + Tambah PIC Baru
        </button>
      </div>

      <div className="page-body">
        {/* Filter Bar */}
        <div className="filter-bar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Cari Nama PIC, Nomor Telepon, atau Catatan..."
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
            {options.regionals?.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Semua Peran / Posisi</option>
            {options.roles?.map((ro) => (
              <option key={ro.value} value={ro.value}>{ro.label}</option>
            ))}
          </select>
        </div>

        {/* Tabel Daftar PIC */}
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Nama PIC</th>
                <th>Kontak / HP</th>
                <th>Posisi / Peran</th>
                <th>Regional</th>
                <th style={{ textAlign: 'center' }}>TS Ongoing</th>
                <th style={{ textAlign: 'center' }}>Total Riwayat TS</th>
                <th style={{ textAlign: 'center' }}>Site Assigned</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Memuat data PIC...
                  </td>
                </tr>
              ) : pics.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Tidak ada data PIC yang sesuai filter. Klik <strong>+ Tambah PIC Baru</strong> untuk menambah.
                  </td>
                </tr>
              ) : (
                pics.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.name}</div>
                      {p.partner && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Mitra: {p.partner}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {p.phone ? (
                        <a href={`tel:${p.phone}`} style={{ textDecoration: 'none' }}>
                          {p.phone}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <span className="badge badge-muted">{p.role_display}</span>
                    </td>
                    <td>{p.regional || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {p.ongoing_count > 0 ? (
                        <span
                          className="badge badge-progress"
                          style={{ cursor: 'pointer', padding: '3px 8px' }}
                          onClick={() => handleViewActivity(p)}
                          title="Klik untuk melihat TS ongoing"
                        >
                          {p.ongoing_count} Ongoing
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>0</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {p.history_count > 0 ? (
                        <span
                          className="badge badge-done"
                          style={{ cursor: 'pointer', padding: '3px 8px' }}
                          onClick={() => handleViewActivity(p)}
                          title="Klik untuk melihat riwayat TS"
                        >
                          {p.history_count} TS Selesai
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>0</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 13 }}>{p.assigned_sites_count} Site</span>
                    </td>
                    <td>
                      {p.is_active ? (
                        <span className="badge badge-done" style={{ fontSize: 11 }}>Aktif</span>
                      ) : (
                        <span className="badge badge-trouble" style={{ fontSize: 11 }}>Non-Aktif</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleViewActivity(p)}
                          title="Lihat TS ongoing dan riwayat visit"
                        >
                          Lihat Aktivitas
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit profil PIC"
                        >
                          Edit
                        </button>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDeletePic(p.id, p.name)}
                          title="Hapus PIC"
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

      {/* Modal CRUD Tambah / Edit PIC */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16 }}>
                {editingPicId ? 'Edit Data PIC' : 'Tambah PIC Baru'}
              </h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setShowModal(false)}
              >
                &times; Tutup
              </button>
            </div>

            {modalError && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--st-trouble-bg)',
                color: 'var(--st-trouble-text)',
                borderRadius: 4,
                marginBottom: 14,
                fontSize: 13
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSavePic}>
              <div className="form-group">
                <label className="form-label">Nama Lengkap PIC *</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Contoh: Panly Surya, Fauzan Akbar..."
                  value={picForm.name}
                  onChange={(e) => setPicForm({ ...picForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nomor HP / WhatsApp</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: 0812-3456-7890"
                    value={picForm.phone}
                    onChange={(e) => setPicForm({ ...picForm, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Posisi / Peran *</label>
                  <select
                    style={{ width: '100%' }}
                    value={picForm.role}
                    onChange={(e) => setPicForm({ ...picForm, role: e.target.value })}
                  >
                    <option value="FIELD_ENGINEER">Teknisi Lapangan / Tim Implementasi</option>
                    <option value="TEAM_LEADER">Team Leader</option>
                    <option value="COORDINATOR">Koordinator Regional</option>
                    <option value="NOC">NOC / Support</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Regional Penugasan</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: JABODETABEK, SUMBAGUT..."
                    value={picForm.regional}
                    onChange={(e) => setPicForm({ ...picForm, regional: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mitra Perusahaan</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: TSEL, Komitel, PST..."
                    value={picForm.partner}
                    onChange={(e) => setPicForm({ ...picForm, partner: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan</label>
                <textarea
                  rows="2"
                  style={{ width: '100%' }}
                  placeholder="Keterangan spesialisasi / info kontak cadangan..."
                  value={picForm.notes}
                  onChange={(e) => setPicForm({ ...picForm, notes: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={picForm.is_active}
                    onChange={(e) => setPicForm({ ...picForm, is_active: e.target.checked })}
                  />
                  <span>Status Aktif (dapat ditugaskan visit site)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan PIC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Aktivitas: TS Ongoing & Riwayat TS PIC */}
      {selectedPicActivity && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
          padding: 20,
          overflowY: 'auto',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 840, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 18, color: 'var(--text-main)' }}>
                  Aktivitas Troubleshoot: <strong>{selectedPicActivity.name}</strong>
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                  {selectedPicActivity.role_display} &bull; Regional: {selectedPicActivity.regional || '-'} &bull; Telp: {selectedPicActivity.phone || '-'}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setSelectedPicActivity(null)}
              >
                &times; Tutup
              </button>
            </div>

            {/* Bagian 1: Ongoing TS yang sedang ditangani */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 14.5, color: 'var(--primary)', fontWeight: 700 }}>
                  1. TS Ongoing yang Sedang Ditangani ({selectedPicActivity.ongoing_troubleshoots?.length || 0})
                </h4>
              </div>

              {selectedPicActivity.ongoing_troubleshoots?.length === 0 ? (
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-app)', borderRadius: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  Saat ini tidak ada TS ongoing aktif yang sedang dipegang oleh PIC ini.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Site ID</th>
                        <th>Nama Site</th>
                        <th>Regional</th>
                        <th>Plan Kunjungan</th>
                        <th>Status</th>
                        <th>Keterangan Masalah</th>
                        <th style={{ textAlign: 'right' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPicActivity.ongoing_troubleshoots.map((ts) => (
                        <tr key={ts.id}>
                          <td>
                            <Link to={`/sites/${encodeURIComponent(ts.site_code)}`} style={{ fontWeight: 600 }}>
                              {ts.site_code}
                            </Link>
                          </td>
                          <td>{ts.site_name}</td>
                          <td>{ts.regional}</td>
                          <td>{ts.plan_date || '-'}</td>
                          <td><StatusBadge status={ts.status} type="ts" /></td>
                          <td style={{ fontSize: 12.5, maxWidth: 200 }}>{ts.problem || ts.description || '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => {
                                setSelectedPicActivity(null);
                                navigate(`/report-after-ts?tsId=${ts.id}`);
                              }}
                            >
                              Report
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bagian 2: Riwayat Troubleshoot yang Pernah Dikerjakan */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ fontSize: 14.5, color: 'var(--text-main)', fontWeight: 700 }}>
                  2. Riwayat Troubleshoot yang Pernah Ditangani ({selectedPicActivity.history_count || 0} Total)
                </h4>
              </div>

              {selectedPicActivity.recent_history_troubleshoots?.length === 0 ? (
                <div style={{ padding: '12px 14px', backgroundColor: 'var(--bg-app)', borderRadius: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  Belum ada riwayat TS yang tercatat untuk PIC ini.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Tanggal Aktual</th>
                        <th>Site ID</th>
                        <th>Nama Site</th>
                        <th>Status Hasil</th>
                        <th>Tindakan / Keterangan</th>
                        <th>Catatan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPicActivity.recent_history_troubleshoots.map((hist) => (
                        <tr key={hist.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{hist.actual_date || hist.plan_date || '-'}</td>
                          <td>
                            <Link to={`/sites/${encodeURIComponent(hist.site_code)}`} style={{ fontWeight: 600 }}>
                              {hist.site_code}
                            </Link>
                          </td>
                          <td>{hist.site_name}</td>
                          <td><StatusBadge status={hist.status} type="ts" /></td>
                          <td style={{ fontSize: 12.5, maxWidth: 220 }}>{hist.description || hist.problem || '-'}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{hist.result_note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bagian 3: Daftar Site Master yang Ditugaskan */}
            {selectedPicActivity.assigned_sites?.length > 0 && (
              <div>
                <h4 style={{ fontSize: 14.5, color: 'var(--text-main)', fontWeight: 700, marginBottom: 10 }}>
                  3. Site Master Assigned ({selectedPicActivity.assigned_sites_count} Site)
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedPicActivity.assigned_sites.map((st) => (
                    <Link
                      key={st.site_id}
                      to={`/sites/${encodeURIComponent(st.site_id)}`}
                      className="badge badge-muted"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                    >
                      {st.site_id} - {st.name} ({st.regional})
                    </Link>
                  ))}
                  {selectedPicActivity.assigned_sites_count > 20 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
                      dan {selectedPicActivity.assigned_sites_count - 20} site lainnya...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

