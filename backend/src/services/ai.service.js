/**
 * services/ai.service.js
 * ─────────────────────────────────────────────────────────────────────
 * AI Model integration layer.
 *
 * Responsibilities:
 *  • Validate that the features JSON file exists before spawning Python
 *  • Delegate inference to ModelRunner (Python child process bridge)
 *  • Map the raw Python result to a consistent AnalysisResult shape
 *  • Expose model metadata for health / model-info endpoints
 *  • Log inference lifecycle events and errors
 *
 * Design principle:
 *  The controller does NOT know whether the model is a local Python
 *  process, a remote REST API, or a WASM module — it calls this
 *  service and receives a typed AnalysisResult object.
 *
 * To plug in a new model type:
 *  1. Subclass BaseModel in src/scripts/ai_models/<name>_model.py
 *  2. Register it in src/scripts/model_registry.py
 *  3. Set AI_MODEL_TYPE=<name> in .env
 *  No changes to this service or the controller are required.
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const fs          = require('fs');
const path        = require('path');
const logger      = require('../utils/logger');
const config      = require('../config/app.config');
const ModelRunner = require('../utils/modelRunner');

// ── Singleton runner ───────────────────────────────────────────────────
// Created once at module load time; reused for every request.
const runner = new ModelRunner();

// ── JSDoc typedef ──────────────────────────────────────────────────────

/**
 * @typedef {Object} AnalysisResult
 * @property {boolean}  isDeepfake       - True when the audio is predicted as fake
 * @property {string}   label            - "REAL" | "FAKE"
 * @property {number}   confidence       - Certainty of the prediction (0.0–1.0)
 * @property {number}   fakeProbability  - Probability of being deepfake (0.0–1.0)
 * @property {number}   realProbability  - Probability of being genuine (0.0–1.0)
 * @property {string}   modelType        - Active model type ('mock', 'cnn', …)
 * @property {string}   modelName        - Human-readable model name
 * @property {string}   modelVersion     - Semantic version of the model
 * @property {string[]} featuresUsed     - Acoustic feature keys used in prediction
 * @property {number}   processingMs     - Total inference time in milliseconds
 */

// ── Model metadata ─────────────────────────────────────────────────────

/**
 * Return metadata about the currently configured AI model.
 * Used by the /analysis/model-info endpoint and health checks.
 *
 * @returns {{ name: string, type: string, version: string, status: string, ready: boolean, note: string }}
 */
function getModelInfo() {
  const modelType = config.ai.modelType || 'trained';
  const isMock    = modelType === 'mock';

  let metadata = null;
  try {
    const metaPath = path.resolve(__dirname, '../../ml/models/model_metadata.json');
    if (fs.existsSync(metaPath)) {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    }
  } catch (e) {
    logger.debug('Could not read model_metadata.json', { err: e.message });
  }

  return {
    name   : metadata?.modelName || 'EnsembleNeuralDeepfakeDetector',
    type   : modelType,
    version: metadata?.modelVersion || '1.0.0',
    status : 'ready',
    ready  : true,
    metrics: metadata?.metrics || null,
    trainingSamples: metadata?.trainingSamples || null,
    testSamples: metadata?.testSamples || null,
    trainedAt: metadata?.trainedAt || null,
    featureCount: metadata?.featureCount || 170,
    note   : isMock
      ? 'Running in heuristic (mock) mode. Set AI_MODEL_TYPE=trained in .env to activate the trained model.'
      : `Active trained classifier: Ensemble HistGradientBoosting + Random Forest + Extra Trees (Trained on ${metadata?.trainingSamples ? metadata.trainingSamples + metadata.testSamples : '1,500'} audio samples).`,
  };
}

// ── Core analysis function ─────────────────────────────────────────────

/**
 * Run AI deepfake detection on a preprocessed audio file.
 *
 * ⚠️  Prerequisite: the file must have been preprocessed first
 *     (status === 'preprocessed' in the upload store). The controller
 *     enforces this before calling here.
 *
 * @param {string} featuresJsonPath - Absolute path to the features JSON
 *                                    produced by the preprocessing pipeline.
 * @param {string} fileId           - UUID of the audio file (for tracing).
 * @param {string} mimeType         - MIME type of the original audio (for logging).
 * @returns {Promise<AnalysisResult>}
 *
 * @throws {Error} FEATURES_FILE_MISSING — features JSON not found on disk.
 * @throws {Error} INFERENCE_TIMEOUT     — Python process exceeded timeout.
 * @throws {Error} PYTHON_SPAWN_ERROR    — Python executable not found.
 * @throws {Error} INFERENCE_FAILED      — Model returned a failure result.
 */
async function analyzeAudioFile(featuresJsonPath, fileId, mimeType) {
  const start = Date.now();

  logger.info(`[AI] Analysis started for fileId: ${fileId}`, {
    featuresJsonPath,
    mimeType,
    modelType: config.ai.modelType || 'mock',
  });

  // ── Guard: ensure features file exists before spawning Python ────
  if (!fs.existsSync(featuresJsonPath)) {
    const err    = new Error(
      `Features JSON not found at path: ${featuresJsonPath}. `
      + 'Ensure preprocessing has completed successfully.'
    );
    err.code   = 'FEATURES_FILE_MISSING';
    err.status = 500;
    logger.error(`[AI] Features file missing for fileId: ${fileId}`, { featuresJsonPath });
    throw err;
  }

  // ── Delegate to Python inference bridge ──────────────────────────
  let rawResult;
  try {
    rawResult = await runner.run(featuresJsonPath, fileId, config.ai.modelType);
  } catch (inferenceErr) {
    logger.error(`[AI] Inference failed for fileId: ${fileId}`, {
      error: inferenceErr.message,
      code : inferenceErr.code  || 'UNKNOWN',
    });
    throw inferenceErr; // propagate with original code intact
  }

  // ── Map Python response → AnalysisResult ─────────────────────────
  /** @type {AnalysisResult} */
  const result = {
    isDeepfake     : rawResult.prediction === 'FAKE',
    label          : rawResult.prediction,
    confidence     : rawResult.confidence,
    fakeProbability: rawResult.fakeProbability,
    realProbability: rawResult.realProbability,
    modelType      : rawResult.modelType    || config.ai.modelType || 'mock',
    modelName      : rawResult.modelName    || 'Unknown',
    modelVersion   : rawResult.modelVersion || '0.0.0',
    featuresUsed   : rawResult.featuresUsed || [],
    processingMs   : rawResult.processingMs || (Date.now() - start),
  };

  logger.info(
    `[AI] Analysis complete for fileId: ${fileId} — ` +
    `${result.label} | ` +
    `confidence=${(result.confidence * 100).toFixed(1)}% | ` +
    `fake=${(result.fakeProbability * 100).toFixed(1)}% | ` +
    `real=${(result.realProbability * 100).toFixed(1)}% | ` +
    `${result.processingMs}ms`
  );

  return result;
}

// ── Exports ────────────────────────────────────────────────────────────

module.exports = {
  getModelInfo,
  analyzeAudioFile,
};
