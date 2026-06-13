const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb }      = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const TOKEN_TTL = '8h';

function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const db    = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE email = ? AND is_active = 1').get(email.trim().toLowerCase());

  if (!admin || !bcrypt.compareSync(password, admin.password_hash))
    return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );

  res.json({
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }
  });
}

function me(req, res) {
  // req.admin is set by requireAuth middleware
  const db    = getDb();
  const admin = db.prepare('SELECT id, email, name, role FROM admins WHERE id = ?').get(req.admin.id);
  if (!admin) return res.status(404).json({ error: 'Admin not found.' });
  res.json(admin);
}

function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'current_password and new_password are required.' });
  if (new_password.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });

  const db    = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!bcrypt.compareSync(current_password, admin.password_hash))
    return res.status(401).json({ error: 'Current password is incorrect.' });

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, req.admin.id);
  res.json({ message: 'Password updated successfully.' });
}

module.exports = { login, me, changePassword };
