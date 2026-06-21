const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const { login } = require('../controllers/authController');
const { closePool } = require('../db/database');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

async function main() {
  const req = {
    body: {
      email: 'admin@magallonesgroup.com',
      password: 'naba6819',
    },
  };
  const res = mockRes();
  await login(req, res);

  const ok = res.statusCode === 200 && res.body?.token && res.body?.admin?.role === 'superadmin';
  console.log('HTTP status:', res.statusCode);
  console.log('Login controller:', ok ? 'PASS' : 'FAIL');
  if (!ok) console.log('Response:', res.body);
  await closePool();
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
