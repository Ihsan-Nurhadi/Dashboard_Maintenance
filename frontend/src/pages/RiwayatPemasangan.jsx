import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Pagination } from '../components/Pagination';

const DEVICE_LIST = [
  { id: 'CCTV1', label: 'CCTV 1' },
  { id: 'CCTV2', label: 'CCTV 2' },
  { id: 'BLACKBOX', label: 'Blackbox' },
  { id: 'VPN', label: 'VPN' },
  { id: 'ROTARY', label: 'Rotary' },
  { id: 'SPEAKER', label: 'Speaker' },
  { id: 'RUT', label: 'RUT' },
];

export function RiwayatPemasangan() {
  const [installations, setInstallations] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Form Tambah Site Baru + Pemasangan
  const [showAddModal, setShowAddModal] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [name, setName] = useState('');
  const [regional, setRegional] = useState('JABODETABEK');
  const [city, setCity] = useState('');
  const [towerType, setTowerType] = useState('SST');
  const [ipVpn, setIpVpn] = useState('');
  const [address, setAddress] = useState('');
  const [installDate, setInstallDate] = useState(new Date().toISOString().split('T')[0]);
  const [team, setTeam] = useState('');
  const [partner, setPartner] = useState('TSEL');
  const [selectedDevices, setSelectedDevices] = useState(['CCTV1', 'CCTV2', 'BLACKBOX', 'VPN', 'RUT']);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getInstallations({ search, page });
      setInstallations(res.results || []);
      setCount(res.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDeviceToggle = (devId) => {
    setSelectedDevices((prev) =>
      prev.includes(devId) ? prev.filter((d) => d !== devId) : [...prev, devId]
    );
  };

  const handleCreateNewSite = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.createInstallation({
        site: {
          site_id: siteId.trim(),
          project_id: projectId.trim(),
          name: name.trim(),
          regional: regional.trim().toUpperCase(),
          city: city.trim(),
          tower_type: towerType.trim(),
          ip_vpn: ipVpn.trim(),
          address: address.trim(),
          partner: partner.trim(),
          implementation_team: team.trim(),
        },
        install_date: installDate,
        team: team.trim(),
        partner: partner.trim(),
        ip_vpn: ipVpn.trim(),
        devices: selectedDevices,
        note: note.trim(),
      });

      setShowAddModal(false);
      // Reset form
      setSiteId('');
      setProjectId('');
      setName('');
      setCity('');
      setIpVpn('');
      setAddress('');
      setNote('');
      loadData();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan data pemasangan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, sCode) => {
    if (window.confirm(`Hapus catatan pemasangan untuk site ${sCode}? (Data site di List Site tetap disimpan).`)) {
      try {
        await api.deleteInstallation(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman Riwayat Pemasangan</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Pencatatan riwayat instalasi & pemasangan perangkat untuk site baru (di luar 1.008 site awal)
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Form Add Site & Pemasangan
        </button>
      </div>

      <div className="page-body">
        {/* Filter bar */}
        <div className="filter-bar">
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Cari Site ID, Nama Site, atau Tim..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-secondary">
              Cari
            </button>
          </form>
        </div>

        {/* Tabel Riwayat Pemasangan */}
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Tanggal Pemasangan</th>
                <th>Site ID</th>
                <th>Nama Site</th>
                <th>Regional</th>
                <th>Mitra</th>
                <th>Tim Pelaksana</th>
                <th>IP VPN</th>
                <th>Perangkat Terpasang</th>
                <th>Catatan</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Memuat data pemasangan...
                  </td>
                </tr>
              ) : installations.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                    Belum ada data pemasangan site baru. Klik <strong>+ Form Add Site & Pemasangan</strong> untuk menambah site baru.
                  </td>
                </tr>
              ) : (
                installations.map((inst) => (
                  <tr key={inst.id}>
                    <td>{inst.install_date}</td>
                    <td>
                      <Link to={`/sites/${encodeURIComponent(inst.site_code)}`} style={{ fontWeight: 600 }}>
                        {inst.site_code}
                      </Link>
                    </td>
                    <td>{inst.site_name}</td>
                    <td>{inst.regional}</td>
                    <td>{inst.partner || '-'}</td>
                    <td>{inst.team || '-'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{inst.ip_vpn || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {inst.devices?.map((d) => (
                          <span key={d} className="badge badge-done" style={{ fontSize: 11 }}>{d}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{inst.note || '-'}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Link
                          to={`/sites/${encodeURIComponent(inst.site_code)}`}
                          className="btn-secondary btn-sm"
                        >
                          Detail
                        </Link>
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleDelete(inst.id, inst.site_code)}
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

      {/* Modal Tambah Site Baru + Pemasangan */}
      {showAddModal && (
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
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>
              Form Add Site Baru & Riwayat Pemasangan
            </h3>

            {error && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--st-trouble-bg)',
                color: 'var(--st-trouble-text)',
                borderRadius: 4,
                marginBottom: 14,
                fontSize: 13
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleCreateNewSite}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Site ID *</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: NEW-01-001"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Project ID</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: 26TS..."
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nama Site *</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Nama Site"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Regional *</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: JABODETABEK, SUMBAGUT"
                    value={regional}
                    onChange={(e) => setRegional(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kabupaten / Kota</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Kab / Kota"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tinggi & Tipe Tower</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="Contoh: SST 42, Monopole"
                    value={towerType}
                    onChange={(e) => setTowerType(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">IP VPN</label>
                  <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder="10.10.x.x"
                    value={ipVpn}
                    onChange={(e) => setIpVpn(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Lengkap</label>
                <textarea
                  rows="2"
                  style={{ width: '100%' }}
                  placeholder="Alamat lokasi tower site"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <hr style={{ margin: '14px 0', borderColor: 'var(--border)' }} />
              <h4 style={{ fontSize: 14, marginBottom: 10 }}>Detail Riwayat Pemasangan</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tanggal Pemasangan *</label>
                  <input
                    type="date"
                    style={{ width: '100%' }}
                    value={installDate}
                    onChange={(e) => setInstallDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mitra</label>
                  <select value={partner} onChange={(e) => setPartner(e.target.value)} style={{ width: '100%' }}>
                    <option value="TSEL">TSEL</option>
                    <option value="PST">PST</option>
                    <option value="Komitel">Komitel</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tim Implementasi</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Nama Tim / Nomor HP"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Centang Perangkat yang Terpasang:</label>
                <div className="checkbox-group">
                  {DEVICE_LIST.map((dev) => (
                    <label key={dev.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(dev.id)}
                        onChange={() => handleDeviceToggle(dev.id)}
                      />
                      <span>{dev.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Catatan Tambahan Pemasangan</label>
                <input
                  type="text"
                  style={{ width: '100%' }}
                  placeholder="Catatan kendala / info saat pemasangan"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Site & Pemasangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

