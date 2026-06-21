const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

const paths = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'logyx', 'logyx.db'),
  path.join(__dirname, 'logyx.db'),
  path.join(__dirname, '..', 'logyx.db'),
  path.join(__dirname, '..', 'server', 'logyx.db'),
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    console.log('FOUND DB:', p);
    const db = new Database(p);
    const admins = db.prepare('SELECT email, role, is_active FROM admins').all();
    console.log('Admins:', JSON.stringify(admins, null, 2));
    db.close();
  } else {
    console.log('NOT FOUND:', p);
  }
}