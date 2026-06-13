const { getDb } = require('../db/database');
const { parseWorkbook, buildWorkbook } = require('../lib/employeeExcel');

const EMP_FIELDS = `
  emp_id, first_name, middle_name, surname, initials,
  dob, age, gender, civil_status, blood_type,
  present_address, permanent_address, mobile, email, corp_email,
  hired_date, share, position, title_initials, emp_status,
  created_at, updated_at
`;

function list(req, res) {
  const db = getDb();
  const { search, status } = req.query;

  let sql    = `SELECT ${EMP_FIELDS} FROM employees WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ` AND (
      emp_id LIKE ? OR first_name LIKE ? OR surname LIKE ? OR middle_name LIKE ?
      OR position LIKE ? OR initials LIKE ? OR title_initials LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q, q, q);
  }
  if (status) {
    sql += ` AND emp_status = ?`;
    params.push(status.toUpperCase());
  }
  sql += ` ORDER BY surname, first_name`;

  res.json(db.prepare(sql).all(...params));
}

function get(req, res) {
  const db  = getDb();
  const emp = db.prepare(`SELECT ${EMP_FIELDS} FROM employees WHERE emp_id = ?`).get(req.params.empId);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });
  res.json(emp);
}

function create(req, res) {
  const db   = getDb();
  const data = req.body;

  if (!data.emp_id || !data.first_name || !data.surname)
    return res.status(400).json({ error: 'emp_id, first_name, and surname are required.' });

  const existing = db.prepare('SELECT emp_id FROM employees WHERE emp_id = ?').get(data.emp_id);
  if (existing)
    return res.status(409).json({ error: `Employee ID "${data.emp_id}" already exists.` });

  db.prepare(`
    INSERT INTO employees (
      emp_id, first_name, middle_name, surname, initials,
      dob, age, gender, civil_status, blood_type,
      present_address, permanent_address, mobile, email, corp_email,
      hired_date, share, position, title_initials, emp_status
    ) VALUES (
      @emp_id, @first_name, @middle_name, @surname, @initials,
      @dob, @age, @gender, @civil_status, @blood_type,
      @present_address, @permanent_address, @mobile, @email, @corp_email,
      @hired_date, @share, @position, @title_initials, @emp_status
    )
  `).run({
    emp_id: data.emp_id, first_name: data.first_name, middle_name: data.middle_name || null,
    surname: data.surname, initials: data.initials || null,
    dob: data.dob || null, age: data.age || null,
    gender: data.gender || null, civil_status: data.civil_status || null,
    blood_type: data.blood_type || null,
    present_address: data.present_address || null,
    permanent_address: data.permanent_address || null,
    mobile: data.mobile || null, email: data.email || null,
    corp_email: data.corp_email || null, hired_date: data.hired_date || null,
    share: data.share || null, position: data.position || null,
    title_initials: data.title_initials || null,
    emp_status: data.emp_status || 'ACTIVE'
  });

  const created = db.prepare(`SELECT ${EMP_FIELDS} FROM employees WHERE emp_id = ?`).get(data.emp_id);
  res.status(201).json(created);
}

function update(req, res) {
  const db   = getDb();
  const data = req.body;
  const { empId } = req.params;

  const existing = db.prepare('SELECT emp_id FROM employees WHERE emp_id = ?').get(empId);
  if (!existing) return res.status(404).json({ error: 'Employee not found.' });

  db.prepare(`
    UPDATE employees SET
      first_name = @first_name, middle_name = @middle_name, surname = @surname,
      initials = @initials, dob = @dob, age = @age, gender = @gender,
      civil_status = @civil_status, blood_type = @blood_type,
      present_address = @present_address, permanent_address = @permanent_address,
      mobile = @mobile, email = @email, corp_email = @corp_email,
      hired_date = @hired_date, share = @share, position = @position,
      title_initials = @title_initials, emp_status = @emp_status,
      updated_at = CURRENT_TIMESTAMP
    WHERE emp_id = @emp_id
  `).run({
    emp_id: empId, first_name: data.first_name, middle_name: data.middle_name || null,
    surname: data.surname, initials: data.initials || null,
    dob: data.dob || null, age: data.age || null,
    gender: data.gender || null, civil_status: data.civil_status || null,
    blood_type: data.blood_type || null,
    present_address: data.present_address || null,
    permanent_address: data.permanent_address || null,
    mobile: data.mobile || null, email: data.email || null,
    corp_email: data.corp_email || null, hired_date: data.hired_date || null,
    share: data.share || null, position: data.position || null,
    title_initials: data.title_initials || null,
    emp_status: data.emp_status || 'ACTIVE'
  });

  const updated = db.prepare(`SELECT ${EMP_FIELDS} FROM employees WHERE emp_id = ?`).get(empId);
  res.json(updated);
}

