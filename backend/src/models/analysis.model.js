/**
 * models/analysis.model.js
 * ─────────────────────────────────────────────────────────────
 * Data shape definitions for analysis results.
 *
 * Currently this file acts as a schema-documentation layer and
 * provides factory functions for creating properly shaped objects.
 *
 * When you introduce a database (MongoDB / PostgreSQL):
 *   • MongoDB  → Replace with a Mongoose Schema
 *   • Postgres → Replace with a Sequelize Model or Drizzle table
 *
 * The rest of the application should NOT change.
 * ─────────────────────────────────────────────────────────────
 */

// ── Status Constants ───────────────────────────────────────────

/**
 * All possible states an analysis record can be in.
 * Use these constants everywhere — never hard-code strings.
 */
const ANALYSIS_STATUS = Object.freeze({
  PENDING    : 'pending',     // Uploaded, waiting to be processed
  PROCESSING : 'processing',  // AI model is currently running
  COMPLETED  : 'completed',   // Analysis finished successfully
  FAILED     : 'failed',      // Analysis encountered an error
});

// ── Factory Functions ──────────────────────────────────────────

/**
 * Create a new (empty) analysis record shape.
 * This is what gets stored when a file is first uploaded.
 *
 * @param {object} fileInfo - Output of fileHelper.buildFileInfo()
 * @returns {AnalysisRecord}
 *
 * @typedef {Object} AnalysisRecord
 * @property {string}   fileId          - UUID of the audio file
 * @property {string}   originalName    - Original filename
 * @property {string}   format          - WAV | MP3 | FLAC | OGG
 * @property {number}   sizeBytes       - File size in bytes
 * @property {string}   sizeHuman       - Human-readable file size
 * @property {string}   uploadedAt      - ISO timestamp
 * @property {string}   status          - One of ANALYSIS_STATUS
 * @property {object|null} result       - Populated by AI service
 * @property {string|null} errorMessage - Set if status === 'failed'
 */
function createAnalysisRecord(fileInfo) {
  return {
    fileId        : fileInfo.fileId,
    originalName  : fileInfo.originalName,
    format        : fileInfo.format,
    sizeBytes     : fileInfo.sizeBytes,
    sizeHuman     : fileInfo.sizeHuman,
    uploadedAt    : new Date().toISOString(),
    status        : ANALYSIS_STATUS.PENDING,
    result        : null,
    errorMessage  : null,
  };
}

/**
 * Merge an AI service result into an analysis record.
 *
 * @param {AnalysisRecord} record
 * @param {import('../services/ai.service').AnalysisResult} aiResult
 * @returns {AnalysisRecord}
 */
function applyAnalysisResult(record, aiResult) {
  return {
    ...record,
    status       : ANALYSIS_STATUS.COMPLETED,
    result       : aiResult,
    errorMessage : null,
    completedAt  : new Date().toISOString(),
  };
}

/**
 * Mark an analysis record as failed.
 *
 * @param {AnalysisRecord} record
 * @param {string} errorMessage
 * @returns {AnalysisRecord}
 */
function markAnalysisFailed(record, errorMessage) {
  return {
    ...record,
    status      : ANALYSIS_STATUS.FAILED,
    result      : null,
    errorMessage,
    failedAt    : new Date().toISOString(),
  };
}

module.exports = {
  ANALYSIS_STATUS,
  createAnalysisRecord,
  applyAnalysisResult,
  markAnalysisFailed,
};
