/**
 * utils/fileHelper.js
 * ─────────────────────────────────────────────────────────────
 * Pure utility functions for working with uploaded audio files.
 * No side-effects; everything is synchronous or returns a value.
 * ─────────────────────────────────────────────────────────────
 */

const path   = require('path');
const fs     = require('fs');
const config = require('../config/app.config');

// ── MIME / Extension helpers ───────────────────────────────────

/**
 * Human-readable MIME-type → format label mapping.
 * Used in API responses so the frontend gets "FLAC" not "audio/x-flac".
 */
const MIME_TO_FORMAT = {
  'audio/wav'   : 'WAV',
  'audio/x-wav' : 'WAV',
  'audio/mpeg'  : 'MP3',
  'audio/flac'  : 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/ogg'   : 'OGG',
};

/**
 * Returns a friendly format string from a MIME type.
 * Falls back to the raw MIME string if not mapped.
 *
 * @param {string} mimeType
 * @returns {string}
 */
function getFormatLabel(mimeType) {
  return MIME_TO_FORMAT[mimeType] || mimeType;
}

/**
 * Returns true if the MIME type is in the configured allow-list.
 *
 * @param {string} mimeType
 * @returns {boolean}
 */
function isMimeTypeAllowed(mimeType) {
  return config.upload.allowedMimeTypes.includes(mimeType);
}

// ── Size helpers ───────────────────────────────────────────────

/**
 * Formats a byte count into a human-readable string.
 * Examples: 1024 → "1.0 KB", 1048576 → "1.0 MB"
 *
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i     = Math.floor(Math.log(bytes) / Math.log(1024));
  const size  = (bytes / Math.pow(1024, i)).toFixed(1);
  return `${size} ${units[i]}`;
}

// ── File system helpers ────────────────────────────────────────

/**
 * Safely deletes a file from disk.
 * Logs a warning (not an error) if the file doesn't exist.
 *
 * @param {string} filePath - Absolute path to the file
 * @returns {{ deleted: boolean, reason?: string }}
 */
function safeDeleteFile(filePath) {
  try {
    fs.unlinkSync(filePath);
    return { deleted: true };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { deleted: false, reason: 'File not found' };
    }
    throw err; // Re-throw unexpected errors
  }
}

/**
 * Builds a structured file info object from a Multer file object.
 * This is the canonical shape stored in memory / returned in APIs.
 *
 * @param {Express.Multer.File} multerFile
 * @returns {FileInfo}
 *
 * @typedef {Object} FileInfo
 * @property {string} fileId        - UUID extracted from the saved filename
 * @property {string} originalName  - Original filename provided by the user
 * @property {string} mimeType      - Detected MIME type
 * @property {string} format        - Human-readable format label (WAV, MP3 …)
 * @property {number} sizeBytes     - File size in bytes
 * @property {string} sizeHuman     - Human-readable size string
 * @property {string} savedPath     - Absolute path on disk
 * @property {string} savedFilename - UUID-based filename on disk
 */
function buildFileInfo(multerFile) {
  const ext    = path.extname(multerFile.filename);
  const fileId = path.basename(multerFile.filename, ext); // the UUID part

  return {
    fileId       : fileId,
    originalName : multerFile.originalname,
    mimeType     : multerFile.mimetype,
    format       : getFormatLabel(multerFile.mimetype),
    sizeBytes    : multerFile.size,
    sizeHuman    : formatFileSize(multerFile.size),
    savedPath    : multerFile.path,
    savedFilename: multerFile.filename,
  };
}

module.exports = {
  getFormatLabel,
  isMimeTypeAllowed,
  formatFileSize,
  safeDeleteFile,
  buildFileInfo,
};
