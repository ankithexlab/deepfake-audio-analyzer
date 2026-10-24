/**
 * controllers/analysis.controller.js
 * ─────────────────────────────────────────────────────────────
 * Handles HTTP concerns for audio analysis operations.
 *
 * This controller is the entry point for:
 *   1. Triggering analysis on an uploaded file
 *   2. Polling the status of an ongoing analysis
 *
 * The actual AI inference lives in ai.service.js.
 * The file metadata store lives in upload.service.js.
 * ─────────────────────────────────────────────────────────────
 */

const db            = require('../config/db.config');
const uploadService = require('../services/upload.service');
const aiService     = require('../services/ai.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger        = require('../utils/logger');

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

// ── GET /api/v1/analysis/:fileId ───────────────────────────────

/**
 * Get the current analysis status / result for a file.
 * Clients should poll this after uploading.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getAnalysisStatus(req, res, next) {
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
      message: `Analysis status: ${record.status}`,
      data   : {
        fileId        : record.fileId,
        originalName  : record.originalName,
        format        : record.format,
        sizeHuman     : record.sizeHuman,
        uploadedAt    : record.uploadedAt,
        status        : record.status,
        analysisResult: record.analysisResult,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v1/analysis/:fileId/run ─────────────────────────

/**
 * Trigger AI analysis for an already-uploaded file.
 *
 * Flow:
 *   1. Look up the file record
 *   2. Set status to 'processing'
 *   3. Call the AI service (async — in production this would be
 *      a background job queue, not a blocking HTTP handler)
 *   4. Update the record with the result or error
 *   5. Return the result
 *
 * ⚠️  Note: Running analysis synchronously in the HTTP handler is
 *     acceptable for a demo. In production, submit to a job queue
 *     (Bull, BullMQ, etc.) and return a 202 Accepted immediately.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function runAnalysis(req, res, next) {
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

    // Prevent double-processing
    if (record.status === 'processing') {
      return sendError(res, {
        status : 409,
        message: 'Analysis is already in progress for this file.',
        code   : 'ANALYSIS_IN_PROGRESS',
      });
    }

    if (record.status === 'completed') {
      return sendSuccess(res, {
        message: 'Analysis already completed.',
        data   : { fileId, status: record.status, result: record.analysisResult },
      });
    }

    // Guard: preprocessing must be completed before analysis
    if (
      !record.preprocessing ||
      record.preprocessing.status !== 'completed' ||
      !record.preprocessing.featuresJsonPath
    ) {
      return sendError(res, {
        status : 400,
        message: 'Audio must be preprocessed before running analysis. '
               + 'Call POST /api/v1/preprocess/:fileId first.',
        code   : 'PREPROCESSING_REQUIRED',
      });
    }

    const featuresJsonPath = record.preprocessing.featuresJsonPath;

    // Mark as processing
    uploadService.updateAnalysisResult(fileId, 'processing', null);
    logger.info(`Analysis started for: ${fileId}`);

    // Run AI inference via Python child process
    const aiResult = await aiService.analyzeAudioFile(
      featuresJsonPath,
      fileId,
      record.mimeType
    );

    if (record.preprocessing?.lowReliabilityWarning) {
      aiResult.lowReliabilityWarning = record.preprocessing.lowReliabilityWarning;
    }

    // Persist result
    const updated = await uploadService.updateAnalysisResult(fileId, 'completed', aiResult);

    return sendSuccess(res, {
      status : 200,
      message: 'Analysis completed.',
      data   : {
        fileId        : updated.fileId,
        originalName  : updated.originalName,
        format        : updated.format,
        status        : updated.status,
        analysisResult: updated.analysisResult,
      },
    });
  } catch (err) {
    // Mark the file as failed before propagating
    if (req.params?.fileId) {
      await uploadService.updateAnalysisResult(req.params.fileId, 'failed', null);
    }
    next(err);
  }
}

// ── GET /api/v1/analysis/model-info ───────────────────────────

/**
 * Return information about the currently loaded AI model.
 * Useful for the UI to display model version / readiness.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getModelInfo(req, res, next) {
  try {
    const info = aiService.getModelInfo();
    return sendSuccess(res, {
      message: 'Model information retrieved.',
      data   : info,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/analysis/:fileId/pdf ──────────────────────────

/**
 * Generate and stream downloadable forensic PDF report.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function downloadAnalysisPdf(req, res, next) {
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

    if (!record || !record.analysisResult) {
      return sendError(res, {
        status : 404,
        message: `No completed analysis found for file ID: ${fileId}. Run analysis first.`,
        code   : 'ANALYSIS_NOT_FOUND',
      });
    }

    const { generatePdfReport } = require('../utils/pdfGenerator');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Forensic_Report_${fileId.slice(0, 8)}.pdf"`
    );

    generatePdfReport(
      {
        fileRecord: record,
        analysisResult: record.analysisResult,
        preprocessingData: record.preprocessing || {},
      },
      res
    );
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/analysis/:fileId/report ───────────────────────

/**
 * Get structured forensic report JSON.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getAnalysisReport(req, res, next) {
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

    if (!record || !record.analysisResult) {
      return sendError(res, {
        status : 404,
        message: `No completed analysis found for file ID: ${fileId}`,
        code   : 'ANALYSIS_NOT_FOUND',
      });
    }

    const isDeepfake = record.analysisResult.isDeepfake || record.analysisResult.label === 'FAKE';

    return sendSuccess(res, {
      message: 'Forensic report retrieved.',
      data: {
        reportId: `RPT-${fileId.slice(0, 8).toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        projectName: 'Deep Fake Audio Analyzer',
        officialTitle: 'Deepfake Audio Detection and Analysis System',
        verdict: isDeepfake ? 'DEEPFAKE VOICE' : 'REAL VOICE',
        confidence: record.analysisResult.confidence,
        fakeProbability: record.analysisResult.fakeProbability,
        realProbability: record.analysisResult.realProbability,
        fileInfo: {
          fileId: record.fileId,
          originalName: record.originalName,
          format: record.format,
          sizeHuman: record.sizeHuman,
          samplingRateHz: record.preprocessing?.samplingRateHz || 16000,
          durationSec: record.preprocessing?.cleanDurationSec || 4.0,
        },
        modelInfo: {
          modelName: record.analysisResult.modelName,
          modelVersion: record.analysisResult.modelVersion,
          modelType: record.analysisResult.modelType,
          processingMs: record.analysisResult.processingMs,
        },
        acousticSummary: record.preprocessing?.featuresSummary || {},
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnalysisStatus,
  runAnalysis,
  getModelInfo,
  downloadAnalysisPdf,
  getAnalysisReport,
};
