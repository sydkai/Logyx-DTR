const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'logyx-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
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
