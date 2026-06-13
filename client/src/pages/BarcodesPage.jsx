import { useCallback, useEffect, useRef, useState } from 'react';
import { getEmployees } from '../api/employees';
import { employeeFullName, renderBarcode } from '../lib/barcodeUtils';
import './BarcodesPage.css';

function BarcodeCard({ emp }) {
  const svgRef = useRef(null);

  useEffect(() => {
    renderBarcode(svgRef.current, emp.emp_id);
  }, [emp.emp_id]);

  const fullName = employeeFullName(emp);

  return (
    <div className="barcode-card">
      <div className="barcode-card-name">{fullName}</div>
      <div className="barcode-card-position">{emp.position || emp.title_initials || '—'}</div>
      <div className="barcode-card-svg">
        <svg ref={svgRef} />
      </div>
      <div className="barcode-card-id">{emp.emp_id}</div>
    </div>
  );
}

export default function BarcodesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getEmployees({ status: 'ACTIVE' });
      setEmployees(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="barcodes-page">
      <div className="barcodes-header">
        <div>
          <h1>EMPLOYEE BARCODES</h1>
          <p>Each barcode encodes the Employee # used by the scanner.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          PRINT ALL
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="empty-state">Loading barcodes…</div>
      ) : employees.length === 0 ? (
        <div className="empty-state">No active employees. Add or import employees first.</div>
      ) : (
        <div className="barcode-grid">
          {employees.map((emp) => (
            <BarcodeCard key={emp.emp_id} emp={emp} />
          ))}
        </div>
      )}
    </div>
  );
}
