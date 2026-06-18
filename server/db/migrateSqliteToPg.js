'use strict';

const fs = require('fs');
const path = require('path');
const { getDb, usePostgres } = require('./database');

const FLAG_KEY = 'sqlite_migrated_at';

function getLegacySqlitePath() {
  const candidates = [
    process.env.SQLITE_PATH,
    '/opt/render/project/src/data/logyx.db',
    path.join(__dirname, '../../data/logyx.db'),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function readSqlite(pathToDb) {
  const Database = require('better-sqlite3');
  const db = new Database(pathToDb, { readonly: true });
  const all = (sql) => db.prepare(sql).all();
  const data = {
    employees: all('SELECT * FROM employees'),
    admins: all('SELECT * FROM admins'),
    records: all('SELECT * FROM records'),
    leave_requests: all('SELECT * FROM leave_requests'),
    company_settings: all('SELECT * FROM company_settings'),
  };
  db.close();
  return data;
}

async function alreadyMigrated(db) {
  const { rows } = await db.query(
    'SELECT value FROM company_settings WHERE key = $1',
    [FLAG_KEY],
  );
  return Boolean(rows[0]?.value);
}

async function markMigrated(db) {
  await db.query(
    `INSERT INTO company_settings (key, value, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
    [FLAG_KEY, new Date().toISOString()],
  );
}

async function upsertEmployee(db, row) {
  await db.query(
    `INSERT INTO employees (
      emp_id, first_name, middle_name, surname, initials,
      dob, age, gender, civil_status, blood_type,
      present_address, permanent_address, mobile, email, corp_email,
      hired_date, share, position, title_initials, emp_status, rest_day
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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
      rest_day = EXCLUDED.rest_day,
      updated_at = CURRENT_TIMESTAMP`,
    [
      row.emp_id, row.first_name, row.middle_name, row.surname, row.initials,
      row.dob, row.age, row.gender, row.civil_status, row.blood_type,
      row.present_address, row.permanent_address, row.mobile, row.email, row.corp_email,
      row.hired_date, row.share, row.position, row.title_initials, row.emp_status, row.rest_day || null,
    ],
  );
}

async function upsertAdmin(db, row) {
  await db.query(
    `INSERT INTO admins (email, password_hash, name, role, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       is_active = EXCLUDED.is_active`,
    [row.email, row.password_hash, row.name, row.role, row.is_active ?? 1],
  );
}

async function upsertRecord(db, row) {
  const { rows: existing } = await db.query(
    `SELECT id FROM records
     WHERE emp_id = $1 AND raw_date = $2 AND time = $3 AND type = $4`,
    [row.emp_id, row.raw_date, row.time, row.type],
  );
  if (existing[0]) return false;

  await db.query(
    `INSERT INTO records (emp_id, name, type, raw_date, time, day, ts, status, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      row.emp_id, row.name, row.type, row.raw_date, row.time,
      row.day, row.ts, row.status, row.note,
    ],
  );
  return true;
}

async function upsertLeave(db, row) {
  const { rows: existing } = await db.query(
    'SELECT id FROM leave_requests WHERE emp_id = $1 AND date_from = $2 AND date_to = $3 AND type = $4',
    [row.emp_id, row.date_from, row.date_to, row.type],
  );
  if (existing[0]) return false;

  await db.query(
    `INSERT INTO leave_requests (emp_id, type, date_from, date_to, reason, status, pay_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [row.emp_id, row.type, row.date_from, row.date_to, row.reason, row.status, row.pay_type],
  );
  return true;
}

async function migrateSqliteToPostgresIfNeeded() {
  if (!usePostgres()) return;

  const sqlitePath = getLegacySqlitePath();
  if (!sqlitePath) return;

  const db = getDb();
  if (await alreadyMigrated(db)) return;

  let data;
  try {
    data = readSqlite(sqlitePath);
  } catch (err) {
    console.warn('⚠ SQLite migration skipped:', err.message);
    return;
  }

  let recordsAdded = 0;
  let leavesAdded = 0;

  for (const emp of data.employees) await upsertEmployee(db, emp);
  for (const admin of data.admins) await upsertAdmin(db, admin);
  for (const rec of data.records) {
    if (await upsertRecord(db, rec)) recordsAdded += 1;
  }
  for (const leave of data.leave_requests) {
    if (await upsertLeave(db, leave)) leavesAdded += 1;
  }

  await markMigrated(db);
  console.log(
    `✔ SQLite → Neon migration from ${sqlitePath}: `
    + `${data.employees.length} employees, ${data.admins.length} admins, `
    + `${recordsAdded} new records, ${leavesAdded} new leave requests`,
  );
}

module.exports = { migrateSqliteToPostgresIfNeeded };
