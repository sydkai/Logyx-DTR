import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import './RecordsPage.css';

const TYPE_OPTIONS = ['ALL', 'TIME IN', 'TIME OUT', 'OVERTIME'];
const PAGE_SIZE = 12;

function TypeBadge({ type }) {
  const cls =
    type === 'TIME IN'
      ? 'time-in'
      : type === 'TIME OUT'
        ? 'time-out'
        : type === 'LUNCH OUT' || type === 'LUNCH IN'
          ? 'lunch'
          : 'overtime';
  return (
    <span className={`badge ${cls}`}>
      <span className="dot" />
      {type}
    </span>
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function Records() {
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('ALL');
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filters = { search, from, to, type };

  async function handleExport(kind) {
    try {
      const result = await api.records.download(kind, filters);
      const blob = result instanceof Blob ? result : await result.blob();
      const names = {
        raw: 'attendance_raw.txt',
        excel: 'attendance_backup.xlsx',
        'dtr-form': 'dtr_form.xlsx',
      };
      triggerDownload(blob, names[kind]);
    } catch (err) {
      setError(err.message);
    }
  }

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.records.list(filters);
      const visibleRecords = data.records;
      setRecords(visibleRecords);
      setTotal(visibleRecords.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, from, to, type]);

  const sortedRecords = [...records].sort(
    (a, b) => (b.ts || 0) - (a.ts || 0) || (b.id || 0) - (a.id || 0),
  );
  const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE);
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRecords = sortedRecords.slice(startIndex, startIndex + PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(loadRecords, 250);
    return () => clearTimeout(timer);
  }, [loadRecords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, from, to, type]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleDelete(id) {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await api.records.remove(id);
      loadRecords();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="panel records-panel">
      <div className="panel-header">
        <span className="panel-title">Attendance Log</span>
        <span className="panel-count">
          Showing <strong>{records.length}</strong> of <strong>{total}</strong>
        </span>
      </div>

      {error && <div className="error-banner" style={{ margin: '12px 20px 0' }}>{error}</div>}

      <div className="records-filters">
        <input
          className="form-input search-input"
          type="text"
          placeholder="Filter by ID or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="date-range">
          <input
            className="form-input date-input"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            title="From date"
          />
          <span className="date-range-sep">–</span>
          <input
            className="form-input date-input"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            title="To date"
          />
        </div>
        <select
          className="form-select type-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t === 'ALL' ? 'All Types' : t}
            </option>
          ))}
        </select>
      </div>

      <div className="records-table-wrap">
        {loading ? (
          <div className="empty-state">Loading records...</div>
        ) : records.length === 0 ? (
          <div className="empty-state">No attendance records found.</div>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Date</th>
                <th>Time</th>
                <th>Type</th>
                <th>Day</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRecords.map((row, idx) => (
                <tr key={row.id}>
                  <td className="col-num">{startIndex + idx + 1}</td>
                  <td className="col-id">{row.employee_id}</td>
                  <td className="col-name">{row.name}</td>
                  <td>{row.date}</td>
                  <td>{row.time}</td>
                  <td>
                    <TypeBadge type={row.record_type} />
                  </td>
                  <td>{row.day}</td>
                  <td className="col-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      title="Delete"
                      onClick={() => handleDelete(row.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pageNumbers.length > 1 && (
        <div className="records-pagination">
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`page-link ${pageNumber === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      )}

      <div className="records-footer">
        <button type="button" className="btn" onClick={() => handleExport('raw')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          EXPORT RAW
        </button>
        <button type="button" className="btn" onClick={() => handleExport('excel')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          BACKUP TO EXCEL
        </button>
        <button type="button" className="btn btn-primary" onClick={() => handleExport('dtr-form')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          EXPORT DTR FORM
        </button>
      </div>
    </div>
  );
}