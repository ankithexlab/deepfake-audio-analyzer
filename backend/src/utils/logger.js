/**
 * utils/logger.js
 * ─────────────────────────────────────────────────────────────
 * Application-wide Winston logger.
 *
 * Transports:
 *  • Console  — coloured, human-readable (always active)
 *  • File     — combined.log  (all levels ≥ LOG_LEVEL)
 *  • File     — error.log     (only ERROR level)
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started', { port: 5000 });
 *   logger.error('Something broke', { err: error.message });
 * ─────────────────────────────────────────────────────────────
 */

const winston = require('winston');
const path    = require('path');
const fs      = require('fs');
const config  = require('../config/app.config');

// Ensure the log directory exists before Winston tries to write to it
fs.mkdirSync(config.logging.dir, { recursive: true });

// ── Custom format ──────────────────────────────────────────────
// Timestamp + level + message + any extra metadata as JSON
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),   // include stack trace on error objects
  winston.format.splat(),                   // support printf-style %s formatting
  winston.format.json()                     // write as JSON lines
);

// ── Console format (pretty for dev) ───────────────────────────
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Print metadata inline if present, but skip large objects
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${extra}`;
  })
);

// ── Logger instance ────────────────────────────────────────────
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Always write to console
    new winston.transports.Console({ format: consoleFormat }),

    // combined.log — all levels
    new winston.transports.File({
      filename : path.join(config.logging.dir, 'combined.log'),
      maxsize  : 10 * 1024 * 1024,  // rotate at 10 MB
      maxFiles : 5,
    }),

    // error.log — errors only (easier monitoring)
    new winston.transports.File({
      filename : path.join(config.logging.dir, 'error.log'),
      level    : 'error',
      maxsize  : 5 * 1024 * 1024,
      maxFiles : 3,
    }),
  ],

  // Do not crash the process on uncaught exceptions — log them instead
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'rejections.log'),
    }),
  ],
});

module.exports = logger;
