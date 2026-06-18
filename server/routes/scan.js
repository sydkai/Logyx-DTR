'use strict';

const router = require('express').Router();
const { getDb } = require('../db/database');
const { extractEmployeeId, idsMatch } = require('../lib/scanId');

const EMP_FIELDS = `
  emp_id, first_name, middle_name, surname, initials,
  dob, age, gender, civil_status, blood_type,
  present_address, permanent_address, mobile, email, corp_email,
  hired_date, share, position, title_initials, emp_status,
  created_at, updated_at
`;

// Public — barcode scanner lookup (read-only, no auth)
router.get('/employee', async (req, res) => {
  try {
    const raw = String(req.query.q || req.query.id || '').trim();
    if (!raw) {
      return res.status(400).json({ error: 'Missing scan value (q).' });
    }

    const target = extractEmployeeId(raw);
    const db = getDb();
    const { rows: employees } = await db.query(`SELECT ${EMP_FIELDS} FROM employees`);

    const emp = employees.find((e) => idsMatch(e.emp_id, target))
      || employees.find((e) => idsMatch(e.emp_id, raw));

    if (!emp) {
      return res.status(404).json({
        error: 'Employee not found.',
        scanned: raw,
        parsed: target,
      });
    }

    res.json(emp);
  } catch (err) {
    console.error('[scan lookup]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
