/**
 * utils/modelRunner.js
 * ─────────────────────────────────────────────────────────────────────
 * Node.js bridge that spawns the Python AI inference child process.
 *
 * Mirrors the pattern of AudioPreprocessor (audioPreprocessor.js):
 *   • Spawn `run_inference.py` as a child process via Python
 *   • Stream stdout → accumulate → parse as JSON
 *   • Stream stderr → forward to logger as debug lines
 *   • Enforce a configurable timeout with SIGKILL
 *   • Propagate structured errors with machine-readable `.code` fields
 *
 * The caller (ai.service.js) receives a plain JS object and never
 * needs to know that a Python process was involved.
 * ─────────────────────────────────────────────────────────────────────
 */

'use strict';

const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const logger    = require('./logger');
const config    = require('../config/app.config');

// ── Error codes ────────────────────────────────────────────────────────
const ERRORS = Object.freeze({
  TIMEOUT            : 'INFERENCE_TIMEOUT',
  PYTHON_EXIT        : 'INFERENCE_PYTHON_ERROR',
  PROCESS_ERROR      : 'INFERENCE_PROCESS_ERROR',
  SPAWN_ERROR        : 'PYTHON_SPAWN_ERROR',
  INVALID_OUTPUT     : 'INVALID_INFERENCE_OUTPUT',
  INFERENCE_FAILED   : 'INFERENCE_FAILED',
});

class ModelRunner {
  /**
   * Create a ModelRunner instance.
   *
   * @param {Object} [options]
   * @param {string} [options.pythonPath] - Python executable path or command.
   *                                        Falls back to PYTHON_PATH env → 'python'.
   * @param {string} [options.scriptPath] - Absolute path to run_inference.py.
   * @param {number} [options.timeoutMs]  - Max inference time in ms.
   *                                        Falls back to config.ai.timeoutMs → 30 000.
   */
  constructor(options = {}) {
    this.pythonPath = options.pythonPath
      || process.env.PYTHON_PATH
      || 'python';

    this.scriptPath = options.scriptPath
      || path.resolve(__dirname, '../scripts/run_inference.py');

    this.timeoutMs = options.timeoutMs
      || config.ai.timeoutMs
      || 30_000;

    // Warn early if the script is missing — avoids a confusing spawn error later
    if (!fs.existsSync(this.scriptPath)) {
      logger.warn(`[ModelRunner] Inference script not found at: ${this.scriptPath}`);
    }

    logger.debug('[ModelRunner] Initialised', {
      pythonPath : this.pythonPath,
      scriptPath : this.scriptPath,
      timeoutMs  : this.timeoutMs,
    });
  }

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Run AI inference on a preprocessed audio file.
   *
   * @param {string}      featuresJsonPath - Absolute path to the features JSON.
   * @param {string}      fileId           - UUID for logging/tracing.
   * @param {string|null} [modelType]      - Override model type; falls back to
   *                                        config.ai.modelType → 'mock'.
   * @returns {Promise<Object>} Parsed inference result:
   *   {
   *     success,         fileId,          prediction,
   *     confidence,      fakeProbability, realProbability,
   *     modelType,       modelName,       modelVersion,
   *     featuresUsed,    processingMs
   *   }
   */
  run(featuresJsonPath, fileId, modelType = null) {
    const resolvedModelType = modelType || config.ai.modelType || 'mock';

    return new Promise((resolve, reject) => {
      const args = [
        this.scriptPath,
        '--features-json', featuresJsonPath,
        '--model-type',    resolvedModelType,
        '--file-id',       fileId,
      ];

      logger.info(`[ModelRunner] Spawning inference process`, {
        fileId,
        modelType        : resolvedModelType,
        featuresJsonPath,
        pythonPath       : this.pythonPath,
      });

      const py = spawn(this.pythonPath, args);

      let stdout     = '';
      let stderr     = '';
      let timedOut   = false;

      // ── Timeout ────────────────────────────────────────────────────
      const timer = setTimeout(() => {
        timedOut = true;
        py.kill('SIGKILL');
        logger.error(`[ModelRunner] Inference timed out (${this.timeoutMs}ms) for fileId: ${fileId}`);
        reject(_makeError(
          `AI inference timed out after ${this.timeoutMs / 1000}s`,
          ERRORS.TIMEOUT,
        ));
      }, this.timeoutMs);

      // ── Collect stdout (JSON result) ───────────────────────────────
      py.stdout.on('data', (chunk) => { stdout += chunk.toString(); });

      // ── Collect stderr (Python logs) and forward to logger ─────────
      py.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
        chunk.toString().split('\n').forEach((line) => {
          const trimmed = line.trim();
          if (trimmed) logger.debug(`[Python/run_inference] ${trimmed}`);
        });
      });

      // ── Process exit ───────────────────────────────────────────────
      py.on('close', (exitCode) => {
        clearTimeout(timer);
        if (timedOut) return; // already rejected

        if (exitCode !== 0) {
          logger.error(`[ModelRunner] Process exited with code ${exitCode}`, {
            fileId, exitCode, stderr, stdout,
          });
          // Try to parse structured error from Python stdout
          try {
            const errJson = JSON.parse(stdout);
            return reject(_makeError(
              errJson.error || 'Python inference process failed',
              ERRORS.PYTHON_EXIT,
              errJson.traceback || stderr,
            ));
          } catch (_) {
            return reject(_makeError(
              `Inference process exited ${exitCode}: ${stderr || stdout || 'no output'}`,
              ERRORS.PROCESS_ERROR,
              stderr,
            ));
          }
        }

        // ── Parse success JSON ───────────────────────────────────────
        try {
          const result = JSON.parse(stdout);

          if (!result.success) {
            return reject(_makeError(
              result.error || 'Inference returned a failure status',
              ERRORS.INFERENCE_FAILED,
              result.traceback || null,
            ));
          }

          logger.info(`[ModelRunner] Inference succeeded for fileId: ${fileId}`, {
            prediction     : result.prediction,
            confidence     : result.confidence,
            fakeProbability: result.fakeProbability,
            realProbability: result.realProbability,
            modelType      : result.modelType,
            processingMs   : result.processingMs,
          });

          return resolve(result);

        } catch (parseErr) {
          logger.error(`[ModelRunner] Failed to parse inference JSON output`, {
            fileId, stdout,
          });
          return reject(_makeError(
            'Invalid JSON received from inference process',
            ERRORS.INVALID_OUTPUT,
            stdout,
          ));
        }
      });

      // ── Spawn error (e.g. python not found) ───────────────────────
      py.on('error', (spawnErr) => {
        clearTimeout(timer);
        logger.error(`[ModelRunner] Failed to spawn Python process`, {
          fileId, error: spawnErr.message,
        });
        reject(_makeError(
          `Cannot start inference process: ${spawnErr.message}`,
          ERRORS.SPAWN_ERROR,
        ));
      });
    });
  }
}

// ── Private helpers ────────────────────────────────────────────────────

/**
 * Build a structured Error with a machine-readable `.code` property.
 *
 * @param {string} message
 * @param {string} code
 * @param {string|null} [details]
 * @returns {Error}
 */
function _makeError(message, code, details = null) {
  const err   = new Error(message);
  err.code    = code;
  if (details) err.details = details;
  return err;
}

module.exports = ModelRunner;
