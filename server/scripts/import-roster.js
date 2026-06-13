// Usage: node scripts/import-roster.js [path-to-xlsx]
const fs = require('fs');
const path = require('path');
const { parseWorkbook } = require('../lib/employeeExcel');
const { getDb, runMigrations } = require('../db/database');

const file = process.argv[2] || path.join(__dirname, '../../data/Employee_Roster_2026-06-10.xlsx');

runMigrations();
const db = getDb();
const buffer = fs.readFileSync(file);
const { employees, skipped } = parseWorkbook(buffer);

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

const stmt = db.prepare(UPSERT_SQL);
let inserted = 0;
let updated = 0;

const run = db.transaction((rows) => {
  for (const row of rows) {
    const existing = db.prepare('SELECT emp_id FROM employees WHERE emp_id = ?').get(row.emp_id);
    stmt.run({
      ...row,
      middle_name: row.middle_name || null,
      initials: row.initials || null,
      dob: row.dob || null,
      age: row.age || null,
      gender: row.gender || null,
      civil_status: row.civil_status || null,
      blood_type: row.blood_type || null,
      present_address: row.present_address || null,
      permanent_address: row.permanent_address || null,
      mobile: row.mobile || null,
      email: row.email || null,
      corp_email: row.corp_email || null,
      hired_date: row.hired_date || null,
      share: row.share || null,
      position: row.position || null,
      title_initials: row.title_initials || null,
    });
    if (existing) updated += 1;
    else inserted += 1;
  }
});

run(employees);
const total = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
console.log(`✓ Imported from ${file}`);
console.log(`  Added: ${inserted}, Updated: ${updated}, Skipped rows: ${skipped.length}`);
console.log(`  Total employees in database: ${total}`);
