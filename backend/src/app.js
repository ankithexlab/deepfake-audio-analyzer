/**
 * src/app.js
 * ─────────────────────────────────────────────────────────────
 * Express application factory.
 *
 * This module ONLY configures the Express app — it does NOT
 * start the server (that is server.js's job). This separation
 * makes the app easy to import in tests without binding a port.
 *
 * Middleware order matters in Express. The stack below is:
 *   1. Security headers  (helmet)
 *   2. Rate limiting     (express-rate-limit)
 *   3. CORS              (cors)
 *   4. Body parsers      (express.json / urlencoded)
 *   5. HTTP logger       (morgan → winston)
 *   6. API routes        (/api/v1/...)
 *   7. 404 handler       (after all routes)
 *   8. Global error      (must be last, 4-param signature)
 * ─────────────────────────────────────────────────────────────
 */

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

const config       = require('./config/app.config');
const apiRoutes    = require('./routes/index');
const requestLogger    = require('./middleware/logger.middleware');
const { notFoundHandler, globalErrorHandler } = require('./middleware/error.middleware');
const logger       = require('./utils/logger');

// ── Create App ─────────────────────────────────────────────────
const app = express();

// ── 1. Security Headers (helmet) ──────────────────────────────
// Adds ~12 HTTP headers that protect against common web vulnerabilities
// (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// ── 2. Rate Limiting ───────────────────────────────────────────
// Protects against brute-force and DDoS at the application level.
// Configured via config.rateLimit (driven by .env variables).
const limiter = rateLimit({
  windowMs : config.rateLimit.windowMs,
  max      : config.rateLimit.max,
  standardHeaders: true,   // Return RateLimit-* headers (RFC 6585)
  legacyHeaders  : false,   // Disable deprecated X-RateLimit-* headers
  message  : {
    success: false,
    message: 'Too many requests. Please try again later.',
    error  : { code: 'RATE_LIMIT_EXCEEDED' },
  },
  handler(req, res, next, options) {
    logger.warn(`Rate limit hit: ${req.ip} → ${req.originalUrl}`);
    res.status(429).json(options.message);
  },
});
app.use('/api', limiter); // Only apply to /api/* routes

// ── 3. CORS ────────────────────────────────────────────────────
app.use(cors({
  origin     : true, // Allow web clients (http://localhost:3000, http://localhost:5173)
  methods    : ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── 4. Body Parsers ────────────────────────────────────────────
// JSON body — limit 1mb to prevent large JSON payloads
app.use(express.json({ limit: '1mb' }));
// URL-encoded bodies (for form submissions if any)
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── 5. HTTP Request Logger ─────────────────────────────────────
app.use(requestLogger);

// ── 6. Static Files (uploads direct file / visualization access) ─
app.use('/uploads', express.static(config.upload.dir));

// ── 7. API Routes ──────────────────────────────────────────────
app.use('/api/v1', apiRoutes);

// ── 8. Root redirect (optional convenience) ───────────────────
app.get('/', (req, res) => {
  res.json({
    name   : 'Deepfake Audio Detector API',
    version: '1.0.0',
    docs   : '/api/v1/health',
  });
});

// ── 9. 404 Handler ────────────────────────────────────────────
// Catches unmatched routes — must come after all route definitions
app.use(notFoundHandler);

// ── 10. Global Error Handler ───────────────────────────────────
// Must be LAST — Express detects this by the 4-param signature
app.use(globalErrorHandler);

module.exports = app;
