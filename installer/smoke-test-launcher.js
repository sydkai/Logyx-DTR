'use strict';

/**
 * Smoke-test installer/launcher.js against a temp install layout.
 * Exit 0 on success, 1 on failure.
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const INSTALLER_DIR = __dirname;
const ROOT = path.join(__dirname, '..');
const TESTDIR = path.join(require('os').tmpdir(), 'logyx-launcher-test');
const PORT = 3001;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function killPort(port) {
  try {
    const out = execFileSync('netstat', ['-aon'], { encoding: 'utf8' });
    for (const line of out.split('\n')) {
      if (!line.includes(`:${port} `) || !line.includes('LISTENING')) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) {
        try {
          execFileSync('taskkill', ['/F', '/PID', pid], { stdio: 'ignore' });
        } catch (_) {}
      }
    }
  } catch (_) {}
}

function checkHealth(timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
      res.resume();
      if (res.statusCode === 200) resolve();
      else reject(new Error(`health ${res.statusCode}`));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function main() {
  console.log('Stopping any existing test server on port', PORT);
  killPort(PORT);
  await sleep(500);

  const dist = path.join(ROOT, 'client', 'dist', 'index.html');
  const db = path.join(ROOT, 'data', 'logyx.db');
  const nodeBin = path.join(INSTALLER_DIR, 'nodejs', 'node.exe');
  if (!fs.existsSync(dist)) {
    console.error('ERROR: client/dist not built. Run npm run build:standalone first.');
    process.exit(1);
  }
  if (!fs.existsSync(db)) {
    console.error('ERROR: data/logyx.db not found. Run npm run build:db first.');
    process.exit(1);
  }
  if (!fs.existsSync(nodeBin)) {
    console.error('ERROR: installer/nodejs/node.exe not found.');
    process.exit(1);
  }

  console.log('Preparing test install layout:', TESTDIR);
  if (fs.existsSync(TESTDIR)) fs.rmSync(TESTDIR, { recursive: true, force: true });
  fs.mkdirSync(TESTDIR, { recursive: true });
  copyDir(path.join(INSTALLER_DIR, 'nodejs'), path.join(TESTDIR, 'nodejs'));
  copyDir(path.join(ROOT, 'server'), path.join(TESTDIR, 'server'));
  copyDir(path.join(ROOT, 'client', 'dist'), path.join(TESTDIR, 'client', 'dist'));
  fs.mkdirSync(path.join(TESTDIR, 'data'), { recursive: true });
  fs.copyFileSync(db, path.join(TESTDIR, 'data', 'logyx.db'));
  fs.copyFileSync(path.join(INSTALLER_DIR, 'launcher.js'), path.join(TESTDIR, 'launcher.js'));

  console.log('Starting launcher…');
  const launcher = spawn(nodeBin, [path.join(TESTDIR, 'launcher.js')], {
    cwd: TESTDIR,
    stdio: 'ignore',
    windowsHide: true,
    detached: false,
  });

  let ok = false;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    try {
      await checkHealth();
      ok = true;
      break;
    } catch (_) {}
  }

  if (!ok) {
    console.error('ERROR: Server did not respond on /api/health within 30 s');
    const log = path.join(process.env.APPDATA || '', 'Logyx DTR', 'logyx-main.log');
    if (fs.existsSync(log)) {
      console.error(fs.readFileSync(log, 'utf8').slice(-2000));
    }
    launcher.kill();
    killPort(PORT);
    process.exit(1);
  }

  console.log('OK: /api/health returned 200');

  const version = fs.readFileSync(path.join(TESTDIR, 'nodejs', 'VERSION.txt'), 'utf8').trim();
  console.log('OK: Bundled Node', version);

  console.log('Cleaning up test server…');
  launcher.kill();
  killPort(PORT);
  await sleep(500);

  console.log('Smoke test passed.');
}

main().catch((err) => {
  console.error(err);
  killPort(PORT);
  process.exit(1);
});
