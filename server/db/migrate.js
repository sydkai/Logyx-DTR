const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { runMigrations, closePool } = require('./database');

runMigrations()
  .then(() => {
    console.log('\n✓ Migrations complete.\n');
    return closePool();
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
