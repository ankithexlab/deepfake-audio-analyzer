/**
 * controllers/auth.controller.js
 * ─────────────────────────────────────────────────────────────
 * User Authentication Controller (Signup, Login, Guest Demo).
 * Member 2: Backend & Database (Ashu)
 * ─────────────────────────────────────────────────────────────
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db.config');
const { sendSuccess, sendError } = require('../utils/response');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const logger = require('../utils/logger');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a JWT token for a given user id and email.
 */
function generateToken(userId, email, role) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /api/v1/auth/signup
 */
async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return sendError(res, {
        status: 400,
        message: 'Name, email, and password are required.',
        code: 'VALIDATION_ERROR',
      });
    }

    if (password.length < 6) {
      return sendError(res, {
        status: 400,
        message: 'Password must be at least 6 characters long.',
        code: 'WEAK_PASSWORD',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return sendError(res, {
        status: 409,
        message: 'An account with this email address already exists.',
        code: 'EMAIL_ALREADY_EXISTS',
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), normalizedEmail, passwordHash]
    );

    const newUser = result.rows[0];
    const token = generateToken(newUser.id, newUser.email, newUser.role);

    logger.info(`User registered: ${newUser.email} (ID: ${newUser.id})`);

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, status, ip_address, details)
       VALUES ($1, 'USER_SIGNUP', 'SUCCESS', $2, $3)`,
      [newUser.id, req.ip, JSON.stringify({ email: newUser.email })]
    );

    return sendSuccess(res, {
      status: 201,
      message: 'Account created successfully.',
      data: {
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.created_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, {
        status: 400,
        message: 'Email and password are required.',
        code: 'CREDENTIALS_REQUIRED',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const result = await db.query(
      'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return sendError(res, {
        status: 401,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return sendError(res, {
        status: 401,
        message: 'Invalid email or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const token = generateToken(user.id, user.email, user.role);
    logger.info(`User logged in: ${user.email}`);

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, status, ip_address, details)
       VALUES ($1, 'USER_LOGIN', 'SUCCESS', $2, $3)`,
      [user.id, req.ip, JSON.stringify({ email: user.email })]
    );

    return sendSuccess(res, {
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.created_at,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/guest
 * Instant Guest / Examiner Login for viva demonstration without manual registration.
 */
async function guestLogin(req, res, next) {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, created_at FROM users WHERE email = 'demo@aura.ai'"
    );

    let user;
    if (result.rows.length > 0) {
      user = result.rows[0];
      if (user.role !== 'guest') {
        user.role = 'guest';
        await db.query(
          "UPDATE users SET role = 'guest', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [user.id]
        );
      }
    } else {
      const hashedPw = await bcrypt.hash('password123', 10);
      const inserted = await db.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Guest Examiner', 'demo@aura.ai', $1, 'guest')
         RETURNING id, name, email, role, created_at`,
        [hashedPw]
      );
      user = inserted.rows[0];
    }

    const token = generateToken(user.id, user.email, 'guest');

    return sendSuccess(res, {
      message: 'Guest demo session activated.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'guest',
          isGuest: true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 */
async function getProfile(req, res, next) {
  try {
    return sendSuccess(res, {
      message: 'User profile retrieved.',
      data: {
        user: req.user,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  signup,
  login,
  guestLogin,
  getProfile,
};
