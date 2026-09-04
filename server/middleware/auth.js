const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * JWT authentication middleware.
 * @param {boolean} required - If true (default), returns 401 when no token.
 *                             If false, sets req.user = null and passes through.
 */
function auth(required = true) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (!required) { req.user = null; return next(); }
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/**
 * Role-based access guard. Must be used AFTER auth().
 * Usage: requireRole('officer', 'admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}

module.exports = { auth, requireRole };
