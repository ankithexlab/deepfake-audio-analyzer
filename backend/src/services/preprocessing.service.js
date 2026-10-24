/**
 * services/preprocessing.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic for audio preprocessing and feature extraction.
 *
 * Responsibilities:
 *  • Runs audio preprocessing on raw uploaded files via AudioPreprocessor utility
 *  • Updates file status in uploadService ('pending' -> 'preprocessing' -> 'preprocessed')
 *  • Stores extracted acoustic feature summaries and visualization paths
 *  • Provides feature JSON retrieval for future AI model inference
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path              = require('path');
const fs                = require('fs');
const AudioPreprocessor = require('../utils/audioPreprocessor');
const uploadService     = require('./upload.service');
const logger            = require('../utils/logger');

// Instantiate the clean preprocessor utility instance
const preprocessor = new AudioPreprocessor();

/**
 * Triggers complete audio preprocessing and feature extraction for an uploaded file.
 *
 * Pipeline Steps Executed:
 *  1. Retrieves raw uploaded file record from `uploadService`
 *  2. Updates file status to 'preprocessing'
 *  3. Executes `AudioPreprocessor` engine (Mono conversion, 16kHz resample, normalization, trim, features, viz)
 *  4. Updates file record status to 'preprocessed' and stores result metadata
 *
 * @param {string} fileId - UUID of the file to process.
 * @returns {Promise<Object>} Updated file record containing preprocessing details.
 */
async function preprocessAudioFile(fileId) {
  const fileRecord = uploadService.getFileById(fileId);

  if (!fileRecord) {
    const err  = new Error(`No file found with ID: ${fileId}`);
    err.code   = 'FILE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Define target output directory for preprocessed assets (same date directory as raw file)
  const outputDir = path.dirname(fileRecord.savedPath);

  logger.info(`PreprocessingService: Starting processing for file ${fileId}`);

  // Update status in record store
  fileRecord.status = 'preprocessing';
  fileRecord.preprocessing = {
    startedAt: new Date().toISOString(),
    status: 'in_progress',
  };

  try {
    // Run Python preprocessor
    const result = await preprocessor.process(fileRecord.savedPath, outputDir, fileId);

    // Build structured output for response & storage
    const preprocessingPayload = {
      status: 'completed',
      completedAt: new Date().toISOString(),
      samplingRateHz: result.samplingRateHz,
      channels: result.channels,
      rawDurationSec: result.rawDurationSec,
      cleanDurationSec: result.cleanDurationSec,
      lowReliabilityWarning: result.lowReliabilityWarning || null,
      processedAudioPath: result.processedAudioPath,
      featuresJsonPath: result.featuresJsonPath,
      visualizations: result.visualizations,
      featuresSummary: result.featuresSummary,
    };

    // Store preprocessing results in file record
    fileRecord.status = 'preprocessed';
    fileRecord.preprocessing = preprocessingPayload;

    logger.info(`PreprocessingService: Successfully completed for file ${fileId}`);
    return fileRecord;

  } catch (err) {
    fileRecord.status = 'failed';
    fileRecord.preprocessing = {
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: err.message,
    };
    logger.error(`PreprocessingService: Processing failed for file ${fileId}`, { error: err.message });
    throw err;
  }
}

/**
 * Retrieves the full raw extracted features JSON object for a file.
 *
 * @param {string} fileId - UUID of the file.
 * @returns {Object} Complete feature dataset (MFCC, Chroma, Contrast, ZCR, RMS, Waveform points).
 */
function getExtractedFeatures(fileId) {
  const fileRecord = uploadService.getFileById(fileId);

  if (!fileRecord) {
    const err  = new Error(`No file found with ID: ${fileId}`);
    err.code   = 'FILE_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  if (!fileRecord.preprocessing || fileRecord.preprocessing.status !== 'completed') {
    const err  = new Error(`Audio has not been preprocessed yet for file ID: ${fileId}`);
    err.code   = 'PREPROCESSING_REQUIRED';
    err.status = 400;
    throw err;
  }

  const featuresJsonPath = fileRecord.preprocessing.featuresJsonPath;

  if (!fs.existsSync(featuresJsonPath)) {
    const err  = new Error(`Extracted features file missing at path: ${featuresJsonPath}`);
    err.code   = 'FEATURES_FILE_MISSING';
    err.status = 500;
    throw err;
  }

  const rawData = fs.readFileSync(featuresJsonPath, 'utf-8');
  return JSON.parse(rawData);
}

module.exports = {
  preprocessAudioFile,
  getExtractedFeatures,
};
