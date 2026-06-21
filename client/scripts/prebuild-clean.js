'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const releaseDir = path.join(__dirname, '..', 'release-build');

const PROCESS_NAMES = [
  'Logyx Daily Time Record.exe',
  'electron.exe',
];

function sleep(ms) {
  try {
    execSync(`powershell -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: 'ignore' });
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* wait */ }
  }
}

function killRunningApps() {
  for (const exe of PROCESS_NAMES) {
    try {
      execSync(`taskkill /F /IM "${exe}" /T`, { stdio: 'ignore', shell: true });
      console.log(`Stopped: ${exe}`);
    } catch {
      // not running
    }
  }
}

function clearFolder(dirPath, label) {
  if (!fs.existsSync(dirPath)) return;

  const stalePath = `${dirPath}.stale-${Date.now()}`;
  try {
    fs.renameSync(dirPath, stalePath);
    console.log(`Moved locked ${label} aside → ${path.basename(stalePath)}`);
  } catch (renameErr) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
      console.log(`Removed: ${label}`);
      return;
    } catch {
      throw new Error(
        `Could not clear ${label}.\n` +
        'Close Logyx DTR and any File Explorer window open on client\\release.\n' +
        'Then run the build again.\n' +
        `(${renameErr.message})`
      );
    }
  }

  try {
    fs.rmSync(stalePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
  } catch {
    console.log(`Note: old folder left at ${path.basename(stalePath)} (delete manually later)`);
  }
}

console.log('Cleaning before electron-builder...');
killRunningApps();
sleep(1000);
clearFolder(path.join(releaseDir, 'win-unpacked'), 'release/win-unpacked');
clearFolder(path.join(releaseDir, 'win-unpacked.tmp'), 'release/win-unpacked.tmp');

// Remove stale folders from previous builds
if (fs.existsSync(releaseDir)) {
  for (const entry of fs.readdirSync(releaseDir)) {
    if (entry.startsWith('win-unpacked.stale-')) {
      try {
        fs.rmSync(path.join(releaseDir, entry), { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}

console.log('Clean complete.');
