/**
 * middleware/error.middleware.js
 * ─────────────────────────────────────────────────────────────
 * Centralised error handling for the entire Express application.
 *
 * Why centralise errors?
 *   • Consistent JSON shape for every error response.
 *   • A single place to control what information leaks to clients.
 *   • Proper logging of every error with stack traces.
 *   • Stack traces visible in dev, hidden in production.
 *
 * Registration:
 *   This middleware MUST be registered AFTER all routes in app.js.
 *   Express identifies error middleware by its 4-parameter signature.
 * ─────────────────────────────────────────────────────────────
 */

const { sendError }  = require('../utils/response');
const logger         = require('../utils/logger');
const config         = require('../config/app.config');

// ── Known Multer error codes ───────────────────────────────────
const MULTER_ERRORS = {
  LIMIT_FILE_SIZE : {
    status  : 413,
    message : `File too large. Maximum allowed size is ${(config.upload.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB.`,
    code    : 'FILE_TOO_LARGE',
  },
  LIMIT_FILE_COUNT: {
    status  : 400,
    message : 'Only one file can be uploaded per request.',
    code    : 'TOO_MANY_FILES',
  },
  LIMIT_UNEXPECTED_FILE: {
    status  : 400,
    message : 'Unexpected file field in request. Use the field name "audio".',
    code    : 'WRONG_FIELD_NAME',
  },
};

// ── 404 Handler ────────────────────────────────────────────────
/**
 * Catches requests that didn't match any route and returns a 404.
 * Register this BEFORE the error handler but AFTER all routes.
 */
function notFoundHandler(req, res, _next) {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  return sendError(res, {
    status  : 404,
    message : `Route not found: ${req.method} ${req.originalUrl}`,
    code    : 'NOT_FOUND',
  });
}

// ── Global Error Handler ───────────────────────────────────────
/**
 * Catches every error passed via next(err) or thrown in async routes.
 * Express requires exactly 4 parameters (err, req, res, next).
 *
 * @param {Error}  err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next  // must stay even if unused
 */
// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  // ── 1. Log the full error (always) ──────────────────────────
  logger.error(`${err.message || 'Unknown error'}`, {
    method      : req.method,
    url         : req.originalUrl,
    ip          : req.ip,
    errorCode   : err.code,
    stack       : config.server.isProduction ? '[hidden in production]' : err.stack,
  });

  // ── 2. Handle Multer-specific errors ────────────────────────
  if (err.name === 'MulterError') {
    const known = MULTER_ERRORS[err.code];
    if (known) {
      return sendError(res, known);
    }
    return sendError(res, {
      status  : 400,
      message : `File upload error: ${err.message}`,
      code    : err.code || 'UPLOAD_ERROR',
    });
  }

  // ── 3. Handle our custom INVALID_FILE_TYPE error ─────────────
  if (err.code === 'INVALID_FILE_TYPE') {
    return sendError(res, {
      status  : err.status || 415,
      message : err.message,
      code    : 'INVALID_FILE_TYPE',
    });
  }

  // ── 4. Handle validation errors from middleware ───────────────
  if (err.code === 'VALIDATION_ERROR') {
    return sendError(res, {
      status  : 400,
      message : err.message,
      code    : 'VALIDATION_ERROR',
      details : err.details || null,
    });
  }

  // ── 5. Generic fallback ───────────────────────────────────────
  const status = err.status || err.statusCode || 500;
  const message = config.server.isProduction
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal Server Error';

  return sendError(res, {
    status,
    message,
    code    : err.code || 'INTERNAL_ERROR',
    // Only include stack trace in development
    details : config.server.isProduction ? null : err.stack,
  });
}

module.exports = { notFoundHandler, globalErrorHandler };
