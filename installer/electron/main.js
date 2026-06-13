const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let serverProcess;
const fs = require('fs');

function logTo_file(level, msg) {
  try {
    const logDir = path.join(app.getPath('userData'));
    const logFile = path.join(logDir, 'logyx-error.log');
    const line = new Date().toISOString() + ' [' + level + '] ' + msg + '\n';
    fs.appendFileSync(logFile, line);
    console.log('[' + level + ']', msg);
  } catch (e) {
    console.log('[' + level + ']', msg);
  }
}

function findAppRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'server', 'index.js'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(__dirname, '..');
}
const APP_DIR = findAppRoot(__dirname);
const isDev = !fs.existsSync(path.join(APP_DIR, 'nodejs'));

const SERVER_PORT = 3001;

function getNodePath() {
  if (isDev) return 'node';
  return path.join(APP_DIR, 'nodejs', 'node.exe');
}

function getServerPath() {
  return path.join(APP_DIR, 'server', 'index.js');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const nodePath = getNodePath();
    const serverPath = getServerPath();
    const cwd = APP_DIR;

    serverProcess = spawn(nodePath, [serverPath], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });

    const timeout = setTimeout(() => {
      reject(new Error('Server startup timed out'));
    }, 30000);

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[server]', msg.trim());
      if (msg.includes('LOGYX Server running')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[server:err]', data.toString().trim());
    });

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(APP_DIR, 'app.ico'),
    title: 'Logyx DTR',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  mainWindow.webContents.openDevTools({ mode: 'detach' });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[renderer:${level}]`, message);
    try {
      const logFile = path.join(app.getPath('userData'), 'logyx-renderer.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] [level=${level}] ${message}\n`);
    } catch (e) {}
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[LOAD FAIL]', errorCode, errorDescription, validatedURL);
    try {
      const logFile = path.join(app.getPath('userData'), 'logyx-renderer.log');
      fs.appendFileSync(logFile, `[${new Date().toISOString()}] [LOAD FAIL] ${errorCode}: ${errorDescription} → ${validatedURL}\n`);
    } catch (e) {}
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    console.log('Starting server...');
    await startServer();
    console.log('Server ready, creating window...');
    createWindow();
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  stopServer();
  app.quit();
});

app.on('before-quit', () => {
  stopServer();
});
