/**
 * app.config.js
 * ─────────────────────────────────────────────────────────────
 * Central configuration module.
 * All runtime settings are sourced from process.env (populated
 * by dotenv in server.js before this module is ever required).
 *
 * Adding a new env variable? → Add it here AND to .env.example.
 * ─────────────────────────────────────────────────────────────
 */

const path = require('path');

// ── Helpers ────────────────────────────────────────────────────

/**
 * Parse a comma-separated env string into a trimmed string array.
 * Falls back to `defaultValue` when the variable is absent.
 */
function parseList(value, defaultValue = []) {
  if (!value) return defaultValue;
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse an integer env value with a fallback.
 */
function parseIntEnv(value, defaultValue) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

// ── Config Object ──────────────────────────────────────────────

const config = {
  // ── Server ────────────────────────────────────────────────────
  server: {
    port: parseIntEnv(process.env.PORT, 5000),
    env: process.env.NODE_ENV || 'development',
    isProduction: (process.env.NODE_ENV || 'development') === 'production',
  },

  // ── File Upload ───────────────────────────────────────────────
  upload: {
    /** Absolute path to the uploads directory */
    dir: path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads'),

    /** Maximum allowed file size in bytes (default: 50 MB) */
    maxFileSizeBytes: parseIntEnv(process.env.MAX_FILE_SIZE, 50 * 1024 * 1024),

    /** MIME types accepted by the API */
    allowedMimeTypes: parseList(process.env.ALLOWED_MIME_TYPES, [
      'audio/wav',
      'audio/x-wav',
      'audio/mpeg',       // MP3
      'audio/mp3',
      'audio/flac',
      'audio/x-flac',
      'audio/ogg',
    ]),

    /** File extensions mapped from allowed MIME types (for quick display) */
    allowedExtensions: ['.wav', '.mp3', '.flac', '.ogg'],
  },

  // ── Logging ───────────────────────────────────────────────────
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: path.resolve(__dirname, '../../', process.env.LOG_DIR || 'logs'),
  },

  // ── Rate Limiting ─────────────────────────────────────────────
  rateLimit: {
    /** Number of requests allowed per window per IP */
    max: parseIntEnv(process.env.RATE_LIMIT_MAX, 100),

    /** Window duration in milliseconds (default: 15 minutes) */
    windowMs: parseIntEnv(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  },

  // ── CORS ──────────────────────────────────────────────────────
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // ── AI Model ───────────────────────────────────────────────────
  ai: {
    /** Active model type: 'mock' | 'cnn' | 'lstm' | 'transformer' */
    modelType: process.env.AI_MODEL_TYPE || 'mock',

    /** Optional path to trained model weights file (.pt, .h5, .onnx) */
    modelPath: process.env.AI_MODEL_PATH || null,

    modelUrl: process.env.AI_MODEL_URL || null,
    apiKey: process.env.AI_MODEL_API_KEY || null,
    timeoutMs: parseIntEnv(process.env.AI_MODEL_TIMEOUT_MS, 30_000),
  },
};

module.exports = config;
