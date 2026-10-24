
/**
 * middleware/auth.middleware.js
 * ─────────────────────────────────────────────────────────────
 * JWT Authentication & Authorization Middleware.
 * Member 2: Backend & Database (Ashu)
 * ─────────────────────────────────────────────────────────────
 */

const jwt = require('jsonwebtoken');
const db = require('../config/db.config');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

// JWT secret must be configured in environment variables.
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || !JWT_SECRET.trim()) {
  throw new Error('JWT_SECRET is required in environment variables');
}

/**
 * Extracts and verifies JWT from the Authorization header or query parameter.
 * Enforces authentication — returns 401 if missing or invalid.
 */
async function requireAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return sendError(res, {
      status: 401,
      message: 'Access denied. No authentication token provided.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Look up user in PostgreSQL.
    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, {
        status: 401,
        message: 'Invalid session. User no longer exists.',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = result.rows[0];
    return next();
  } catch (err) {
    logger.warn('JWT verification failed', { error: err.message });

    return sendError(res, {
      status: 401,
      message: 'Invalid or expired authentication token.',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
}

/**
 * Optional authentication: if token is present and valid, attaches req.user.
 * If token is missing or invalid, proceeds as a Guest user.
 */
async function optionalAuth(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    req.user = result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    req.user = null;
  }

  return next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  JWT_SECRET,
};
