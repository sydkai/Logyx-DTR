'use strict';

/**
 * Logyx DTR standalone launcher (Inno Setup install).
 * Starts the bundled Node server, then opens the app in the default browser.
 * Avoids Electron, which can crash on some Windows GPU drivers.
 */
const { spawn, execFile } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const SERVER_PORT = 3001;
const INSTALL_ROOT = path.resolve(__dirname);
const SERVER_DIR = path.join(INSTALL_ROOT, 'server');
const SERVER_ENTRY = path.join(SERVER_DIR, 'index.js');
const NODE_BIN = path.join(INSTALL_ROOT, 'nodejs', 'node.exe');
const BUNDLED_DB = path.join(INSTALL_ROOT, 'data', 'logyx.db');
const CLIENT_DIST = path.join(INSTALL_ROOT, 'client', 'dist');
const APP_URL = `http://127.0.0.1:${SERVER_PORT}/#/scanner`;

const USER_DATA = path.join(process.env.APPDATA || path.join(require('os').homedir(), 'AppData', 'Roaming'), 'Logyx DTR');
const LOG_FILE = path.join(USER_DATA, 'logyx-main.log');

let serverProcess = null;

function log(level, msg) {
  const line = `${new Date().toISOString()} [${level}] ${msg}`;
  try {
    fs.mkdirSync(USER_DATA, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {}
}

function ensureUserDatabase() {
  fs.mkdirSync(USER_DATA, { recursive: true });
  const targetDb = path.join(USER_DATA, 'logyx.db');
  if (!fs.existsSync(targetDb)) {
    if (!fs.existsSync(BUNDLED_DB)) {
      throw new Error(`Bundled database not found at ${BUNDLED_DB}`);
    }
    fs.copyFileSync(BUNDLED_DB, targetDb);
    log('INFO', `Database copied to ${targetDb}`);
  }
  return USER_DATA;
}

function checkHealth(timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/health`, (res) => {
      res.resume();
      if (res.statusCode === 200) resolve();
      else reject(new Error(`health ${res.statusCode}`));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error('health timeout'));
    });
  });
}

function waitForHealth(maxMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      checkHealth(2000)
        .then(resolve)
        .catch(() => {
          if (Date.now() - start > maxMs) reject(new Error('Server startup timed out'));
          else setTimeout(poll, 400);
        });
    };
    poll();
  });
}

function startServer(userDataPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(SERVER_ENTRY) || !fs.existsSync(NODE_BIN)) {
      reject(new Error('Server files not found in installation folder.'));
      return;
    }
    if (!fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
      reject(new Error(`Client UI not found at ${CLIENT_DIST}`));
      return;
    }

    let nodeVer = 'unknown';
    try {
      nodeVer = require('child_process').execFileSync(NODE_BIN, ['-v'], { encoding: 'utf8' }).trim();
    } catch (_) {}
    log('INFO', `Starting standalone server (node ${nodeVer})`);

    let settled = false;
    let stderrBuf = '';

    const fail = (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error(message));
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };

    serverProcess = spawn(NODE_BIN, [SERVER_ENTRY], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        PORT: String(SERVER_PORT),
        HOST: '127.0.0.1',
        NODE_ENV: 'production',
        USER_DATA_PATH: userDataPath,
        CLIENT_DIST: CLIENT_DIST,
        JWT_SECRET: process.env.JWT_SECRET || 'logyx-dev-secret-change-in-production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const timeout = setTimeout(() => {
      fail(stderrBuf.trim() || 'Server startup timed out after 30 s');
    }, 30000);

    const handleLine = (line, stream) => {
      const msg = line.trim();
      if (!msg) return;
      log(stream === 'stderr' ? 'WARN' : 'INFO', `[server${stream === 'stderr' ? ':err' : ''}] ${msg}`);
      if (msg.includes('LOGYX_SERVER_READY')) succeed();
      if (/Boot failed:|ERR_DLOPEN_FAILED|was compiled against a different Node/i.test(msg)) fail(msg);
    };

    const bindStream = (stream, name) => {
      let buf = '';
      stream.on('data', (data) => {
        buf += data.toString();
        if (name === 'stderr') stderrBuf += data.toString();
        let idx;
        while ((idx = buf.indexOf('\n')) !== -1) {
          handleLine(buf.slice(0, idx), name);
          buf = buf.slice(idx + 1);
        }
      });
      stream.on('end', () => {
        if (buf.trim()) handleLine(buf, name);
      });
    };

    bindStream(serverProcess.stdout, 'stdout');
    bindStream(serverProcess.stderr, 'stderr');
    serverProcess.on('error', (err) => fail(err.message || String(err)));
    serverProcess.on('exit', (code, signal) => {
      if (settled) return;
      if (code !== 0) {
        fail(stderrBuf.trim() || `Server exited with code ${code}${signal ? ` (${signal})` : ''}`);
      }
    });
  });
}

function openBrowser() {
  log('INFO', `Opening browser: ${APP_URL}`);
  return new Promise((resolve, reject) => {
    execFile('cmd.exe', ['/c', 'start', '', APP_URL], { windowsHide: true }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function showError(message) {
  log('ERROR', message);
  try {
    execFile('mshta', [
      'javascript:alert("Logyx DTR could not start.\\n\\n' + message.replace(/"/g, '') + '");close()',
    ], { windowsHide: true });
  } catch (_) {}
}

async function main() {
  log('INFO', '=== Logyx DTR standalone (browser mode) ===');
  try {
    const userDataPath = ensureUserDatabase();

    let serverAlreadyRunning = false;
    try {
      await checkHealth(1500);
      serverAlreadyRunning = true;
      log('INFO', 'Server already running on port 3001');
    } catch (_) {
      await startServer(userDataPath);
      await waitForHealth(30000);
    }

    await openBrowser();

    if (!serverAlreadyRunning && serverProcess) {
      log('INFO', 'Server running — leave this process active (minimized).');
      serverProcess.on('exit', (code) => {
        log('WARN', `Server exited (code ${code})`);
        process.exit(code || 0);
      });
      // Keep launcher alive so the server child process stays up.
      setInterval(() => {}, 60000);
    } else {
      process.exit(0);
    }
  } catch (err) {
    showError(err.message || String(err));
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  if (serverProcess) serverProcess.kill('SIGTERM');
  process.exit(0);
});

main();
