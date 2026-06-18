const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logyx-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Sign in required. No session token found.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Sign in required. Session token is missing.' });
  }
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
}

function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireSuperAdmin, JWT_SECRET };
