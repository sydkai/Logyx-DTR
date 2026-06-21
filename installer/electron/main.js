'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Windows: prevent "Render process gone: crashed" (GPU driver issues in Electron).
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');

const SERVER_PORT = 3001;
const INSTALL_ROOT = path.resolve(__dirname, '..');
const SERVER_DIR = path.join(INSTALL_ROOT, 'server');
const SERVER_ENTRY = path.join(SERVER_DIR, 'index.js');
const NODE_BIN = path.join(INSTALL_ROOT, 'nodejs', 'node.exe');
const BUNDLED_DB = path.join(INSTALL_ROOT, 'data', 'logyx.db');
const CLIENT_DIST = path.join(INSTALL_ROOT, 'client', 'dist');
const APP_URL = `http://127.0.0.1:${SERVER_PORT}/#/scanner`;

let mainWindow = null;
let serverProcess = null;
let reloadAttempts = 0;

const USER_DATA = path.join(process.env.APPDATA || app.getPath('home'), 'Logyx DTR');
app.setPath('userData', USER_DATA);

function log(level, msg) {
  const line = `${new Date().toISOString()} [${level}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(USER_DATA, 'logyx-main.log'), line + '\n');
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

    log('INFO', `Starting standalone server (node ${execNodeVersion()})`);

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
      const detail = stderrBuf.trim();
      fail(detail ? `Server startup timed out after 30 s.\n\n${detail}` : 'Server startup timed out after 30 s');
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
      const detail = stderrBuf.trim();
      if (code !== 0) {
        fail(detail
          ? `Server exited with code ${code}${signal ? ` (${signal})` : ''}.\n\n${detail}`
          : `Server exited with code ${code}${signal ? ` (${signal})` : ''}.`);
      }
    });
  });
}

function execNodeVersion() {
  try {
    const { execFileSync } = require('child_process');
    return execFileSync(NODE_BIN, ['-v'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function loadAppWindow() {
  log('INFO', `Loading ${APP_URL}`);
  mainWindow.loadURL(APP_URL);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(INSTALL_ROOT, 'app.ico'),
    title: 'Logyx DTR',
    backgroundColor: '#0a0c10',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  loadAppWindow();

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) log('WARN', `[browser:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    log('ERROR', `Page failed to load: ${code} ${desc} — ${url}`);
  });

  mainWindow.webContents.on('render-process-gone', async (_event, details) => {
    log('ERROR', `Render process gone: ${details.reason}`);
    if (reloadAttempts < 2) {
      reloadAttempts += 1;
      log('INFO', `Reloading UI (attempt ${reloadAttempts})…`);
      setTimeout(() => loadAppWindow(), 500);
      return;
    }
    await dialog.showMessageBox({
      type: 'error',
      title: 'Logyx DTR — Display Error',
      message: 'The application window crashed.',
      detail: `Reason: ${details.reason}\n\nTry restarting the app. If this keeps happening, contact support.`,
      buttons: ['OK'],
    });
    app.quit();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const ok = url.startsWith(`http://127.0.0.1:${SERVER_PORT}`)
      || url.startsWith(`http://localhost:${SERVER_PORT}`);
    if (!ok) event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function showFatalError(message) {
  await dialog.showMessageBox({
    type: 'error',
    title: 'Logyx DTR — Startup Error',
    message: 'The application could not start.',
    detail: message,
    buttons: ['OK'],
  });
  app.quit();
}

app.whenReady().then(async () => {
  log('INFO', '=== Logyx DTR standalone ===');
  try {
    const userDataPath = ensureUserDatabase();
    await startServer(userDataPath);
    createWindow();
  } catch (err) {
    await showFatalError(err.message || String(err));
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
