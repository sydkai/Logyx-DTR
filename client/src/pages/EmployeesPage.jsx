import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployeesExcel,
  downloadEmployeesExcel,
} from '../api/employees';
import EmployeeBarcodeModal from '../components/EmployeeBarcodeModal';
import './EmployeesPage.css';

const EMPTY_FORM = {
  emp_id: '',
  first_name: '',
  middle_name: '',
  surname: '',
  initials: '',
  dob: '',
  age: '',
  gender: '',
  civil_status: '',
  blood_type: '',
  present_address: '',
  permanent_address: '',
  mobile: '',
  email: '',
  corp_email: '',
  hired_date: '',
  share: '',
  position: '',
  title_initials: '',
  emp_status: 'ACTIVE',
  rest_day: '',
};

const GENDERS = ['', 'MALE', 'FEMALE'];
const CIVIL_STATUSES = ['', 'SINGLE', 'MARRIED', 'WIDOWED', 'SEPARATED'];
const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATUS_OPTIONS = ['ALL', 'ACTIVE', 'INACTIVE'];
const REST_DAYS = ['', 'saturday', 'sunday', 'saturday,sunday'];

function formatDob(dob) {
  if (!dob) return '—';
  const iso = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return dob;
}

function genderAbbr(gender) {
  if (!gender) return '—';
  const g = gender.toUpperCase();
  if (g.startsWith('F')) return 'FE';
  if (g.startsWith('M')) return 'MA';
  return g.slice(0, 2);
}

function toPayload(form) {
  return {
    ...form,
    age: form.age === '' ? null : Number(form.age),
    middle_name: form.middle_name || null,
    initials: form.initials || null,
    dob: form.dob || null,
    gender: form.gender || null,
    civil_status: form.civil_status || null,
    blood_type: form.blood_type || null,
    present_address: form.present_address || null,
    permanent_address: form.permanent_address || null,
    mobile: form.mobile || null,
    email: form.email || null,
    corp_email: form.corp_email || null,
    hired_date: form.hired_date || null,
    share: form.share || null,
    position: form.position || null,
    title_initials: form.title_initials || null,
    rest_day: form.rest_day || null,
  };
}

