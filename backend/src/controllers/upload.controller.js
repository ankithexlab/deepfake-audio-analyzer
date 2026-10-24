/**
 * controllers/upload.controller.js
 * ─────────────────────────────────────────────────────────────
 * Handles HTTP concerns for file upload operations.
 *
 * Controller responsibilities (ONLY):
 *   • Read data from req (file, params, query, body)
 *   • Call the appropriate service(s)
 *   • Send a response via the response utility
 *   • Pass errors to next() for centralised handling
 *
 * Business logic lives in services, not here.
 * ─────────────────────────────────────────────────────────────
 */

const db             = require('../config/db.config');
const uploadService  = require('../services/upload.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger         = require('../utils/logger');

// ── POST /api/v1/upload ────────────────────────────────────────

/**
 * Upload a single audio file.
 *
 * Pre-conditions (enforced by middleware before this runs):
 *   - Multer has already saved the file to disk
 *   - validateAudioUpload has confirmed the file is present
 *   - requireAuth has verified JWT and populated req.user
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function uploadAudio(req, res, next) {
  try {
    const userId = req.user?.id || null;
    // Store metadata and build the file record linked to the authenticated user
    const fileRecord = uploadService.storeUploadedFile(req.file, userId);

    logger.info(`Upload accepted: ${fileRecord.fileId} — "${fileRecord.originalName}" (User: ${userId || 'anonymous'})`);

    return sendSuccess(res, {
      status : 201,
      message: 'Audio file uploaded successfully. Analysis is pending.',
      data   : {
        fileId       : fileRecord.fileId,
        originalName : fileRecord.originalName,
        format       : fileRecord.format,
        sizeHuman    : fileRecord.sizeHuman,
        uploadedAt   : fileRecord.uploadedAt,
        status       : fileRecord.status,
        // Tell the client where to poll for the analysis result
        links: {
          status: `/api/v1/analysis/${fileRecord.fileId}`,
          delete: `/api/v1/upload/${fileRecord.fileId}`,
        },
      },
    });
  } catch (err) {
    // Pass to the global error handler
    next(err);
  }
}

// ── DELETE /api/v1/upload/:fileId ──────────────────────────────

/**
 * Delete an uploaded file and its metadata.
 * Only allowed for the owner of the file or admin.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function deleteUpload(req, res, next) {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Verify ownership in PostgreSQL or memory
    const existing = uploadService.getFileById(fileId);
    let ownerId = existing?.userId;

    if (!existing) {
      const dbCheck = await db.query('SELECT user_id FROM audio_files WHERE id = $1', [fileId]);
      if (dbCheck.rows.length === 0) {
        return sendError(res, {
          status : 404,
          message: `No file found with ID: ${fileId}`,
          code   : 'FILE_NOT_FOUND',
        });
      }
      ownerId = dbCheck.rows[0].user_id;
    }

    if (!isAdmin && ownerId && ownerId !== userId) {
      return sendError(res, {
        status : 403,
        message: 'Access denied. You do not have permission to delete this file.',
        code   : 'FORBIDDEN',
      });
    }

    const result = uploadService.deleteFile(fileId);

    if (!result.success) {
      return sendError(res, {
        status : 404,
        message: result.message,
        code   : 'FILE_NOT_FOUND',
      });
    }

    return sendSuccess(res, {
      message: result.message,
      data   : { fileId },
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/upload (list — dev/debug only) ─────────────────

/**
 * List stored files for authenticated user (or all if admin).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function listUploads(req, res, next) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';
    let files = uploadService.listAllFiles();

    if (!isAdmin) {
      files = files.filter((f) => f.userId === userId);
    }

    return sendSuccess(res, {
      message: `${files.length} file(s) in store.`,
      data   : {
        count: files.length,
        files : files.map((f) => ({
          fileId      : f.fileId,
          originalName: f.originalName,
          format      : f.format,
          sizeHuman   : f.sizeHuman,
          uploadedAt  : f.uploadedAt,
          status      : f.status,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadAudio, deleteUpload, listUploads };
