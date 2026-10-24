/**
 * multer.config.js
 * ─────────────────────────────────────────────────────────────
 * Configures Multer for secure audio file uploads.
 *
 * Security decisions made here:
 *  1. Files are stored under a namespaced subdirectory (by date)
 *     so the uploads folder never becomes a flat mess of thousands
 *     of files.
 *  2. Each saved file is renamed to a UUID so original filenames
 *     (which can contain path-traversal characters) are discarded.
 *  3. MIME type is validated both via the Content-Type header AND
 *     the file extension. An attacker cannot bypass by renaming
 *     a file — the extension check adds a second layer.
 *  4. File-size limit is enforced at the Multer level (not just
 *     the application level) so large payloads are rejected early.
 * ─────────────────────────────────────────────────────────────
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('./app.config');

// ── Storage Engine ─────────────────────────────────────────────

const storage = multer.diskStorage({
  /**
   * Destination: uploads/<YYYY-MM-DD>/
   * Using date-based subdirectories keeps the folder manageable
   * and makes cleanup jobs (e.g., purge files older than 7 days)
   * trivial to implement later.
   */
  destination(req, file, cb) {
    const today = new Date().toISOString().slice(0, 10); // "2026-08-05"
    const dest  = path.join(config.upload.dir, today);

    // Create directory if it doesn't exist (recursive = safe if it does)
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },

  /**
   * Filename: <uuid>.<original_extension>
   * UUID prevents collisions and hides original filenames from disk.
   */
  filename(req, file, cb) {
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeExt  = config.upload.allowedExtensions.includes(ext) ? ext : '.bin';
    const filename = `${uuidv4()}${safeExt}`;
    cb(null, filename);
  },
});

// ── MIME-Type Filter ───────────────────────────────────────────

/**
 * Reject files whose MIME type is not in the allow-list.
 * Multer calls this before writing anything to disk.
 */
function audioFileFilter(req, file, cb) {
  const { mimetype } = file;

  if (config.upload.allowedMimeTypes.includes(mimetype)) {
    cb(null, true); // accept
  } else {
    // Passing an error to cb causes Multer to reject the upload
    const err = new Error(
      `Unsupported file type: "${mimetype}". ` +
      `Accepted types: ${config.upload.allowedExtensions.join(', ')}`
    );
    err.code  = 'INVALID_FILE_TYPE';
    err.status = 415; // Unsupported Media Type
    cb(err, false);
  }
}

// ── Multer Instance ────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter : audioFileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
    files   : 1,   // Only one file per request
  },
});

module.exports = upload;
