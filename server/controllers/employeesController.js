const { getDb, withTransaction } = require('../db/database');
const { parseWorkbook, buildWorkbook } = require('../lib/employeeExcel');

const EMP_FIELDS = `
  emp_id, first_name, middle_name, surname, initials,
  dob, age, gender, civil_status, blood_type,
  present_address, permanent_address, mobile, email, corp_email,
  hired_date, share, position, title_initials, emp_status, rest_day,
  created_at, updated_at
`;

async function list(req, res) {
  try {
    const db = getDb();
    const { search, status } = req.query;

    let sql = `SELECT ${EMP_FIELDS} FROM employees WHERE 1=1`;
    const params = [];
    let i = 1;

    if (search) {
      const q = `%${search}%`;
      sql += ` AND (
        emp_id ILIKE $${i} OR first_name ILIKE $${i+1} OR surname ILIKE $${i+2}
        OR middle_name ILIKE $${i+3} OR position ILIKE $${i+4}
        OR initials ILIKE $${i+5} OR title_initials ILIKE $${i+6}
      )`;
      params.push(q, q, q, q, q, q, q);
      i += 7;
    }
    if (status) {
      sql += ` AND emp_status = $${i}`;
      params.push(status.toUpperCase());
      i++;
    }
    sql += ` ORDER BY surname, first_name`;

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
    const { rows } = await db.query(
      `SELECT ${EMP_FIELDS} FROM employees WHERE emp_id = $1`,
      [req.params.empId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function create(req, res) {
  try {
    const db = getDb();
    const d = req.body;

    if (!d.emp_id || !d.first_name || !d.surname)
      return res.status(400).json({ error: 'emp_id, first_name, and surname are required.' });

    const { rows: existing } = await db.query(
      'SELECT emp_id FROM employees WHERE emp_id = $1', [d.emp_id]
    );
    if (existing[0])
      return res.status(409).json({ error: `Employee ID "${d.emp_id}" already exists.` });

    await db.query(`
      INSERT INTO employees (
        emp_id, first_name, middle_name, surname, initials,
        dob, age, gender, civil_status, blood_type,
        present_address, permanent_address, mobile, email, corp_email,
        hired_date, share, position, title_initials, emp_status, rest_day
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      )
    `, [
      d.emp_id, d.first_name, d.middle_name || null, d.surname, d.initials || null,
      d.dob || null, d.age || null, d.gender || null, d.civil_status || null,
      d.blood_type || null, d.present_address || null, d.permanent_address || null,
      d.mobile || null, d.email || null, d.corp_email || null,
      d.hired_date || null, d.share || null, d.position || null,
      d.title_initials || null, d.emp_status || 'ACTIVE',
      d.rest_day || null,
    ]);

    const { rows } = await db.query(`SELECT ${EMP_FIELDS} FROM employees WHERE emp_id = $1`, [d.emp_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function update(req, res) {
  try {
    const db = getDb();
    const d = req.body;
    const { empId } = req.params;

    const { rows: existing } = await db.query('SELECT emp_id FROM employees WHERE emp_id = $1', [empId]);
    if (!existing[0]) return res.status(404).json({ error: 'Employee not found.' });

    await db.query(`
      UPDATE employees SET
        first_name=$1, middle_name=$2, surname=$3, initials=$4,
        dob=$5, age=$6, gender=$7, civil_status=$8, blood_type=$9,
        present_address=$10, permanent_address=$11, mobile=$12, email=$13, corp_email=$14,
        hired_date=$15, share=$16, position=$17, title_initials=$18, emp_status=$19,
        rest_day=$20, updated_at=CURRENT_TIMESTAMP
      WHERE emp_id=$21
    `, [
      d.first_name, d.middle_name || null, d.surname, d.initials || null,
      d.dob || null, d.age || null, d.gender || null, d.civil_status || null,
      d.blood_type || null, d.present_address || null, d.permanent_address || null,
      d.mobile || null, d.email || null, d.corp_email || null,
      d.hired_date || null, d.share || null, d.position || null,
      d.title_initials || null, d.emp_status || 'ACTIVE',
      d.rest_day || null,
      empId,
    ]);

    const { rows } = await db.query(`SELECT ${EMP_FIELDS} FROM employees WHERE emp_id = $1`, [empId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function remove(req, res) {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM employees WHERE emp_id = $1', [req.params.empId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Employee not found.' });
    res.json({ message: 'Employee deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function getSettings(req, res) {
  try {
    const db = getDb();
    const { rows } = await db.query('SELECT key, value FROM company_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function updateSettings(req, res) {
  try {
    const updates = req.body;

    await withTransaction(async (client) => {
      for (const [key, value] of Object.entries(updates)) {
        await client.query(`
          INSERT INTO company_settings (key, value, updated_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
        `, [key, value]);
      }
    });

    res.json({ message: 'Settings updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

const UPSERT_SQL = `
  INSERT INTO employees (
    emp_id, first_name, middle_name, surname, initials,
    dob, age, gender, civil_status, blood_type,
    present_address, permanent_address, mobile, email, corp_email,
    hired_date, share, position, title_initials, emp_status
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
  ON CONFLICT (emp_id) DO UPDATE SET
    first_name=EXCLUDED.first_name, middle_name=EXCLUDED.middle_name,
    surname=EXCLUDED.surname, initials=EXCLUDED.initials,
    dob=EXCLUDED.dob, age=EXCLUDED.age, gender=EXCLUDED.gender,
    civil_status=EXCLUDED.civil_status, blood_type=EXCLUDED.blood_type,
    present_address=EXCLUDED.present_address, permanent_address=EXCLUDED.permanent_address,
    mobile=EXCLUDED.mobile, email=EXCLUDED.email, corp_email=EXCLUDED.corp_email,
    hired_date=EXCLUDED.hired_date, share=EXCLUDED.share,
    position=EXCLUDED.position, title_initials=EXCLUDED.title_initials,
    emp_status=EXCLUDED.emp_status, updated_at=CURRENT_TIMESTAMP
`;

async function upsertEmployee(client, data) {
  const { rows: existing } = await client.query(
    'SELECT emp_id FROM employees WHERE emp_id = $1', [data.emp_id]
  );
  await client.query(UPSERT_SQL, [
    data.emp_id, data.first_name, data.middle_name || null, data.surname,
    data.initials || null, data.dob || null, data.age || null,
    data.gender || null, data.civil_status || null, data.blood_type || null,
    data.present_address || null, data.permanent_address || null,
    data.mobile || null, data.email || null, data.corp_email || null,
    data.hired_date || null, data.share || null, data.position || null,
    data.title_initials || null, data.emp_status || 'ACTIVE',
  ]);
  return existing[0] ? 'updated' : 'inserted';
}

async function importExcel(req, res) {
  try {
    if (!req.file?.buffer?.length)
      return res.status(400).json({
        error: 'No file received. Choose an .xlsx roster file. If the problem persists, log out and log in again.',
      });

    let parsed;
    try {
      parsed = parseWorkbook(req.file.buffer);
    } catch {
      return res.status(400).json({ error: 'Could not read Excel file. Use the roster template format.' });
    }

    const { employees, skipped } = parsed;
    if (!employees.length)
      return res.status(400).json({ error: 'No valid employee rows found in the file.', skipped });

    const results = { inserted: 0, updated: 0, skipped };

    await withTransaction(async (client) => {
      for (const row of employees) {
        const action = await upsertEmployee(client, row);
        if (action === 'inserted') results.inserted++;
        else results.updated++;
      }
    });

    res.json({
      message: `Import complete: ${results.inserted} added, ${results.updated} updated.`,
      ...results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function exportExcel(req, res) {
  try {
    const db = getDb();
    const { rows: employees } = await db.query(
      `SELECT ${EMP_FIELDS} FROM employees ORDER BY surname, first_name`
    );
    const buffer = buildWorkbook(employees);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Employee_Roster_${stamp}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { list, get, create, update, remove, getSettings, updateSettings, importExcel, exportExcel };