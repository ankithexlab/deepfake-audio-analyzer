/**
 * utils/audioPreprocessor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Clean Utility Class wrapping the Python Audio Preprocessing Engine.
 *
 * Handles:
 *  • Spawning child process to execute `preprocess_audio.py`
 *  • Streaming and parsing JSON output from stdout
 *  • Configurable Python executable path (via process.env.PYTHON_PATH)
 *  • Timeout enforcement and error diagnostic capturing
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { spawn } = require('child_process');
const path      = require('path');
const fs        = require('fs');
const logger    = require('./logger');

class AudioPreprocessor {
  /**
   * Initializes the AudioPreprocessor instance.
   *
   * @param {Object} [options] - Configuration options.
   * @param {string} [options.pythonPath] - Absolute path or command for Python executable.
   * @param {string} [options.scriptPath] - Path to the Python preprocessing script.
   * @param {number} [options.timeoutMs]  - Timeout in milliseconds (default: 60000ms).
   */
  constructor(options = {}) {
    this.pythonPath = options.pythonPath || process.env.PYTHON_PATH || 'python';
    this.scriptPath = options.scriptPath || path.resolve(__dirname, '../scripts/preprocess_audio.py');
    this.timeoutMs  = options.timeoutMs  || 60000; // 60 seconds default

    // Validate that the Python script exists on disk
    if (!fs.existsSync(this.scriptPath)) {
      logger.error(`AudioPreprocessor: Python script missing at ${this.scriptPath}`);
    }
  }

  /**
   * Executes audio preprocessing and feature extraction on a target file.
   *
   * @param {string} inputFilePath  - Absolute path to raw uploaded audio file.
   * @param {string} outputDir      - Directory where preprocessed assets should be saved.
   * @param {string} fileId          - Unique identifier (UUID) for file asset naming.
   * @returns {Promise<Object>}       - Resolves with full preprocessed result payload.
   */
  async process(inputFilePath, outputDir, fileId) {
    return new Promise((resolve, reject) => {
      // Create output directory if it doesn't exist yet
      fs.mkdirSync(outputDir, { recursive: true });

      const args = [
        this.scriptPath,
        '--input', inputFilePath,
        '--output-dir', outputDir,
        '--file-id', fileId,
      ];

      logger.info(`AudioPreprocessor: Spawning Python process [${fileId}]`, {
        pythonPath: this.pythonPath,
        scriptPath: this.scriptPath,
        inputFilePath,
        outputDir,
      });

      const pyProcess = spawn(this.pythonPath, args);

      let stdoutData = '';
      let stderrData = '';
      let isTimedOut = false;

      // Set safety timeout for long-running / stalled processing
      const timer = setTimeout(() => {
        isTimedOut = true;
        pyProcess.kill('SIGKILL');
        const timeoutErr = new Error(`Audio preprocessing timed out after ${this.timeoutMs / 1000}s`);
        timeoutErr.code = 'PREPROCESSING_TIMEOUT';
        logger.error(`AudioPreprocessor: Timeout for fileId ${fileId}`);
        reject(timeoutErr);
      }, this.timeoutMs);

      // Collect stdout
      pyProcess.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString();
      });

      // Collect stderr
      pyProcess.stderr.on('data', (chunk) => {
        stderrData += chunk.toString();
      });

      // Process completion handler
      pyProcess.on('close', (exitCode) => {
        clearTimeout(timer);
        if (isTimedOut) return;

        if (exitCode !== 0) {
          logger.error(`AudioPreprocessor: Python process failed with exit code ${exitCode}`, {
            stderr: stderrData,
            stdout: stdoutData,
          });

          // Attempt to parse JSON error output if script printed formatted JSON error
          try {
            const errJson = JSON.parse(stdoutData);
            const errMsg  = errJson.error || 'Python preprocessing failed';
            const pyErr   = new Error(errMsg);
            pyErr.code    = 'PYTHON_PREPROCESSING_ERROR';
            pyErr.details = errJson.traceback || stderrData;
            const lowerMsg = errMsg.toLowerCase();
            if (
              lowerMsg.includes('too short') ||
              lowerMsg.includes('silent') ||
              lowerMsg.includes('empty') ||
              lowerMsg.includes('corrupted') ||
              lowerMsg.includes('format') ||
              lowerMsg.includes('not recognised')
            ) {
              pyErr.status = 400;
            }
            return reject(pyErr);
          } catch (_) {
            const err   = new Error(`Preprocessing failed with code ${exitCode}: ${stderrData || stdoutData}`);
            err.code    = 'PYTHON_PROCESS_ERROR';
            err.details = stderrData;
            return reject(err);
          }
        }

        try {
          const result = JSON.parse(stdoutData);
          if (!result.success) {
            const err = new Error(result.error || 'Preprocessing returned error status');
            err.code  = 'PREPROCESSING_FAILED';
            return reject(err);
          }

          logger.info(`AudioPreprocessor: Preprocessing completed successfully for fileId ${fileId}`);
          return resolve(result);
        } catch (jsonParseErr) {
          logger.error(`AudioPreprocessor: Invalid JSON returned by Python script`, { stdout: stdoutData });
          const err  = new Error('Failed to parse Python preprocessor JSON output');
          err.code   = 'INVALID_PREPROCESSOR_OUTPUT';
          err.details = stdoutData;
          return reject(err);
        }
      });

      pyProcess.on('error', (procErr) => {
        clearTimeout(timer);
        logger.error(`AudioPreprocessor: Failed to start Python process`, { error: procErr.message });
        const err  = new Error(`Failed to start Python preprocessor: ${procErr.message}`);
        err.code   = 'PYTHON_SPAWN_ERROR';
        return reject(err);
      });
    });
  }
}

module.exports = AudioPreprocessor;
