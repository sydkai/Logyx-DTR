'use strict';

const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

// ─── DB path ──────────────────────────────────────────────────────────────────
// In packaged Electron, USER_DATA_PATH is injected by main.js via spawn env.
// In dev / seed runs, falls back to the project root.
function getDbPath() {
  if (process.env.SQLITE_PATH) {
    return process.env.SQLITE_PATH;
  }
  if (process.env.USER_DATA_PATH) {
    return path.join(process.env.USER_DATA_PATH, 'logyx.db');
  }
  return path.join(__dirname, '../../logyx.db');
}

let _db = null;

function getSqliteDb() {
  if (!_db) {
    const dbPath = getDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// ─── PostgreSQL-compat query adapter ─────────────────────────────────────────
// Converts $1,$2,... → ? and ILIKE → LIKE so existing route code works as-is.
function executeQuery(sqlite, sql, params = []) {
  const hasReturning = /\bRETURNING\b/i.test(sql);
  const converted = sql
    .replace(/\$\d+/g, '?')
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/\s+RETURNING\s+\*/gi, '')
    .trim();

  const upper = converted.toUpperCase().trimStart();

  try {
    if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA')) {
      const rows = sqlite.prepare(converted).all(...params);
      return { rows, rowCount: rows.length };
    }

    if (hasReturning) {
      const result   = sqlite.prepare(converted).run(...params);
      const tblMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
      if (tblMatch && result.lastInsertRowid) {
        const rows = sqlite.prepare(
          `SELECT * FROM ${tblMatch[1]} WHERE rowid = ?`
        ).all(result.lastInsertRowid);
        return { rows, rowCount: result.changes };
      }
      return { rows: [], rowCount: result.changes };
    }

    const result = sqlite.prepare(converted).run(...params);
    return { rows: [], rowCount: result.changes };

  } catch (err) {
    console.error('[DB Error]', err.message);
    console.error('[SQL]', converted);
    console.error('[Params]', params);
    throw err;
  }
}

function createWrapper(sqlite) {
  return {
    query(sql, params = []) {
      return executeQuery(sqlite, sql, params);
    },
    prepare(sql) {
      return sqlite.prepare(sql);
    },
    transaction(fn) {
      return sqlite.transaction(fn);
    },
  };
}

function getDb() {
  return createWrapper(getSqliteDb());
}

// ─── Transaction helper ───────────────────────────────────────────────────────
async function withTransaction(fn) {
  const sqlite = getSqliteDb();
  sqlite.prepare('BEGIN').run();
  try {
    await fn(createWrapper(sqlite));
    sqlite.prepare('COMMIT').run();
  } catch (err) {
    try { sqlite.prepare('ROLLBACK').run(); } catch (_) {}
    throw err;
  }
}

// ─── Migrations ───────────────────────────────────────────────────────────────
async function runMigrations() {
  const sqlite = getSqliteDb();

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      emp_id            TEXT PRIMARY KEY,
      first_name        TEXT NOT NULL,
      middle_name       TEXT,
      surname           TEXT NOT NULL,
      initials          TEXT,
      dob               TEXT,
      age               INTEGER,
      gender            TEXT,
      civil_status      TEXT,
      blood_type        TEXT,
      present_address   TEXT,
      permanent_address TEXT,
      mobile            TEXT,
      email             TEXT,
      corp_email        TEXT,
      hired_date        TEXT,
      share             TEXT,
      position          TEXT,
      title_initials    TEXT,
      emp_status        TEXT DEFAULT 'ACTIVE',
      rest_day          TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS records (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id     TEXT NOT NULL,
      name       TEXT,
      type       TEXT NOT NULL,
      raw_date   TEXT NOT NULL,
      time       TEXT NOT NULL,
      day        TEXT,
      ts         INTEGER,
      status     TEXT,
      note       TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_records_emp_date ON records(emp_id, raw_date);
    CREATE INDEX IF NOT EXISTS idx_records_date     ON records(raw_date);

    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT,
      role          TEXT DEFAULT 'admin',
      is_active     INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      emp_id       TEXT NOT NULL,
      type         TEXT NOT NULL,
      date_from    TEXT NOT NULL,
      date_to      TEXT NOT NULL,
      reason       TEXT,
      status       TEXT DEFAULT 'PENDING',
      pay_type     TEXT,
      reviewed_by  INTEGER,
      reviewed_at  TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_leave_emp    ON leave_requests(emp_id);
    CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

    CREATE TABLE IF NOT EXISTS scan_edits (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id     INTEGER NOT NULL,
      original_time TEXT,
      original_type TEXT,
      edited_time   TEXT,
      edited_type   TEXT,
      edited_by     INTEGER NOT NULL,
      note          TEXT,
      edited_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Default company settings
  const ins = sqlite.prepare(`INSERT OR IGNORE INTO company_settings (key, value) VALUES (?, ?)`);
  ins.run('company_name',    'MAGALLONES GROUP');
  ins.run('registration_no', '');
  ins.run('work_schedule',   '8:00 AM - 5:00 PM (1 hr lunch break)');

  console.log('✔ SQLite migrations done —', getDbPath());
}

async function closePool() {
  if (_db) { _db.close(); _db = null; }
}

module.exports = { getDb, withTransaction, runMigrations, closePool };