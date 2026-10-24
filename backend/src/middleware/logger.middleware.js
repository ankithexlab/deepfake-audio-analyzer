/**
 * middleware/logger.middleware.js
 * ─────────────────────────────────────────────────────────────
 * HTTP request / response logging middleware.
 *
 * Uses Morgan to capture each incoming request and writes the
 * log line through our Winston logger so everything ends up in
 * the same log files.
 *
 * Format:
 *   METHOD /path HTTP/x.x STATUS RESPONSE_TIME ms - BYTES b
 *
 * Example:
 *   POST /api/v1/upload HTTP/1.1 200 54.321 ms - 312 b
 * ─────────────────────────────────────────────────────────────
 */

const morgan = require('morgan');
const logger = require('../utils/logger');

/**
 * A Morgan stream adapter that pipes output into Winston.
 * We trim the trailing newline Morgan appends before handing
 * the string off to Winston.
 */
const stream = {
  write: (message) => {
    // 'http' is a custom Winston level (≥ 'verbose', < 'debug')
    // We fall back to 'info' because the default Winston config
    // does not add 'http'. Remove the trailing \n before logging.
    logger.info(message.trim());
  },
};

/**
 * Skip logging for health-check endpoints to keep logs clean in
 * production when orchestrators ping the service every few seconds.
 */
const skip = (req) => {
  const healthPaths = ['/api/v1/health', '/favicon.ico'];
  return healthPaths.includes(req.url);
};

// Morgan format: combined (Apache-style) in production, dev in development
const format =
  process.env.NODE_ENV === 'production'
    ? 'combined'
    : ':method :url HTTP/:http-version :status :response-time ms - :res[content-length] b';

const requestLogger = morgan(format, { stream, skip });

module.exports = requestLogger;
