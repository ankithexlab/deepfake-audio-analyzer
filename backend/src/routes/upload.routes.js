/**
 * routes/upload.routes.js
 * ─────────────────────────────────────────────────────────────
 * Route definitions for file upload operations.
 *
 * Middleware chain for POST /upload:
 *   1. upload.single('audio')  — Multer saves file, checks MIME + size
 *   2. validateAudioUpload     — Confirms file present + extension valid
 *   3. uploadAudio             — Controller: stores metadata, responds
 * ─────────────────────────────────────────────────────────────
 */

const express  = require('express');
const router   = express.Router();

const multerUpload   = require('../config/multer.config');
const { validateAudioUpload, validateUuidParam } = require('../middleware/validate.middleware');
const { uploadAudio, deleteUpload, listUploads } = require('../controllers/upload.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const config = require('../config/app.config');

// Require authentication for all file upload operations
router.use(requireAuth);

// ── POST /api/v1/upload ────────────────────────────────────────
// Accept a single audio file in the "audio" multipart field
router.post(
  '/',
  multerUpload.single('audio'),  // Field name expected from the client
  validateAudioUpload,
  uploadAudio
);

// ── DELETE /api/v1/upload/:fileId ──────────────────────────────
router.delete(
  '/:fileId',
  validateUuidParam('fileId'),
  deleteUpload
);

// ── GET /api/v1/upload (list all — disabled in production) ─────
if (!config.server.isProduction) {
  router.get('/', listUploads);
}

module.exports = router;
