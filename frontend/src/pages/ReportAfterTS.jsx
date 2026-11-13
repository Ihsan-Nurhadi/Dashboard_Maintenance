import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const DEVICE_LIST = [
  { id: 'CCTV1', label: 'CCTV 1' },
  { id: 'CCTV2', label: 'CCTV 2' },
  { id: 'BLACKBOX', label: 'Blackbox' },
  { id: 'VPN', label: 'VPN' },
  { id: 'ROTARY', label: 'Rotary' },
  { id: 'SPEAKER', label: 'Speaker' },
  { id: 'RUT', label: 'RUT' },
];

export function ReportAfterTS() {
  const [searchParams] = useSearchParams();
  const selectedTsId = searchParams.get('tsId');

  const [ongoingList, setOngoingList] = useState([]);
  const [currentTsId, setCurrentTsId] = useState(selectedTsId || '');
  const [selectedTs, setSelectedTs] = useState(null);

  // Form states
  const [planDate, setPlanDate] = useState('');
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState('DONE'); // 'DONE' | 'TROUBLE'
  const [resultNote, setResultNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // Load TS yang sedang berjalan untuk dropdown pilihan
  useEffect(() => {
    const fetchOngoing = async () => {
      try {
        const res = await api.getTroubleshoots({ status: 'ONGOING', page_size: 100 });
        setOngoingList(res.results || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchOngoing();
  }, []);

  // Saat ID TS berubah, ambil detailnya
  useEffect(() => {
    if (!currentTsId) {
      setSelectedTs(null);
      return;
    }
    const fetchDetail = async () => {
      try {
        const data = await api.getTroubleshoot(currentTsId);
        setSelectedTs(data);
        setPlanDate(data.plan_date || '');
        if (data.actual_date) setActualDate(data.actual_date);
        if (data.devices) setSelectedDevices(data.devices);
        if (data.description) setDescription(data.description);
        if (data.result_note) setResultNote(data.result_note);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetail();
  }, [currentTsId]);

  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId) ? prev.filter((d) => d !== deviceId) : [...prev, deviceId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentTsId) {
      setError('Silakan pilih TS yang akan dilaporkan.');
      return;
    }
    if (!actualDate) {
      setError('Tanggal aktual pelaksanaan TS wajib diisi.');
      return;
    }
    if (!description.trim()) {
      setError('Keterangan hasil tindakan wajib diisi.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await api.submitReport(currentTsId, {
        plan_date: planDate || null,
        actual_date: actualDate,
        devices: selectedDevices,
        description,
        result,
        result_note: resultNote,
      });

      // Jika masih trouble dan user butuh plan lanjutan, tawarkan buka form TS
      if (result === 'TROUBLE' && selectedTs?.site_code) {
        if (window.confirm('TS berstatus Masih Trouble. Apakah ingin membuat Plan TS lanjutan untuk site ini sekarang?')) {
          navigate(`/ts-form?siteId=${encodeURIComponent(selectedTs.site_code)}`);
          return;
        }
      }

      navigate('/riwayat-ts');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman Report After TS</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Input laporan hasil kunjungan troubleshoot, checklist perangkat, dan status penyelesaian
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
          Kembali
        </button>
      </div>

      <div className="page-body" style={{ maxWidth: 840 }}>
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
          {/* Pilihan TS Ongoing */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>1. Pilih Troubleshoot Yang Dilaporkan</h3>
            <div className="form-group">
              <label className="form-label">Daftar TS Ongoing *</label>
              <select
                style={{ width: '100%' }}
                value={currentTsId}
                onChange={(e) => setCurrentTsId(e.target.value)}
                required
              >
                <option value="">-- Pilih TS yang sedang berjalan --</option>
                {ongoingList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.site_code} - {t.site_name} (Plan: {t.plan_date || 'Belum diatur'})
                  </option>
                ))}
              </select>
            </div>

            {selectedTs && (
              <div className="info-box" style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 10,
              }}>
                <div><strong>Site:</strong> {selectedTs.site_code} - {selectedTs.site_name}</div>
                <div><strong>Regional:</strong> {selectedTs.regional} / {selectedTs.city}</div>
                <div><strong>PIC:</strong> {selectedTs.pic1 || '-'}</div>
                <div><strong>Kendala Awal:</strong> {selectedTs.problem || '-'}</div>
              </div>
            )}
          </div>

          {/* Form Pelaksanaan & Centang Perangkat */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>2. Pelaksanaan & Checklist Perangkat</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Menu Plan TS (Tanggal)</label>
                <input
                  type="date"
                  style={{ width: '100%' }}
                  value={planDate}
                  onChange={(e) => setPlanDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Menu Actual TS (Tanggal Pelaksanaan) *</label>
                <input
                  type="date"
                  style={{ width: '100%' }}
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Checklist Perangkat Sesuai Diagram */}
            <div className="form-group" style={{ marginTop: 8 }}>
              <label className="form-label">
                Centang Box Perangkat yang Diperiksa / Ditangani:
              </label>
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
              <div className="form-hint">
                Pilih perangkat yang bermasalah, diganti komponennya, atau telah diperiksa saat di lapangan.
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Tambah Keterangan / Tindakan Perbaikan *</label>
              <textarea
                rows="4"
                style={{ width: '100%' }}
                placeholder="Deskripsikan tindakan yang telah dilakukan (contoh: MCB ngetrip dinaikkan kembali, adaptor blackbox diganti, router diganti, kabel cctv disambung)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Hasil Troubleshoot */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>3. Hasil Akhir Troubleshoot</h3>

            <div className="form-group">
              <label className="form-label">Hasil Kunjungan *</label>
              <div style={{ display: 'flex', gap: 24, marginTop: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="result"
                    value="DONE"
                    checked={result === 'DONE'}
                    onChange={(e) => setResult(e.target.value)}
                  />
                  <strong style={{ color: 'var(--st-done-text)' }}>Selesai (DONE)</strong>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="result"
                    value="TROUBLE"
                    checked={result === 'TROUBLE'}
                    onChange={(e) => setResult(e.target.value)}
                  />
                  <strong style={{ color: 'var(--st-trouble-text)' }}>Masih Trouble</strong>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Hasil Tambahan (Opsional)</label>
              <input
                type="text"
                style={{ width: '100%' }}
                placeholder="Contoh: tapi BB nya error, tinggal sudut angle CCTV, menunggu izin permit..."
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
                Batal
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !currentTsId}
              >
                {submitting ? 'Menyimpan Report...' : 'Simpan Report & Masukkan ke Riwayat'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

