'use strict';

const path = require('path');
const fs = require('fs');

// ─── Load env ─────────────────────────────────────────────────────────────────
try { require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); } catch (_) {}

const express = require('express');
const cors    = require('cors');
const { runMigrations, usePostgres } = require('./db/database');
const { seedIfEmpty }   = require('./db/seed');
const { migrateSqliteToPostgresIfNeeded } = require('./db/migrateSqliteToPg');

const app  = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// ─── Middleware ───────────────────────────────────────────────────────────────
// Standalone: localhost only. No LAN/internet required.
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return cb(null, true);
    if (process.env.CLIENT_ORIGIN && origin === process.env.CLIENT_ORIGIN) return cb(null, true);
    cb(null, false);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/scan',      require('./routes/scan'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/records',   require('./routes/records'));
app.use('/api/leave',     require('./routes/leave'));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: usePostgres() ? 'postgresql' : 'sqlite',
    timestamp: new Date().toISOString(),
  });
});

// ─── Serve built client in production ────────────────────────────────────────
const distCandidates = [
  process.env.CLIENT_DIST,
  path.join(__dirname, '..', 'client', 'dist'),
  path.join(__dirname, '..', 'dist'),
].filter(Boolean);

const distDir = distCandidates.find((dir) => fs.existsSync(path.join(dir, 'index.html')))
  || distCandidates[0];

if (distDir && fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log(`✔ Serving client from ${distDir}`);
  app.use(express.static(distDir, { index: false }));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  console.warn('⚠ Client dist not found — API-only mode');
}

// ─── 404 & Error handlers ────────────────────────────────────────────────────
app.use((req, res) => {
  if (res.headersSent) return;
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  try {
    await runMigrations();
    await migrateSqliteToPostgresIfNeeded();
    await seedIfEmpty();
    const dbLabel = usePostgres() ? 'PostgreSQL (Neon)' : 'SQLite';
    app.listen(PORT, HOST, () => {
      // ⚠ This exact string is detected by Electron main.js to know server is ready
      console.log(`LOGYX_SERVER_READY`);
      console.log(`✔ LOGYX Server running on http://${HOST}:${PORT}`);
      console.log(`  Database: ${dbLabel}`);
      console.log(`  Local:   http://localhost:${PORT}`);
      console.log(`  Leave:   http://localhost:${PORT}/leave`);
      console.log(`  Health:  http://localhost:${PORT}/api/health\n`);
    });
  } catch (err) {
    console.error('Boot failed:', err);
    process.exit(1);
  }
}

boot();
