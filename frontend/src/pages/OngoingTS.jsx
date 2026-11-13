import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';

export function OngoingTS() {
  const [summary, setSummary] = useState(null);
  const [troubleshoots, setTroubleshoots] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [regional, setRegional] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionals, setRegionals] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, tsRes, optRes] = await Promise.all([
        api.getSummary().catch((err) => {
          console.error('Summary error:', err);
          return null;
        }),
        api.getTroubleshoots({
          status: statusFilter || 'ONGOING',
          search,
          regional,
          page,
          ordering: 'plan',
        }).catch((err) => {
          console.error('Troubleshoot list error:', err);
          return { results: [], count: 0 };
        }),
        api.getSiteOptions().catch((err) => {
          console.error('Site options error:', err);
          return { regionals: [] };
        }),
      ]);
      if (sumRes) setSummary(sumRes);
      if (tsRes) {
        setTroubleshoots(tsRes.results || []);
        setCount(tsRes.count || 0);
      }
      if (optRes) setRegionals(optRes.regionals || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, regional, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleStart = async (id) => {
    try {
      await api.startTroubleshoot(id);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Halaman Ongoing Troubleshoot</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Daftar penanganan TS yang sedang direncanakan dan berjalan
          </p>
        </div>
        <Link to="/ts-form" className="btn-primary">
          + Form Add Plan TS
        </Link>
      </div>

      <div className="page-body">
        {/* Ringkasan Status */}
        <div className="stat-grid">
          <div className="stat-card accent-red">
            <div className="stat-label">Total TS Ongoing</div>
            <div className="stat-value">{summary?.ongoing ?? '-'}</div>
          </div>
          <div className="stat-card accent-red">
            <div className="stat-label">Plan Terlambat</div>
            <div className="stat-value" style={{ color: summary?.overdue > 0 ? 'var(--st-trouble-text)' : 'inherit' }}>
              {summary?.overdue ?? '-'}
            </div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">TS Selesai Bulan Ini</div>
            <div className="stat-value" style={{ color: '#065F46' }}>{summary?.done_this_month ?? '-'}</div>
          </div>
          <div className="stat-card accent-amber">
            <div className="stat-label">Site Kondisi Degraded</div>
            <div className="stat-value" style={{ color: '#B45309' }}>
              {summary?.degraded_sites ?? '-'}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Cari Site ID, Nama Site, atau PIC..."
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
            {regionals.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Semua Status Ongoing</option>
            <option value="PLAN">Direncanakan (PLAN)</option>
            <option value="PROGRESS">Sedang Dikerjakan</option>
          </select>
        </div>

        {/* Tabel Ongoing TS */}
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Site ID</th>
                <th>Nama Site</th>
                <th>Regional</th>
                <th>Status VPN</th>
                <th>Respon</th>
                <th>Plan Kunjungan</th>
                <th>PIC Kunjungan</th>
                <th>Keterangan Masalah</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    Memuat data troubleshoot...
                  </td>
                </tr>
              ) : troubleshoots.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                    Tidak ada TS ongoing saat ini. Klik <strong>+ Form Add Plan TS</strong> untuk membuat.
                  </td>
                </tr>
              ) : (
                troubleshoots.map((ts) => (
                  <tr key={ts.id}>
                    <td>
                      <Link to={`/sites/${encodeURIComponent(ts.site_code)}`} style={{ fontWeight: 600 }}>
                        {ts.site_code}
                      </Link>
                    </td>
                    <td>{ts.site_name}</td>
                    <td>{ts.regional || '-'}</td>
                    <td><StatusBadge status={ts.vpn_status} type="vpn" /></td>
                    <td><StatusBadge status={ts.response} type="response" /></td>
                    <td>
                      <div>{ts.plan_date || '-'}</div>
                      {ts.is_overdue && (
                        <span style={{ fontSize: 11, color: 'var(--st-trouble-text)', fontWeight: 600 }}>
                          Terlambat
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{ts.pic1 || '-'}</div>
                      {ts.pic2 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{ts.pic2}</div>}
                    </td>
                    <td style={{ maxWidth: 260, fontSize: 13 }}>
                      {ts.problem || ts.description || '-'}
                    </td>
                    <td>
                      <StatusBadge status={ts.status} type="ts" />
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {ts.status === 'PLAN' && (
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleStart(ts.id)}
                            title="Tandai sedang dikerjakan"
                          >
                            Dikerjakan
                          </button>
                        )}
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => navigate(`/report-after-ts?tsId=${ts.id}`)}
                        >
                          Report
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
    </div>
  );
}

