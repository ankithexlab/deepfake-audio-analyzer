/**
 * routes/index.js
 * ─────────────────────────────────────────────────────────────
 * Root API router — mounts all sub-routers under /api/v1.
 *
 * Adding a new feature?
 *   1. Create routes/feature.routes.js
 *   2. Import it here
 *   3. Mount it with router.use('/feature', featureRouter)
 *   Done — app.js never needs to change.
 * ─────────────────────────────────────────────────────────────
 */

const express          = require('express');
const router           = express.Router();
const { sendSuccess }  = require('../utils/response');
const aiService        = require('../services/ai.service');
const config           = require('../config/app.config');

// ── Sub-routers ────────────────────────────────────────────────
const uploadRoutes        = require('./upload.routes');
const analysisRoutes      = require('./analysis.routes');
const preprocessingRoutes = require('./preprocessing.routes');
const authRoutes          = require('./auth.routes');
const historyRoutes       = require('./history.routes');

// ── Health Check ───────────────────────────────────────────────
/**
 * GET /api/v1/health
 * Lightweight liveness probe — returns 200 if the server is up.
 * Extended with model readiness status so a load balancer can
 * distinguish "server alive" from "model ready".
 */
router.get('/health', (req, res) => {
  const modelInfo = aiService.getModelInfo();

  return sendSuccess(res, {
    message: 'Deepfake Audio Detector API is running.',
    data   : {
      status     : 'ok',
      environment: config.server.env,
      version    : process.env.npm_package_version || '1.0.0',
      uptime     : `${Math.floor(process.uptime())}s`,
      model      : {
        name   : modelInfo.name,
        version: modelInfo.version,
        ready  : modelInfo.ready,
      },
      timestamp  : new Date().toISOString(),
    },
  });
});

// ── Mount Feature Routers ──────────────────────────────────────
router.use('/auth',       authRoutes);
router.use('/upload',     uploadRoutes);
router.use('/analysis',   analysisRoutes);
router.use('/preprocess', preprocessingRoutes);
router.use('/history',    historyRoutes);

module.exports = router;
