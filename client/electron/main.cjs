'use strict';

const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const SERVER_PORT = 3001;

let serverProcess = null;

const USER_DATA = path.join(process.env.APPDATA || app.getPath('home'), 'Logyx DTR');
app.setPath('userData', USER_DATA);

function getBundledDbPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'data', 'logyx.db');
  }
  return path.join(__dirname, '../../data/logyx.db');
}

function ensureUserDatabase() {
  fs.mkdirSync(USER_DATA, { recursive: true });
  const targetDb = path.join(USER_DATA, 'logyx.db');
  if (!fs.existsSync(targetDb)) {
    const bundledDb = getBundledDbPath();
    if (fs.existsSync(bundledDb)) {
      fs.copyFileSync(bundledDb, targetDb);
    }
  }
  return USER_DATA;
}

function startServer(userDataPath) {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'index.js')
    : path.join(__dirname, '../../server/index.js');

  const serverCwd = app.isPackaged
    ? path.join(process.resourcesPath, 'server')
    : path.join(__dirname, '../../server');

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: serverCwd,
    env: {
      ...process.env,
      PORT: String(SERVER_PORT),
      HOST: '127.0.0.1',
      ELECTRON_RUN_AS_NODE: '1',
      USER_DATA_PATH: userDataPath,
      JWT_SECRET: process.env.JWT_SECRET || 'logyx-dev-secret-change-in-production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve(), 8000);

    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      process.stdout.write(`[Server] ${msg}`);
      if (msg.includes('LOGYX_SERVER_READY')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on('data', (d) => {
      process.stderr.write(`[Server ERR] ${d}`);
    });

    serverProcess.on('error', reject);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Logyx Daily Time Record',
    icon: path.join(__dirname, '../public/icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.on('page-title-updated', (e) => e.preventDefault());

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
  }
}

app.whenReady().then(async () => {
  try {
    const userDataPath = ensureUserDatabase();
    await startServer(userDataPath);
    createWindow();
  } catch (err) {
    dialog.showErrorBox('Logyx DTR — Startup Error', err.message || String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});
