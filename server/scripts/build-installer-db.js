'use strict';

/**
 * Builds data/logyx.db for the installer package.
 * Run: npm run build:db  (from server/)
 */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'logyx.db');

const UPSERT_EMP = `
  INSERT INTO employees (
    emp_id, first_name, middle_name, surname, initials,
    dob, age, gender, civil_status, blood_type,
    present_address, permanent_address, mobile, email, corp_email,
    hired_date, share, position, title_initials, emp_status
  ) VALUES (?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?)
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
    updated_at = datetime('now')
`;

function upsertEmployee(db, emp) {
  db.query(UPSERT_EMP, [
    emp.emp_id, emp.first_name, emp.middle_name || null, emp.surname, emp.initials || null,
    emp.dob || null, emp.age || null, emp.gender || null, emp.civil_status || null,
    emp.blood_type || null, emp.present_address || null, emp.permanent_address || null,
    emp.mobile || null, emp.email || null, emp.corp_email || null,
    emp.hired_date || null, emp.share || null, emp.position || null,
    emp.title_initials || null, emp.emp_status || 'ACTIVE',
  ]);
}

function importRosterFiles(db, dataDirectory) {
  const { parseWorkbook } = require('../lib/employeeExcel');
  const files = fs.readdirSync(dataDirectory).filter((f) => /\.xlsx$/i.test(f));
  let total = 0;

  for (const file of files) {
    const buffer = fs.readFileSync(path.join(dataDirectory, file));
    const { employees, skipped } = parseWorkbook(buffer);
    for (const emp of employees) {
      upsertEmployee(db, emp);
      total++;
    }
    console.log(`✔ Imported ${employees.length} from ${file}${skipped.length ? ` (${skipped.length} skipped)` : ''}`);
  }

  return total;
}

fs.mkdirSync(dataDir, { recursive: true });
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
  } catch (err) {
    if (err.code === 'EBUSY') {
      console.error('Database is in use. Close Logyx DTR / stop the server, then run build:db again.');
      process.exit(1);
    }
    throw err;
  }
}

process.env.USER_DATA_PATH = dataDir;

const { runMigrations, closePool, getDb } = require('../db/database');
const { seedIfEmpty } = require('../db/seed');

(async () => {
  try {
    await runMigrations();
    await seedIfEmpty();

    const db = getDb();
    const xlsxCount = importRosterFiles(db, dataDir);

    const { rows } = db.query('SELECT COUNT(*) AS cnt FROM employees', []);
    console.log(`✔ Roster XLSX upserts: ${xlsxCount}`);
    console.log(`✔ Total employees in database: ${rows[0].cnt}`);

    await closePool();
    console.log(`✔ Installer database created: ${dbPath}`);
  } catch (err) {
    console.error('Failed to build installer database:', err);
    process.exit(1);
  }
})();
