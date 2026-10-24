/**
 * middleware/validate.middleware.js
 * ─────────────────────────────────────────────────────────────
 * Request-level validation middleware factories.
 *
 * Each function here returns an Express middleware that validates
 * some aspect of the request and either calls next() to continue
 * or next(err) to hand off to the centralised error handler.
 *
 * Keeping validation in its own layer means controllers stay
 * clean and focused on business logic only.
 * ─────────────────────────────────────────────────────────────
 */

const path   = require('path');
const config = require('../config/app.config');
const logger = require('../utils/logger');

// ── Audio File Upload Validator ────────────────────────────────

/**
 * Validates that a file was actually attached to the request.
 * Multer has already checked MIME type and size at this point,
 * so we only need to confirm a file is present.
 *
 * Usage:
 *   router.post('/upload', upload.single('audio'), validateAudioUpload, controller)
 */
function validateAudioUpload(req, res, next) {
  // No file attached at all
  if (!req.file) {
    const err     = new Error('No audio file was attached to the request. Please include a file in the "audio" field.');
    err.code      = 'VALIDATION_ERROR';
    err.status    = 400;
    return next(err);
  }

  // Double-check extension matches an allowed one
  // (Multer already filtered by MIME, this is a second defensive check)
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!config.upload.allowedExtensions.includes(ext)) {
    const err  = new Error(
      `File extension "${ext}" is not supported. Allowed: ${config.upload.allowedExtensions.join(', ')}`
    );
    err.code   = 'VALIDATION_ERROR';
    err.status = 415;
    return next(err);
  }

  logger.info(`File validation passed: "${req.file.originalname}" (${req.file.mimetype}, ${req.file.size} bytes)`);
  return next();
}

// ── UUID param validator ───────────────────────────────────────

/**
 * Returns middleware that validates a route parameter is a valid UUID v4.
 *
 * Usage:
 *   router.get('/:fileId', validateUuidParam('fileId'), controller)
 *
 * @param {string} paramName - The route param name to validate
 */
function validateUuidParam(paramName) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return function (req, res, next) {
    const value = req.params[paramName];
    if (!value || !UUID_REGEX.test(value)) {
      const err  = new Error(`Invalid "${paramName}": must be a valid UUID v4.`);
      err.code   = 'VALIDATION_ERROR';
      err.status = 400;
      return next(err);
    }
    return next();
  };
}

module.exports = { validateAudioUpload, validateUuidParam };
