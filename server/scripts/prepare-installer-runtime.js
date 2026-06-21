'use strict';

/**
 * Ensures installer/nodejs/node.exe matches the Node version used to build
 * native modules (better-sqlite3). Run before Inno Setup compile.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const rootDir = path.join(__dirname, '..', '..');
const serverDir = path.join(__dirname, '..');
const bundledNode = path.join(rootDir, 'installer', 'nodejs', 'node.exe');
const buildNode = process.execPath;

function nodeAbi(exe) {
  return execFileSync(exe, ['-p', 'process.versions.modules'], { encoding: 'utf8' }).trim();
}

if (!fs.existsSync(bundledNode)) {
  console.error('✖ Bundled node.exe not found:', bundledNode);
  process.exit(1);
}

const buildAbi = nodeAbi(buildNode);
const bundledAbi = nodeAbi(bundledNode);

if (buildAbi !== bundledAbi) {
  console.log(`↻ Syncing bundled node.exe (ABI ${bundledAbi} → ${buildAbi}, ${process.version})`);
  fs.copyFileSync(buildNode, bundledNode);
} else {
  console.log(`✔ Bundled Node ABI ${bundledAbi} matches build Node (${process.version})`);
}

const bundledVersion = execFileSync(bundledNode, ['-v'], { encoding: 'utf8' }).trim();
fs.writeFileSync(
  path.join(rootDir, 'installer', 'nodejs', 'VERSION.txt'),
  `${bundledVersion} (ABI ${nodeAbi(bundledNode)})\n`,
  'utf8'
);
console.log(`✔ Bundled node: ${bundledVersion}`);

console.log('↻ Rebuilding better-sqlite3 for bundled Node…');
try {
  execSync('npm rebuild better-sqlite3', { cwd: serverDir, stdio: 'inherit' });
} catch (err) {
  console.error('✖ npm rebuild better-sqlite3 failed');
  process.exit(1);
}

try {
  execFileSync(bundledNode, ['-e', "require('better-sqlite3')"], {
    cwd: serverDir,
    stdio: 'pipe',
  });
  console.log('✔ better-sqlite3 loads with bundled node.exe');
} catch (err) {
  const msg = err.stderr?.toString() || err.message || String(err);
  console.error('✖ better-sqlite3 failed with bundled node.exe');
  console.error(msg.trim());
  process.exit(1);
}
