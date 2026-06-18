'use strict';

const path = require('path');
const fs   = require('fs');

function usePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

// ─── SQL helpers ──────────────────────────────────────────────────────────────
function sqliteSql(sql) {
  return sql
    .replace(/\$(\d+)/g, '?')
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");
}

function convertQuestionToDollarInSql(sql) {
  let i = 0;
  return sql
    .replace(/datetime\s*\(\s*'now'\s*\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/\?/g, () => `$${++i}`);
}

// ─── SQLite ───────────────────────────────────────────────────────────────────
let _sqlite = null;

function getDbPath() {
  if (process.env.SQLITE_PATH) return process.env.SQLITE_PATH;
  if (process.env.USER_DATA_PATH) {
    return path.join(process.env.USER_DATA_PATH, 'logyx.db');
  }
  return path.join(__dirname, '../../data/logyx.db');
}

function getSqliteDb() {
  if (!_sqlite) {
    const Database = require('better-sqlite3');
    const dbPath = getDbPath();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    _sqlite = new Database(dbPath);
    _sqlite.pragma('journal_mode = WAL');
    _sqlite.pragma('foreign_keys = ON');
  }
  return _sqlite;
}

function executeSqliteQuery(sqlite, sql, params = []) {
  const hasReturning = /\bRETURNING\b/i.test(sql);
  const converted = sqliteSql(sql)
    .replace(/\s+RETURNING\s+\*/gi, '')
    .trim();

  const upper = converted.toUpperCase().trimStart();

  try {
    if (upper.startsWith('SELECT') || upper.startsWith('WITH') || upper.startsWith('PRAGMA')) {
      const rows = sqlite.prepare(converted).all(...params);
      return { rows, rowCount: rows.length };
    }

    if (hasReturning) {
      const result = sqlite.prepare(converted).run(...params);
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

function createSqliteWrapper(sqlite) {
  return {
    query(sql, params = []) {
      return Promise.resolve(executeSqliteQuery(sqlite, sql, params));
    },
    prepare(sql) {
      return sqlite.prepare(sqliteSql(sql));
    },
    transaction(fn) {
      return sqlite.transaction(fn);
    },
  };
}

// ─── PostgreSQL ───────────────────────────────────────────────────────────────
let _pgPool = null;

function getPgPool() {
  if (!_pgPool) {
    const { Pool } = require('pg');
    let connectionString = process.env.DATABASE_URL;
    // channel_binding breaks node-pg on some hosts
    connectionString = connectionString.replace(/[&?]channel_binding=[^&]*/g, '');
    _pgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
    _pgPool.on('error', (err) => {
      console.error('[PG pool error]', err);
    });
  }
  return _pgPool;
}

async function executePgQuery(poolOrClient, sql, params = []) {
  const converted = convertQuestionToDollarInSql(sql);
  try {
    const result = await poolOrClient.query(converted, params);
    return { rows: result.rows, rowCount: result.rowCount };
  } catch (err) {
    console.error('[DB Error]', err.message);
    console.error('[SQL]', converted);
    console.error('[Params]', params);
    throw err;
  }
}

function createPgWrapper(poolOrClient) {
  return {
    query(sql, params = []) {
      return executePgQuery(poolOrClient, sql, params);
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────
function getDb() {
  if (usePostgres()) {
    return createPgWrapper(getPgPool());
  }
  return createSqliteWrapper(getSqliteDb());
}

async function withTransaction(fn) {
  if (usePostgres()) {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await fn(createPgWrapper(client));
      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  const sqlite = getSqliteDb();
  sqlite.prepare('BEGIN').run();
  try {
    await fn(createSqliteWrapper(sqlite));
    sqlite.prepare('COMMIT').run();
  } catch (err) {
    try { sqlite.prepare('ROLLBACK').run(); } catch (_) {}
    throw err;
  }
}

async function runSqliteMigrations() {
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

  const ins = sqlite.prepare('INSERT OR IGNORE INTO company_settings (key, value) VALUES (?, ?)');
  ins.run('company_name', 'MAGALLONES GROUP');
  ins.run('registration_no', '');
  ins.run('work_schedule', '8:00 AM - 5:00 PM (1 hr lunch break)');

  console.log('✔ SQLite migrations done —', getDbPath());
}

async function runPgMigrations() {
  const pool = getPgPool();
  const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await pool.query(sql);
  await pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS rest_day TEXT');
  console.log('✔ PostgreSQL migrations done — Neon');
}

async function runMigrations() {
  if (usePostgres()) {
    await runPgMigrations();
  } else {
    await runSqliteMigrations();
  }
}

async function closePool() {
  if (_pgPool) {
    await _pgPool.end();
    _pgPool = null;
  }
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
  }
}

module.exports = {
  getDb,
  withTransaction,
  runMigrations,
  closePool,
  usePostgres,
};
