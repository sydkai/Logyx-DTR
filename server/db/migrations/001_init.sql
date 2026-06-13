-- ============================================================
-- LOGYX DTR — Database Schema
-- Migration: 001_init.sql
-- ============================================================

-- ── Employees ──────────────────────────────────────────────
-- emp_id is the primary key and the barcode value.
-- hired_date stored as TEXT to preserve values like '/09/2019'.
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
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Attendance Records ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id     TEXT NOT NULL,
  name       TEXT,
  type       TEXT NOT NULL CHECK(type IN ('IN','OUT','OT-IN','OT-OUT')),
  raw_date   TEXT NOT NULL,
  time       TEXT NOT NULL,
  day        TEXT,
  ts         INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

CREATE INDEX IF NOT EXISTS idx_records_emp_date ON records(emp_id, raw_date);
CREATE INDEX IF NOT EXISTS idx_records_date     ON records(raw_date);

-- ── Admins ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'admin' CHECK(role IN ('superadmin','admin')),
  is_active     INTEGER DEFAULT 1,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ── Leave Requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id       TEXT NOT NULL,
  type         TEXT NOT NULL CHECK(type IN ('VACATION','SICK','EMERGENCY','OTHER')),
  date_from    TEXT NOT NULL,
  date_to      TEXT NOT NULL,
  reason       TEXT,
  status       TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
  reviewed_by  INTEGER,
  reviewed_at  DATETIME,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (emp_id)      REFERENCES employees(emp_id),
  FOREIGN KEY (reviewed_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_leave_emp    ON leave_requests(emp_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- ── Scan Edits — Audit Trail ───────────────────────────────
CREATE TABLE IF NOT EXISTS scan_edits (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id     INTEGER NOT NULL,
  original_time TEXT,
  original_type TEXT,
  edited_time   TEXT,
  edited_type   TEXT,
  edited_by     INTEGER NOT NULL,
  note          TEXT,
  edited_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (record_id) REFERENCES records(id),
  FOREIGN KEY (edited_by) REFERENCES admins(id)
);

-- ── Company Settings — Key / Value ─────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default company settings
INSERT OR IGNORE INTO company_settings (key, value) VALUES
  ('company_name', 'MAGALLONES GROUP'),
  ('registration_no', ''),
  ('work_schedule', '8:00 AM – 5:00 PM (1 hr lunch break)');
