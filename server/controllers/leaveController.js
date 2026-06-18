const { getDb, withTransaction } = require('../db/database');

async function list(req, res) {
  try {
    const db = getDb();
    const { status, emp_id } = req.query;

    let sql = `
      SELECT lr.*, e.first_name, e.surname, e.position, e.title_initials,
             a.name AS reviewed_by_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.emp_id = e.emp_id
      LEFT JOIN admins    a ON lr.reviewed_by = a.id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;

    if (status)  { sql += ` AND lr.status = $${i++}`;  params.push(status.toUpperCase()); }
    if (emp_id)  { sql += ` AND lr.emp_id = $${i++}`;  params.push(emp_id); }

    sql += ` ORDER BY lr.created_at DESC`;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function get(req, res) {
  try {
    const db = getDb();
    const { rows } = await db.query(`
      SELECT lr.*, e.first_name, e.surname, e.position, a.name AS reviewed_by_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.emp_id = e.emp_id
      LEFT JOIN admins    a ON lr.reviewed_by = a.id
      WHERE lr.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ error: 'Leave request not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function create(req, res) {
  try {
    const db = getDb();
    const data = req.body;

    if (!data.emp_id || !data.type || !data.date_from || !data.date_to)
      return res.status(400).json({ error: 'emp_id, type, date_from, and date_to are required.' });

    const { rows: empRows } = await db.query('SELECT emp_id FROM employees WHERE emp_id = $1', [data.emp_id]);
    if (!empRows[0]) return res.status(404).json({ error: 'Employee not found.' });

    const validTypes = ['VACATION', 'SICK', 'EMERGENCY', 'OTHER'];
    if (!validTypes.includes(data.type.toUpperCase()))
      return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });

    const { rows } = await db.query(`
      INSERT INTO leave_requests (emp_id, type, date_from, date_to, reason, pay_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [data.emp_id, data.type.toUpperCase(), data.date_from, data.date_to,
        data.reason || null, data.pay_type || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function review(req, res) {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes((status || '').toUpperCase()))
      return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });

    const { rows: existing } = await db.query('SELECT * FROM leave_requests WHERE id = $1', [id]);
    if (!existing[0]) return res.status(404).json({ error: 'Leave request not found.' });
    if (existing[0].status !== 'PENDING')
      return res.status(409).json({ error: 'This request has already been reviewed.' });

    await db.query(`
      UPDATE leave_requests
      SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [status.toUpperCase(), req.admin.id, id]);

    const { rows } = await db.query(`
      SELECT lr.*, e.first_name, e.surname, a.name AS reviewed_by_name
      FROM leave_requests lr
      LEFT JOIN employees e ON lr.emp_id = e.emp_id
      LEFT JOIN admins    a ON lr.reviewed_by = a.id
      WHERE lr.id = $1
    `, [id]);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function remove(req, res) {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM leave_requests WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Leave request not found.' });
    res.json({ message: 'Leave request deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getApprovedForEmployee(req, res) {
  try {
    const db = getDb();
    const { empId } = req.params;
    const { month } = req.query;

    let sql = `SELECT * FROM leave_requests WHERE emp_id = $1 AND status = 'APPROVED'`;
    const params = [empId];
    let i = 2;

    if (month) {
      sql += ` AND (
        date_from LIKE $${i} OR date_to LIKE $${i+1}
        OR (date_from <= $${i+2} AND date_to >= $${i+3})
      )`;
      params.push(`${month}%`, `${month}%`, `${month}-31`, `${month}-01`);
    }

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { list, get, create, review, remove, getApprovedForEmployee };