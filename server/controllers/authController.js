'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { getDb }      = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

const TOKEN_TTL = '8h';

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const db = getDb();

    // ✅ No await — SQLite wrapper is synchronous
    // ✅ Use LOWER() on both sides so case never matters
    const { rows } = db.query(
      `SELECT * FROM admins WHERE LOWER(email) = LOWER(?) AND is_active = 1`,
      [email.trim()]
    );
    const admin = rows[0];

    if (!admin || !bcrypt.compareSync(password, admin.password_hash))
      return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL }
    );

    res.json({
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (err) {
    console.error('[login error]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function me(req, res) {
  try {
    const db = getDb();
    const { rows } = db.query(
      'SELECT id, email, name, role FROM admins WHERE id = ?',
      [req.admin.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Admin not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[me error]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

async function changePassword(req, res) {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password)
      return res.status(400).json({ error: 'current_password and new_password are required.' });
    if (new_password.length < 8)
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const db = getDb();
    const { rows } = db.query('SELECT * FROM admins WHERE id = ?', [req.admin.id]);
    const admin = rows[0];

    if (!bcrypt.compareSync(current_password, admin.password_hash))
      return res.status(401).json({ error: 'Current password is incorrect.' });

    const hash = bcrypt.hashSync(new_password, 10);
    db.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, req.admin.id]);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[changePassword error]', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { login, me, changePassword };