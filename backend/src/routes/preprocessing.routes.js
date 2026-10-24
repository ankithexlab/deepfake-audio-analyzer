/**
 * routes/preprocessing.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Route definitions for Audio Preprocessing and Feature Extraction endpoints.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require('express');
const router  = express.Router();

const { validateUuidParam } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  startPreprocessing,
  getPreprocessingStatus,
  getFullFeatures,
  getVisualizationImage,
} = require('../controllers/preprocessing.controller');

// Require authentication for all preprocessing & visualization operations
router.use(requireAuth);

// ── POST /api/v1/preprocess/:fileId ──────────────────────────────────────────
// Triggers complete audio preprocessing pipeline (mono, 16kHz, normalize, trim, features, viz)
router.post('/:fileId', validateUuidParam('fileId'), startPreprocessing);

// ── GET /api/v1/preprocess/:fileId ───────────────────────────────────────────
// Returns preprocessing status, summary metrics, and visualization image paths
router.get('/:fileId', validateUuidParam('fileId'), getPreprocessingStatus);

// ── GET /api/v1/preprocess/:fileId/features ─────────────────────────────────
// Returns complete raw feature JSON payload for AI model input
router.get('/:fileId/features', validateUuidParam('fileId'), getFullFeatures);

// ── GET /api/v1/preprocess/:fileId/visualization/:type ──────────────────────
// Returns generated PNG image for waveform, spectrogram, or mel
router.get('/:fileId/visualization/:type', getVisualizationImage);

module.exports = router;
