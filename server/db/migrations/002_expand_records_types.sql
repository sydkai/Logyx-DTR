PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

ALTER TABLE records RENAME TO records_old;

CREATE TABLE records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_id     TEXT NOT NULL,
  name       TEXT,
  type       TEXT NOT NULL CHECK(type IN ('IN','LUNCH-OUT','LUNCH-IN','OUT','OT-IN','OT-OUT','ABSENT')),
  raw_date   TEXT NOT NULL,
  time       TEXT NOT NULL,
  day        TEXT,
  ts         INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status     TEXT,
  note       TEXT,
  FOREIGN KEY (emp_id) REFERENCES employees(emp_id)
);

INSERT INTO records (id, emp_id, name, type, raw_date, time, day, ts, created_at, status, note)
SELECT id, emp_id, name, type, raw_date, time, day, ts, created_at, NULL AS status, NULL AS note
FROM records_old;

DROP TABLE records_old;

CREATE INDEX IF NOT EXISTS idx_records_emp_date ON records(emp_id, raw_date);
CREATE INDEX IF NOT EXISTS idx_records_date ON records(raw_date);

COMMIT;

PRAGMA foreign_keys = ON;