function remove(req, res) {
  const db     = getDb();
  const result = db.prepare('DELETE FROM employees WHERE emp_id = ?').run(req.params.empId);
  if (!result.changes) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ message: 'Employee deleted.' });
}

function getSettings(req, res) {
  const db   = getDb();
  const rows = db.prepare('SELECT key, value FROM company_settings').all();
  const settings = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  res.json(settings);
}

function updateSettings(req, res) {
  const db      = getDb();
  const updates = req.body; // { company_name: '...', registration_no: '...', work_schedule: '...' }
  const stmt    = db.prepare(`
    INSERT INTO company_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const upsertAll = db.transaction((obj) => {
    for (const [key, value] of Object.entries(obj)) stmt.run(key, value);
  });
  upsertAll(updates);
  res.json({ message: 'Settings updated.' });
}

const UPSERT_SQL = `
  INSERT INTO employees (
    emp_id, first_name, middle_name, surname, initials,
    dob, age, gender, civil_status, blood_type,
    present_address, permanent_address, mobile, email, corp_email,
    hired_date, share, position, title_initials, emp_status
  ) VALUES (
    @emp_id, @first_name, @middle_name, @surname, @initials,
    @dob, @age, @gender, @civil_status, @blood_type,
    @present_address, @permanent_address, @mobile, @email, @corp_email,
    @hired_date, @share, @position, @title_initials, @emp_status
  )
  ON CONFLICT(emp_id) DO UPDATE SET
    first_name = excluded.first_name,
    middle_name = excluded.middle_name,
    surname = excluded.surname,
    initials = excluded.initials,
    dob = excluded.dob,
    age = excluded.age,
    gender = excluded.gender,
    civil_status = excluded.civil_status,
    blood_type = excluded.blood_type,
    present_address = excluded.present_address,
    permanent_address = excluded.permanent_address,
    mobile = excluded.mobile,
    email = excluded.email,
    corp_email = excluded.corp_email,
    hired_date = excluded.hired_date,
    share = excluded.share,
    position = excluded.position,
    title_initials = excluded.title_initials,
    emp_status = excluded.emp_status,
    updated_at = CURRENT_TIMESTAMP
`;

function upsertEmployee(db, data) {
  const existing = db.prepare('SELECT emp_id FROM employees WHERE emp_id = ?').get(data.emp_id);
  db.prepare(UPSERT_SQL).run({
    emp_id: data.emp_id,
    first_name: data.first_name,
    middle_name: data.middle_name || null,
    surname: data.surname,
    initials: data.initials || null,
    dob: data.dob || null,
    age: data.age || null,
    gender: data.gender || null,
    civil_status: data.civil_status || null,
    blood_type: data.blood_type || null,
    present_address: data.present_address || null,
    permanent_address: data.permanent_address || null,
    mobile: data.mobile || null,
    email: data.email || null,
    corp_email: data.corp_email || null,
    hired_date: data.hired_date || null,
    share: data.share || null,
    position: data.position || null,
    title_initials: data.title_initials || null,
    emp_status: data.emp_status || 'ACTIVE',
  });
  return existing ? 'updated' : 'inserted';
}

function importExcel(req, res) {
  if (!req.file || !req.file.buffer?.length) {
    return res.status(400).json({
      error: 'No file received. Choose an .xlsx roster file. If the problem persists, log out and log in again.',
    });
  }

  const db = getDb();
  let parsed;

  try {
    parsed = parseWorkbook(req.file.buffer);
  } catch (err) {
    return res.status(400).json({ error: 'Could not read Excel file. Use the roster template format.' });
  }

  const { employees, skipped } = parsed;
  if (!employees.length) {
    return res.status(400).json({ error: 'No valid employee rows found in the file.', skipped });
  }

  const results = { inserted: 0, updated: 0, skipped };

  const importAll = db.transaction((rows) => {
    for (const row of rows) {
      const action = upsertEmployee(db, row);
      if (action === 'inserted') results.inserted += 1;
      else results.updated += 1;
    }
  });

  importAll(employees);
  res.json({
    message: `Import complete: ${results.inserted} added, ${results.updated} updated.`,
    ...results,
  });
}

function exportExcel(req, res) {
  const db = getDb();
  const employees = db.prepare(`
    SELECT ${EMP_FIELDS} FROM employees ORDER BY surname, first_name
  `).all();

  const buffer = buildWorkbook(employees);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="Employee_Roster_${stamp}.xlsx"`);
  res.send(buffer);
}

module.exports = {
  list, get, create, update, remove, getSettings, updateSettings, importExcel, exportExcel,
};
