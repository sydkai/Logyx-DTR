const { getDb } = require('../db/database');

function list(req, res) {
  const db = getDb();
  const { status, emp_id } = req.query;

  let sql    = `
    SELECT lr.*, e.first_name, e.surname, e.position, e.title_initials,
           a.name AS reviewed_by_name
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.emp_id = e.emp_id
    LEFT JOIN admins    a ON lr.reviewed_by = a.id
    WHERE 1=1
  `;
  const params = [];

  if (status) { sql += ` AND lr.status = ?`;  params.push(status.toUpperCase()); }
  if (emp_id) { sql += ` AND lr.emp_id = ?`;  params.push(emp_id); }

  sql += ` ORDER BY lr.created_at DESC`;

  res.json(db.prepare(sql).all(...params));
}

function get(req, res) {
  const db   = getDb();
  const item = db.prepare(`
    SELECT lr.*, e.first_name, e.surname, e.position, a.name AS reviewed_by_name
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.emp_id = e.emp_id
    LEFT JOIN admins    a ON lr.reviewed_by = a.id
    WHERE lr.id = ?
  `).get(req.params.id);

  if (!item) return res.status(404).json({ error: 'Leave request not found.' });
  res.json(item);
}

// Public — no auth required, employee submits by emp_id
function create(req, res) {
  const db   = getDb();
  const data = req.body;

  if (!data.emp_id || !data.type || !data.date_from || !data.date_to)
    return res.status(400).json({ error: 'emp_id, type, date_from, and date_to are required.' });

  const emp = db.prepare('SELECT emp_id FROM employees WHERE emp_id = ?').get(data.emp_id);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });

  const validTypes = ['VACATION', 'SICK', 'EMERGENCY', 'OTHER'];
  if (!validTypes.includes(data.type.toUpperCase()))
    return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });

  const info = db.prepare(`
    INSERT INTO leave_requests (emp_id, type, date_from, date_to, reason, pay_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data.emp_id, data.type.toUpperCase(), data.date_from, data.date_to, data.reason || null, data.pay_type || null);

  const created = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(created);
}

// Admin only — approve or reject
function review(req, res) {
  const db     = getDb();
  const { id } = req.params;
  const { status, note } = req.body;

  const validStatuses = ['APPROVED', 'REJECTED'];
  if (!validStatuses.includes((status || '').toUpperCase()))
    return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });

  const existing = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Leave request not found.' });
  if (existing.status !== 'PENDING')
    return res.status(409).json({ error: 'This request has already been reviewed.' });

  db.prepare(`
    UPDATE leave_requests
    SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status.toUpperCase(), req.admin.id, id);

  const updated = db.prepare(`
    SELECT lr.*, e.first_name, e.surname, a.name AS reviewed_by_name
    FROM leave_requests lr
    LEFT JOIN employees e ON lr.emp_id = e.emp_id
    LEFT JOIN admins    a ON lr.reviewed_by = a.id
    WHERE lr.id = ?
  `).get(id);

  res.json(updated);
}

function remove(req, res) {
  const db     = getDb();
  const result = db.prepare('DELETE FROM leave_requests WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Leave request not found.' });
  res.json({ message: 'Leave request deleted.' });
}

// Check if an employee has approved leave on a given date range (used by DTR export)
function getApprovedForEmployee(req, res) {
  const db      = getDb();
  const { empId } = req.params;
  const { month } = req.query; // YYYY-MM

  let sql    = `SELECT * FROM leave_requests WHERE emp_id = ? AND status = 'APPROVED'`;
  const params = [empId];

  if (month) {
    sql += ` AND (date_from LIKE ? OR date_to LIKE ? OR date_from <= ? AND date_to >= ?)`;
    params.push(`${month}%`, `${month}%`, `${month}-31`, `${month}-01`);
  }

  res.json(db.prepare(sql).all(...params));
}

module.exports = { list, get, create, review, remove, getApprovedForEmployee };
