const XLSX = require('xlsx');
const { getDb } = require('../db/database');

const EXPORT_COLUMNS = [
  'Record ID',
  'Employee ID',
  'Name',
  'Position',
  'Date',
  'Time',
  'Type',
  'Day',
  'Created At',
];

const TYPE_LABELS = {
  IN: 'TIME IN',
  'LUNCH-OUT': 'LUNCH OUT',
  'LUNCH-IN': 'LUNCH IN',
  OUT: 'TIME OUT',
  'OT-IN': 'OVERTIME',
  'OT-OUT': 'OVERTIME',
  ABSENT: 'ABSENT',
};

const VALID_TYPES = ['IN', 'LUNCH-OUT', 'LUNCH-IN', 'OUT', 'OT-IN', 'OT-OUT', 'ABSENT'];
const VALID_TYPE_LABELS = ['IN', 'LUNCH OUT', 'LUNCH IN', 'OUT', 'OT-IN', 'OT-OUT', 'ABSENT'];

function localDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeRecordType(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-');
}

function applyExportFilters(sql, params, query) {
  const { search, date, type, from, to } = query;

  if (search) {
    sql += ` AND (
      r.emp_id LIKE ? OR r.name LIKE ? OR e.first_name LIKE ? OR e.surname LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }
  if (date) {
    sql += ` AND r.raw_date = ?`;
    params.push(date);
  }
  if (type) {
    const normalized = String(type).toUpperCase();
    if (normalized === 'OVERTIME') {
      sql += ` AND r.type IN ('OT-IN', 'OT-OUT')`;
    } else if (normalized === 'TIME IN') {
      sql += ` AND r.type = 'IN'`;
    } else if (normalized === 'TIME OUT') {
      sql += ` AND r.type = 'OUT'`;
    } else if (['IN', 'OUT', 'OT-IN', 'OT-OUT', 'ABSENT'].includes(normalized)) {
      sql += ` AND r.type = ?`;
      params.push(normalized);
    }
  }
  if (from) {
    sql += ` AND r.raw_date >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND r.raw_date <= ?`;
    params.push(to);
  }

  return { sql, params };
}

function recordToRow(record) {
  return {
    'Record ID': record.id,
    'Employee ID': record.emp_id,
    Name: record.name || '',
    Position: record.position || '',
    Date: record.raw_date,
    Time: record.time,
    Type: TYPE_LABELS[record.type] || record.type,
    Day: record.day || '',
    'Created At': record.created_at || '',
  };
}

function buildWorkbook(records, sheetName) {
  const rows = records.map(recordToRow);
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_COLUMNS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

function list(req, res) {
  const db = getDb();
  const { emp_id, date, type, from, to } = req.query;

  let sql    = `SELECT r.*, e.position FROM records r LEFT JOIN employees e ON r.emp_id = e.emp_id WHERE 1=1`;
  const params = [];

  if (emp_id) { sql += ` AND r.emp_id LIKE ?`;  params.push(`%${emp_id}%`); }
  if (date)   { sql += ` AND r.raw_date = ?`;   params.push(date); }
  if (type) {
    const normalized = normalizeRecordType(type);
    if (normalized === 'OVERTIME') {
      sql += ` AND r.type IN ('OT-IN', 'OT-OUT')`;
    } else if (VALID_TYPES.includes(normalized)) {
      sql += ` AND r.type = ?`;
      params.push(normalized);
    }
  }
  if (from)   { sql += ` AND r.raw_date >= ?`;   params.push(from); }
  if (to)     { sql += ` AND r.raw_date <= ?`;   params.push(to); }

  sql += ` ORDER BY r.ts DESC`;

  res.json(db.prepare(sql).all(...params));
}

function exportExcel(req, res) {
  const db = getDb();
  const kind = String(req.params.kind || 'excel').toLowerCase();

  let sql = `
    SELECT r.*, e.position
    FROM records r
    LEFT JOIN employees e ON r.emp_id = e.emp_id
    WHERE 1=1
  `;
  let params = [];
  ({ sql, params } = applyExportFilters(sql, params, req.query));
  sql += ` ORDER BY r.ts DESC`;

  const records = db.prepare(sql).all(...params);
  const buffer = buildWorkbook(records, kind === 'dtr-form' ? 'DTR' : 'Attendance');
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = kind === 'dtr-form'
    ? `DTR_Form_${stamp}.xlsx`
    : `Attendance_Backup_${stamp}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

function create(req, res) {
  const db   = getDb();
  const data = req.body;

  if (!data.emp_id || !data.type)
    return res.status(400).json({ error: 'emp_id and type are required.' });

  const type = normalizeRecordType(data.type);
  if (!VALID_TYPES.includes(type))
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPE_LABELS.join(', ')}` });

  const emp = db.prepare('SELECT emp_id, first_name, surname, middle_name FROM employees WHERE emp_id = ?').get(data.emp_id);
  const name = emp
    ? `${emp.surname}, ${emp.first_name}${emp.middle_name ? ' ' + emp.middle_name.charAt(0) + '.' : ''}`
    : '';

  const now  = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const raw_date = data.raw_date || localDateString(now);
  const time     = data.time     || now.toLocaleTimeString('en-PH', { hour12: true });
  const ts       = data.ts       || now.getTime();

  const info = db.prepare(`
    INSERT INTO records (emp_id, name, type, raw_date, time, day, ts, status, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.emp_id, name, type,
    raw_date, time,
    data.day || days[now.getDay()],
    ts,
    data.status || null,
    data.note   || null
  );

  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(record);
}

function update(req, res) {
  const db   = getDb();
  const id   = parseInt(req.params.id);
  const data = req.body;

  const existing = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Record not found.' });

  const nextType = data.type ? normalizeRecordType(data.type) : existing.type;
  if (!VALID_TYPES.includes(nextType)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPE_LABELS.join(', ')}` });
  }

  // Save audit trail before editing
  db.prepare(`
    INSERT INTO scan_edits (record_id, original_time, original_type, edited_time, edited_type, edited_by, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    existing.time, existing.type,
    data.time || existing.time,
    nextType,
    req.admin.id,
    data.note || null
  );

  db.prepare(`
    UPDATE records SET time = ?, type = ?, raw_date = ?, day = ? WHERE id = ?
  `).run(
    data.time     || existing.time,
    nextType,
    data.raw_date || existing.raw_date,
    data.day      || existing.day,
    id
  );

  const updated = db.prepare('SELECT * FROM records WHERE id = ?').get(id);
  res.json(updated);
}

function remove(req, res) {
  const db     = getDb();
  const result = db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Record not found.' });
  res.json({ message: 'Record deleted.' });
}

function getAuditTrail(req, res) {
  const db = getDb();
  const id = req.params.id;

  const edits = db.prepare(`
    SELECT se.*, a.name AS edited_by_name, a.email AS edited_by_email
    FROM scan_edits se
    LEFT JOIN admins a ON se.edited_by = a.id
    WHERE se.record_id = ?
    ORDER BY se.edited_at DESC
  `).all(id);

  res.json(edits);
}

function todaySummary(req, res) {
  const db = getDb();
  const today = req.query.date || localDateString();
  const records = db.prepare(`
    SELECT r.*, e.position FROM records r
    LEFT JOIN employees e ON r.emp_id = e.emp_id
    WHERE r.raw_date = ?
    ORDER BY r.ts ASC
  `).all(today);
  res.json(records);
}

module.exports = { list, create, update, remove, getAuditTrail, todaySummary, exportExcel };
