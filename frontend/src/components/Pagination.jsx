import React from 'react';

export function Pagination({ count, pageSize = 25, currentPage, onPageChange }) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Menampilkan halaman {currentPage} dari {totalPages} ({count} total data)
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="btn-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Sebelumnya
        </button>
        <button
          className="btn-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

