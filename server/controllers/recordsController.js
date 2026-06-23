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
  'M-BREAK': 'MORNING BREAK',
  'A-BREAK': 'AFTERNOON BREAK',
};

const VALID_TYPES = ['IN', 'LUNCH-OUT', 'LUNCH-IN', 'OUT', 'OT-IN', 'OT-OUT', 'ABSENT', 'M-BREAK', 'A-BREAK'];
const VALID_TYPE_LABELS = ['IN', 'LUNCH OUT', 'LUNCH IN', 'OUT', 'OT-IN', 'OT-OUT', 'ABSENT', 'M-BREAK', 'A-BREAK'];

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
  let i = params.length + 1;

  if (search) {
    sql += ` AND (
      r.emp_id ILIKE $${i} OR r.name ILIKE $${i + 1} OR e.first_name ILIKE $${i + 2} OR e.surname ILIKE $${i + 3}
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q);
    i += 4;
  }
  if (date) {
    sql += ` AND r.raw_date = $${i++}`;
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
      sql += ` AND r.type = $${i++}`;
      params.push(normalized);
    }
  }
  if (from) {
    sql += ` AND r.raw_date >= $${i++}`;
    params.push(from);
  }
  if (to) {
    sql += ` AND r.raw_date <= $${i++}`;
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

async function list(req, res) {
  try {
    const db = getDb();
    const { emp_id, date, type, from, to } = req.query;
    let sql = `SELECT r.*, e.position FROM records r LEFT JOIN employees e ON r.emp_id = e.emp_id WHERE 1=1`;
    const params = [];
    let i = 1;

    if (emp_id) { sql += ` AND r.emp_id ILIKE $${i++}`; params.push(`%${emp_id}%`); }
    if (date)   { sql += ` AND r.raw_date = $${i++}`;   params.push(date); }
    if (type) {
      const normalized = normalizeRecordType(type);
      if (normalized === 'OVERTIME') {
        sql += ` AND r.type IN ('OT-IN', 'OT-OUT')`;
      } else if (VALID_TYPES.includes(normalized)) {
        sql += ` AND r.type = $${i++}`;
        params.push(normalized);
      }
    }
    if (from) { sql += ` AND r.raw_date >= $${i++}`; params.push(from); }
    if (to)   { sql += ` AND r.raw_date <= $${i++}`; params.push(to); }

    sql += ` ORDER BY r.ts DESC`;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function exportExcel(req, res) {
  try {
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

    const { rows: records } = await db.query(sql, params);
    const buffer = buildWorkbook(records, kind === 'dtr-form' ? 'DTR' : 'Attendance');
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = kind === 'dtr-form'
      ? `DTR_Form_${stamp}.xlsx`
      : `Attendance_Backup_${stamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function create(req, res) {
  try {
    const db = getDb();
    const data = req.body;

    if (!data.emp_id || !data.type)
      return res.status(400).json({ error: 'emp_id and type are required.' });

    const type = normalizeRecordType(data.type);
    if (!VALID_TYPES.includes(type))
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPE_LABELS.join(', ')}` });

    const { rows: empRows } = await db.query(
      'SELECT emp_id, first_name, surname, middle_name FROM employees WHERE emp_id = $1',
      [data.emp_id]
    );
    const emp = empRows[0];
    const name = emp
      ? `${emp.surname}, ${emp.first_name}${emp.middle_name ? ' ' + emp.middle_name.charAt(0) + '.' : ''}`
      : '';

    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const raw_date = data.raw_date || localDateString(now);
    const time = data.time || now.toLocaleTimeString('en-PH', { hour12: true });
    const ts = data.ts || now.getTime();

    const { rows } = await db.query(`
      INSERT INTO records (emp_id, name, type, raw_date, time, day, ts, status, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.emp_id, name, type, raw_date, time,
      data.day || days[now.getDay()], ts,
      data.status || null, data.note || null,
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function update(req, res) {
  try {
    const db = getDb();
    const id = parseInt(req.params.id, 10);
    const data = req.body;

    const { rows: existingRows } = await db.query('SELECT * FROM records WHERE id = $1', [id]);
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Record not found.' });

    const nextType = data.type ? normalizeRecordType(data.type) : existing.type;
    if (!VALID_TYPES.includes(nextType))
      return res.status(400).json({ error: `type must be one of: ${VALID_TYPE_LABELS.join(', ')}` });

    await db.query(`
      INSERT INTO scan_edits (record_id, original_time, original_type, edited_time, edited_type, edited_by, note)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id, existing.time, existing.type,
      data.time || existing.time, nextType,
      req.admin.id, data.note || null,
    ]);

    await db.query(`
      UPDATE records SET time = $1, type = $2, raw_date = $3, day = $4 WHERE id = $5
    `, [
      data.time || existing.time, nextType,
      data.raw_date || existing.raw_date,
      data.day || existing.day,
      id,
    ]);

    const { rows } = await db.query('SELECT * FROM records WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function remove(req, res) {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM records WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getAuditTrail(req, res) {
  try {
    const db = getDb();
    const id = req.params.id;

    const { rows } = await db.query(`
      SELECT se.*, a.name AS edited_by_name, a.email AS edited_by_email
      FROM scan_edits se
      LEFT JOIN admins a ON se.edited_by = a.id
      WHERE se.record_id = $1
      ORDER BY se.edited_at DESC
    `, [id]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function todaySummary(req, res) {
  try {
    const db = getDb();
    const today = req.query.date || localDateString();
    const { rows } = await db.query(`
      SELECT r.*, e.position FROM records r
      LEFT JOIN employees e ON r.emp_id = e.emp_id
      WHERE r.raw_date = $1
      ORDER BY r.ts ASC
    `, [today]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { list, create, update, remove, getAuditTrail, todaySummary, exportExcel };
