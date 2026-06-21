// Usage: node scripts/import-roster.js [path-to-xlsx]
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { parseWorkbook } = require('../lib/employeeExcel');
const { getDb, runMigrations, closePool, withTransaction } = require('../db/database');

const UPSERT_SQL = `
  INSERT INTO employees (
    emp_id, first_name, middle_name, surname, initials,
    dob, age, gender, civil_status, blood_type,
    present_address, permanent_address, mobile, email, corp_email,
    hired_date, share, position, title_initials, emp_status
  ) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10,
    $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20
  )
  ON CONFLICT (emp_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    surname = EXCLUDED.surname,
    initials = EXCLUDED.initials,
    dob = EXCLUDED.dob,
    age = EXCLUDED.age,
    gender = EXCLUDED.gender,
    civil_status = EXCLUDED.civil_status,
    blood_type = EXCLUDED.blood_type,
    present_address = EXCLUDED.present_address,
    permanent_address = EXCLUDED.permanent_address,
    mobile = EXCLUDED.mobile,
    email = EXCLUDED.email,
    corp_email = EXCLUDED.corp_email,
    hired_date = EXCLUDED.hired_date,
    share = EXCLUDED.share,
    position = EXCLUDED.position,
    title_initials = EXCLUDED.title_initials,
    emp_status = EXCLUDED.emp_status,
    updated_at = CURRENT_TIMESTAMP
`;

function rowParams(row) {
  return [
    row.emp_id,
    row.first_name,
    row.middle_name || null,
    row.surname,
    row.initials || null,
    row.dob || null,
    row.age || null,
    row.gender || null,
    row.civil_status || null,
    row.blood_type || null,
    row.present_address || null,
    row.permanent_address || null,
    row.mobile || null,
    row.email || null,
    row.corp_email || null,
    row.hired_date || null,
    row.share || null,
    row.position || null,
    row.title_initials || null,
    row.emp_status || null,
  ];
}

async function main() {
  const file = process.argv[2] || path.join(__dirname, '../../data/Employee_Roster_2026-06-10.xlsx');

  await runMigrations();
  const db = getDb();
  const buffer = fs.readFileSync(file);
  const { employees, skipped } = parseWorkbook(buffer);

  let inserted = 0;
  let updated = 0;

  await withTransaction(async (txDb) => {
    for (const row of employees) {
      const { rows } = await txDb.query(
        'SELECT emp_id FROM employees WHERE emp_id = $1',
        [row.emp_id]
      );
      await txDb.query(UPSERT_SQL, rowParams(row));
      if (rows[0]) updated += 1;
      else inserted += 1;
    }
  });

  const { rows: countRows } = await db.query('SELECT COUNT(*)::int AS c FROM employees');
  const total = countRows[0].c;
  console.log(`✓ Imported from ${file}`);
  console.log(`  Added: ${inserted}, Updated: ${updated}, Skipped rows: ${skipped.length}`);
  console.log(`  Total employees in database: ${total}`);
}

main()
  .then(() => closePool())
  .catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
