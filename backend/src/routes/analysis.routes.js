/**
 * routes/analysis.routes.js
 * ─────────────────────────────────────────────────────────────
 * Route definitions for audio analysis operations.
 * ─────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

const { validateUuidParam } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  getAnalysisStatus,
  runAnalysis,
  getModelInfo,
  downloadAnalysisPdf,
  getAnalysisReport,
} = require('../controllers/analysis.controller');

// ── GET /api/v1/analysis/model-info ───────────────────────────
// Must be defined BEFORE /:fileId to avoid "model-info" being
// treated as a fileId parameter. Public model architecture specs.
router.get('/model-info', getModelInfo);

// ── Protected File Analysis Endpoints ─────────────────────────
// Download forensic analysis report as PDF
router.get('/:fileId/pdf', requireAuth, validateUuidParam('fileId'), downloadAnalysisPdf);

// Get structured forensic analysis report JSON
router.get('/:fileId/report', requireAuth, validateUuidParam('fileId'), getAnalysisReport);

// Poll the status and result of an analysis
router.get('/:fileId', requireAuth, validateUuidParam('fileId'), getAnalysisStatus);

// Trigger analysis for an uploaded file
router.post('/:fileId/run', requireAuth, validateUuidParam('fileId'), runAnalysis);

module.exports = router;