function empToForm(emp) {
  return {
    emp_id: emp.emp_id,
    first_name: emp.first_name,
    middle_name: emp.middle_name || '',
    surname: emp.surname,
    initials: emp.initials || '',
    dob: emp.dob || '',
    age: emp.age ?? '',
    gender: emp.gender || '',
    civil_status: emp.civil_status || '',
    blood_type: emp.blood_type || '',
    present_address: emp.present_address || '',
    permanent_address: emp.permanent_address || '',
    mobile: emp.mobile || '',
    email: emp.email || '',
    corp_email: emp.corp_email || '',
    hired_date: emp.hired_date || '',
    share: emp.share || '',
    position: emp.position || '',
    title_initials: emp.title_initials || '',
    emp_status: emp.emp_status || 'ACTIVE',
    rest_day: emp.rest_day || '',
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [barcodeEmployee, setBarcodeEmployee] = useState(null);
  const importRef = useRef(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (status !== 'ALL') params.status = status;
      const res = await getEmployees(params);
      setEmployees(res.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(loadEmployees, 250);
    return () => clearTimeout(timer);
  }, [loadEmployees]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function startEdit(emp) {
    setEditingId(emp.emp_id);
    setForm(empToForm(emp));
    setError('');
    setMessage('');
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = toPayload(form);
      if (editingId) {
        await updateEmployee(editingId, payload);
        setMessage('Employee updated.');
      } else {
        await createEmployee(payload);
        setMessage('Employee added.');
      }
      resetForm();
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp) {
    if (!confirm(`Delete employee ${emp.first_name} ${emp.surname}?`)) return;
    setError('');
    try {
      await deleteEmployee(emp.emp_id);
      if (editingId === emp.emp_id) resetForm();
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Delete failed.');
    }
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(ext)) {
      setError('Please choose an Excel file (.xlsx or .xls).');
      return;
    }

    setImporting(true);
    setError('');
    setMessage('');
    try {
      const res = await importEmployeesExcel(file);
      const { inserted = 0, updated = 0, skipped = [] } = res.data;
      let msg = res.data.message || `Import complete: ${inserted} added, ${updated} updated.`;
      if (skipped.length) msg += ` ${skipped.length} row(s) were skipped.`;
      setMessage(msg);
      await loadEmployees();
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 401) {
        setError('Session expired. Please log out and log in again, then retry import.');
      } else {
        setError(data?.error || err.message || 'Import failed.');
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleExportExcel() {
    setError('');
    try {
      await downloadEmployeesExcel();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Export failed.');
    }
  }

  function handleExportPdf() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = employees
      .map(
        (emp) => `
      <tr>
        <td>${emp.emp_id}</td>
        <td>${emp.first_name}</td>
        <td>${emp.middle_name || ''}</td>
        <td>${emp.surname}</td>
        <td>${emp.initials || ''}</td>
        <td>${formatDob(emp.dob)}</td>
        <td>${emp.age ?? ''}</td>
        <td>${genderAbbr(emp.gender)}</td>
        <td>${emp.position || ''}</td>
        <td>${emp.emp_status || ''}</td>
        <td>${emp.rest_day ? emp.rest_day.charAt(0).toUpperCase() + emp.rest_day.slice(1) : '—'}</td>
      </tr>`,
      )
      .join('');

    printWindow.document.write(`<!DOCTYPE html>
      <html><head><title>Employee Roster</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; }
        h1 { font-size: 16px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; }
      </style></head><body>
      <h1>MAGALLONES GROUP — Employee Roster</h1>
      <table>
        <thead><tr>
          <th>Employee #</th><th>First Name</th><th>Middle Name</th><th>Surname</th>
          <th>Initials</th><th>DOB</th><th>Age</th><th>Gender</th><th>Position</th>
          <th>Status</th><th>Rest Day</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="employees-page">
      {(error || message) && (
        <div className={error ? 'error-banner' : 'success-banner'}>{error || message}</div>
      )}

      <div className="employees-layout">
        <aside className="employees-form-panel panel">
          <h2 className="panel-section-title">{editingId ? 'EDIT EMPLOYEE' : 'ADD EMPLOYEE'}</h2>
          <form className="employees-form" onSubmit={handleSave}>
            <label className="form-group">
              <span>Employee #</span>
              <input
                className="form-input"
                value={form.emp_id}
                onChange={set('emp_id')}
                placeholder="e.g. RAIF-RDU-02-02-24"
                required
                disabled={!!editingId}
              />
            </label>
            <label className="form-group">
              <span>First Name</span>
              <input className="form-input" value={form.first_name} onChange={set('first_name')} required />
            </label>
            <label className="form-group">
              <span>Middle Name</span>
              <input className="form-input" value={form.middle_name} onChange={set('middle_name')} />
            </label>
            <label className="form-group">
              <span>Surname</span>
              <input className="form-input" value={form.surname} onChange={set('surname')} required />
            </label>
            <label className="form-group">
              <span>Initials</span>
              <input className="form-input" value={form.initials} onChange={set('initials')} placeholder="RAIF" />
            </label>
            <label className="form-group">
              <span>Date of Birth</span>
              <input className="form-input" type="date" value={form.dob} onChange={set('dob')} />
            </label>
            <label className="form-group">
              <span>Age</span>
              <input
                className="form-input"
                type="number"
                min="0"
                value={form.age}
                onChange={set('age')}
                placeholder="Auto or manual"
              />
            </label>
            <label className="form-group">
              <span>Gender</span>
              <select className="form-select" value={form.gender} onChange={set('gender')}>
                {GENDERS.map((g) => (
                  <option key={g || 'blank'} value={g}>{g || '—'}</option>
                ))}
              </select>
            </label>
            <label className="form-group">
              <span>Civil Status</span>
              <select className="form-select" value={form.civil_status} onChange={set('civil_status')}>
                {CIVIL_STATUSES.map((s) => (
                  <option key={s || 'blank'} value={s}>{s || '—'}</option>
                ))}
              </select>
            </label>
            <label className="form-group">
              <span>Blood Type</span>
              <select className="form-select" value={form.blood_type} onChange={set('blood_type')}>
                {BLOOD_TYPES.map((b) => (
                  <option key={b || 'blank'} value={b}>{b || '—'}</option>
                ))}
              </select>
            </label>
            <label className="form-group">
              <span>Mobile No.</span>
              <input className="form-input" value={form.mobile} onChange={set('mobile')} placeholder="09XX-XXX-XXXX" />
            </label>
            <label className="form-group">
              <span>Present Address</span>
              <textarea className="form-input form-textarea" value={form.present_address} onChange={set('present_address')} rows={2} />
            </label>
            <label className="form-group">
              <span>Permanent Address</span>
              <textarea className="form-input form-textarea" value={form.permanent_address} onChange={set('permanent_address')} rows={2} />
            </label>
            <label className="form-group">
              <span>Email</span>
              <input className="form-input" type="email" value={form.email} onChange={set('email')} />
            </label>
            <label className="form-group">
              <span>Corporate Email</span>
              <input className="form-input" type="email" value={form.corp_email} onChange={set('corp_email')} />
            </label>
            <label className="form-group">
              <span>Hired Date</span>
              <input className="form-input" value={form.hired_date} onChange={set('hired_date')} placeholder="YYYY-MM-DD or /MM/YYYY" />
            </label>
            <label className="form-group">
              <span>Share</span>
              <input className="form-input" value={form.share} onChange={set('share')} placeholder="A or B" />
            </label>
            <label className="form-group">
              <span>Title / Position</span>
              <input className="form-input" value={form.position} onChange={set('position')} />
            </label>
            <label className="form-group">
              <span>Title Initials</span>
              <input className="form-input" value={form.title_initials} onChange={set('title_initials')} placeholder="RDU" />
            </label>
            <label className="form-group">
              <span>Employment Status</span>
              <select className="form-select" value={form.emp_status} onChange={set('emp_status')}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>

            {/* ── Rest Day ── */}
            <label className="form-group">
              <span>Rest Day</span>
              <select className="form-select" value={form.rest_day} onChange={set('rest_day')}>
                {REST_DAYS.map((d) => (
                  <option key={d || 'none'} value={d}>
                    {d === '' ? '— None —'
                      : d === 'saturday,sunday' ? 'Saturday & Sunday'
                      : d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <div className="employees-form-actions">
              {editingId && (
                <button type="button" className="btn" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'SAVING…' : editingId ? 'UPDATE EMPLOYEE' : 'SAVE EMPLOYEE'}
              </button>
            </div>
          </form>
        </aside>

        <section className="employees-db-panel panel">
          <div className="employees-db-header">
            <h2 className="panel-section-title">EMPLOYEE DATABASE</h2>
            <div className="employees-db-toolbar">
              <input
                className="form-input search-input"
                type="text"
                placeholder="Search by name, ID, title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="form-select status-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</option>
                ))}
              </select>
              <span className="employee-count">{employees.length} employees</span>
            </div>
          </div>

          <div className="employees-table-wrap">
            {loading ? (
              <div className="empty-state">Loading employees…</div>
            ) : employees.length === 0 ? (
              <div className="empty-state">No employees found. Add one or import from Excel.</div>
            ) : (
              <table className="employees-table">
                <thead>
                  <tr>
                    <th>Employee #</th>
                    <th>First Name</th>
                    <th>Middle Name</th>
                    <th>Surname</th>
                    <th>Initials</th>
                    <th>DOB</th>
                    <th>Age</th>
                    <th>Gender</th>
                    <th>Rest Day</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.emp_id} className={editingId === emp.emp_id ? 'row-active' : ''}>
                      <td className="col-emp-id">
                        <button
                          type="button"
                          className="emp-id-link"
                          title="View barcode"
                          onClick={() => setBarcodeEmployee(emp)}
                        >
                          {emp.emp_id}
                        </button>
                      </td>
                      <td className="col-name">{emp.first_name}</td>
                      <td className="col-muted">{emp.middle_name || '—'}</td>
                      <td className="col-name">{emp.surname}</td>
                      <td className="col-initials">{emp.initials || '—'}</td>
                      <td className="col-muted">{formatDob(emp.dob)}</td>
                      <td className="col-muted">{emp.age ?? '—'}</td>
                      <td className="col-muted">{genderAbbr(emp.gender)}</td>
                      <td className="col-muted">
                        {emp.rest_day === 'saturday,sunday' ? 'Sat & Sun'
                          : emp.rest_day ? emp.rest_day.charAt(0).toUpperCase() + emp.rest_day.slice(1)
                          : '—'}
                      </td>
                      <td className="col-actions">
                        <button type="button" className="btn-icon btn-edit" title="Edit" onClick={() => startEdit(emp)}>
                          ✎
                        </button>
                        <button type="button" className="btn-icon" title="Delete" onClick={() => handleDelete(emp)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="employees-db-footer">
            <input
              ref={importRef}
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleImport}
            />
            <button
              type="button"
              className="btn"
              disabled={importing}
              onClick={() => importRef.current?.click()}
            >
              {importing ? 'IMPORTING…' : 'IMPORT FROM EXCEL'}
            </button>
            <button type="button" className="btn" onClick={handleExportExcel}>
              EXPORT TO EXCEL
            </button>
            <button type="button" className="btn btn-primary" onClick={handleExportPdf}>
              EXPORT PDF
            </button>
          </div>
        </section>
      </div>

      <EmployeeBarcodeModal
        employee={barcodeEmployee}
        onClose={() => setBarcodeEmployee(null)}
      />
    </div>
  );
}
