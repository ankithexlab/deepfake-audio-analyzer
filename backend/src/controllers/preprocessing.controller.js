/**
 * controllers/preprocessing.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * HTTP Controller for Audio Preprocessing & Feature Extraction Endpoints.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const db                   = require('../config/db.config');
const preprocessingService = require('../services/preprocessing.service');
const uploadService        = require('../services/upload.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger               = require('../utils/logger');

async function checkFileOwnership(fileId, user) {
  if (user?.role === 'admin') return { allowed: true };
  const record = uploadService.getFileById(fileId);
  if (record) {
    if (record.userId && record.userId !== user?.id) {
      return { allowed: false, status: 403, message: 'Access denied. You do not own this file.' };
    }
    return { allowed: true, record };
  }
  const dbRes = await db.query('SELECT user_id FROM audio_files WHERE id = $1', [fileId]);
  if (dbRes.rows.length === 0) {
    return { allowed: false, status: 404, message: `No file found with ID: ${fileId}` };
  }
  if (dbRes.rows[0].user_id && dbRes.rows[0].user_id !== user?.id) {
    return { allowed: false, status: 403, message: 'Access denied. You do not own this file.' };
  }
  return { allowed: true };
}

/**
 * Trigger audio preprocessing and feature extraction on an uploaded file.
 *
 * Endpoint: POST /api/v1/preprocess/:fileId
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function startPreprocessing(req, res, next) {
  try {
    const { fileId } = req.params;

    const access = await checkFileOwnership(fileId, req.user);
    if (!access.allowed) {
      return sendError(res, {
        status: access.status,
        message: access.message,
        code: access.status === 403 ? 'FORBIDDEN' : 'FILE_NOT_FOUND',
      });
    }

    logger.info(`HTTP Trigger: Start preprocessing for fileId ${fileId}`);
    const updatedRecord = await preprocessingService.preprocessAudioFile(fileId);

    return sendSuccess(res, {
      status : 200,
      message: 'Audio preprocessing and feature extraction completed successfully.',
      data   : {
        fileId          : updatedRecord.fileId,
        originalName    : updatedRecord.originalName,
        status          : updatedRecord.status,
        preprocessing   : updatedRecord.preprocessing,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve preprocessing status and summary for a file.
 *
 * Endpoint: GET /api/v1/preprocess/:fileId
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getPreprocessingStatus(req, res, next) {
  try {
    const { fileId } = req.params;

    const access = await checkFileOwnership(fileId, req.user);
    if (!access.allowed) {
      return sendError(res, {
        status: access.status,
        message: access.message,
        code: access.status === 403 ? 'FORBIDDEN' : 'FILE_NOT_FOUND',
      });
    }

    const record = access.record || uploadService.getFileById(fileId);

    if (!record) {
      return sendError(res, {
        status : 404,
        message: `No file found with ID: ${fileId}`,
        code   : 'FILE_NOT_FOUND',
      });
    }

    return sendSuccess(res, {
      message: `Preprocessing status for ${fileId}`,
      data   : {
        fileId       : record.fileId,
        originalName : record.originalName,
        format       : record.format,
        sizeHuman    : record.sizeHuman,
        status       : record.status,
        preprocessing: record.preprocessing || { status: 'not_started' },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve full raw feature matrix (JSON payload) extracted from the audio.
 * Useful for machine learning model input / prediction.
 *
 * Endpoint: GET /api/v1/preprocess/:fileId/features
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getFullFeatures(req, res, next) {
  try {
    const { fileId } = req.params;

    const access = await checkFileOwnership(fileId, req.user);
    if (!access.allowed) {
      return sendError(res, {
        status: access.status,
        message: access.message,
        code: access.status === 403 ? 'FORBIDDEN' : 'FILE_NOT_FOUND',
      });
    }

    const featuresPayload = preprocessingService.getExtractedFeatures(fileId);

    return sendSuccess(res, {
      message: `Extracted audio features for ${fileId}`,
      data   : featuresPayload,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Stream visual plot PNG (waveform, spectrogram, melSpectrogram) for an analyzed file.
 *
 * Endpoint: GET /api/v1/preprocess/:fileId/visualization/:type
 */
async function getVisualizationImage(req, res, next) {
  try {
    const { fileId, type } = req.params;

    const access = await checkFileOwnership(fileId, req.user);
    if (!access.allowed) {
      return sendError(res, {
        status: access.status,
        message: access.message,
        code: access.status === 403 ? 'FORBIDDEN' : 'FILE_NOT_FOUND',
      });
    }

    const record = access.record || uploadService.getFileById(fileId);

    if (!record || !record.preprocessing?.visualizations) {
      return sendError(res, {
        status: 404,
        message: `Visualizations not found for file ID ${fileId}`,
        code: 'VISUALIZATION_NOT_FOUND',
      });
    }

    const viz = record.preprocessing.visualizations;
    let targetPath;

    if (type === 'waveform') {
      targetPath = viz.waveformImage;
    } else if (type === 'spectrogram' || type === 'stft') {
      targetPath = viz.spectrogramImage;
    } else if (type === 'mel' || type === 'melSpectrogram') {
      targetPath = viz.melSpectrogramImage;
    } else {
      return sendError(res, {
        status: 400,
        message: "Invalid visualization type. Expected 'waveform', 'spectrogram', or 'mel'.",
        code: 'INVALID_VIZ_TYPE',
      });
    }

    const fs = require('fs');
    if (!targetPath || !fs.existsSync(targetPath)) {
      return sendError(res, {
        status: 404,
        message: `Visualization asset for ${type} not found on disk.`,
        code: 'FILE_NOT_FOUND',
      });
    }

    res.setHeader('Content-Type', 'image/png');
    return fs.createReadStream(targetPath).pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startPreprocessing,
  getPreprocessingStatus,
  getFullFeatures,
  getVisualizationImage,
};
