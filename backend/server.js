/**
 * server.js
 * ─────────────────────────────────────────────────────────────
 * Application entry point.
 *
 * Responsibilities:
 *   1. Load environment variables (MUST happen before any other
 *      require so config modules see the env values)
 *   2. Ensure required directories exist (uploads, logs)
 *   3. Start the HTTP server
 *   4. Handle graceful shutdown on SIGTERM / SIGINT
 *
 * Why separate from app.js?
 *   Tests import app.js without starting a server.
 *   This file is only run via `node server.js`.
 * ─────────────────────────────────────────────────────────────
 */

// ── Step 1: Load .env BEFORE any other require ────────────────
require('dotenv').config();

// ── Step 2: Import app and utilities ──────────────────────────
const fs            = require('fs');
const http          = require('http');
const app           = require('./src/app');
const config        = require('./src/config/app.config');
const logger        = require('./src/utils/logger');
const db            = require('./src/config/db.config');
const uploadService = require('./src/services/upload.service');

// ── Step 3: Ensure required runtime directories exist ─────────
[config.upload.dir, config.logging.dir].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
  logger.info(`Directory ready: ${dir}`);
});

// ── Step 4: Create HTTP server ────────────────────────────────
const server = http.createServer(app);

// ── Step 5: Start listening after DB initialization ────────────
async function startServer() {
  try {
    await db.initDatabase();
    await uploadService.syncFromDatabase();
  } catch (dbErr) {
    logger.error('PostgreSQL database warning: continuing with fallback', { error: dbErr.message });
  }

  server.listen(config.server.port, () => {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('  Deepfake Audio Detector — Backend API');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`  Environment : ${config.server.env}`);
    logger.info(`  Port        : ${config.server.port}`);
    logger.info(`  Health      : http://localhost:${config.server.port}/api/v1/health`);
    logger.info(`  Upload      : POST http://localhost:${config.server.port}/api/v1/upload`);
    logger.info(`  Upload dir  : ${config.upload.dir}`);
    logger.info(`  Max size    : ${(config.upload.maxFileSizeBytes / 1024 / 1024).toFixed(0)} MB`);
    logger.info(`  Allowed     : ${config.upload.allowedExtensions.join(', ')}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });
}

startServer();

// ── Step 6: Graceful Shutdown ─────────────────────────────────
/**
 * On SIGTERM (Docker stop, Kubernetes pod eviction, etc.):
 *   1. Stop accepting new connections
 *   2. Wait for in-flight requests to finish
 *   3. Exit cleanly
 *
 * This prevents "connection reset" errors for active clients.
 */
function gracefulShutdown(signal) {
  logger.info(`${signal} received — starting graceful shutdown…`);

  server.close((err) => {
    if (err) {
      logger.error('Error during shutdown', { err: err.message });
      process.exit(1);
    }
    logger.info('All connections closed. Server stopped.');
    process.exit(0);
  });

  // Force exit after 10 seconds if connections won't close
  setTimeout(() => {
    logger.warn('Forced shutdown after 10s timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// ── Step 7: Catch unhandled promise rejections ────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection', { reason: String(reason) });
  // In production you might want to exit here and let the
  // orchestrator restart the process.
});
