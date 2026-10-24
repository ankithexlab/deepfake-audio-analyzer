/**
 * controllers/history.controller.js
 * ─────────────────────────────────────────────────────────────
 * History, Statistics & CSV Export Controller.
 * Members: Ashu (Member 2) & Samiksha (Member 4)
 * ─────────────────────────────────────────────────────────────
 */

const db = require('../config/db.config');
const uploadService = require('../services/upload.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * GET /api/v1/history
 * Query params:
 *   - search: string (matches original filename)
 *   - verdict: 'REAL' | 'FAKE' | 'ALL'
 *   - page: integer (default 1)
 *   - limit: integer (default 10)
 */
async function getHistory(req, res, next) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const verdict = req.query.verdict && req.query.verdict !== 'ALL' ? req.query.verdict.toUpperCase() : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        a.id AS file_id,
        a.original_name,
        a.format,
        a.size_bytes,
        a.size_human,
        a.status AS file_status,
        a.created_at,
        p.id AS prediction_id,
        p.is_deepfake,
        p.label,
        p.confidence,
        p.fake_probability,
        p.real_probability,
        p.model_name,
        p.model_type,
        p.processing_ms,
        p.features_summary
      FROM audio_files a
      LEFT JOIN predictions p ON a.id = p.file_id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramIndex = 1;

    // Enforce private history access unless admin
    if (!isAdmin) {
      queryText += ` AND a.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND a.original_name ILIKE $${paramIndex}`;
      queryParams.push(search);
      paramIndex++;
    }

    if (verdict === 'PENDING') {
      queryText += ' AND p.id IS NULL';
    } else if (verdict) {
      queryText += ` AND p.label = $${paramIndex}`;
      queryParams.push(verdict);
      paramIndex++;
    }

    // Total count query for pagination
    const countQuery = `SELECT COUNT(*) FROM (${queryText}) AS total_count`;
    const countResult = await db.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    // Order & Pagination
    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await db.query(queryText, queryParams);

    return sendSuccess(res, {
      message: 'History records retrieved successfully.',
      data: {
        records: result.rows,
        pagination: {
          totalRecords,
          totalPages,
          currentPage: page,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/history/:fileId
 * Deletes file from PostgreSQL tables and disk.
 * Enforces ownership check: only owner or admin can delete.
 */
async function deleteHistoryItem(req, res, next) {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    // Verify ownership in PostgreSQL
    const checkFile = await db.query('SELECT id, user_id FROM audio_files WHERE id = $1', [fileId]);
    if (checkFile.rows.length === 0) {
      return sendError(res, {
        status: 404,
        message: `No record found with ID: ${fileId}`,
        code: 'RECORD_NOT_FOUND',
      });
    }

    const fileOwnerId = checkFile.rows[0].user_id;
    if (!isAdmin && fileOwnerId && fileOwnerId !== userId) {
      return sendError(res, {
        status: 403,
        message: 'Access denied. You can only delete your own scan history.',
        code: 'FORBIDDEN',
      });
    }

    // Remove from PostgreSQL (CASCADE will delete predictions and reports)
    const result = await db.query('DELETE FROM audio_files WHERE id = $1 RETURNING id', [fileId]);

    if (result.rows.length === 0) {
      return sendError(res, {
        status: 404,
        message: `No record found with ID: ${fileId}`,
        code: 'RECORD_NOT_FOUND',
      });
    }

    // Remove from in-memory and disk
    const inMem = uploadService.getFileById(fileId);
    if (inMem) {
      const { safeDeleteFile } = require('../utils/fileHelper');
      safeDeleteFile(inMem.savedPath);
    }
    uploadService.deleteFile(fileId);

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, status, ip_address, details)
       VALUES ($1, 'DELETE_SCAN_RECORD', 'SUCCESS', $2, $3)`,
      [userId || null, req.ip, JSON.stringify({ fileId })]
    );

    return sendSuccess(res, {
      message: `Audio record and prediction for ${fileId} deleted successfully.`,
      data: { fileId },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/history/stats
 * Dashboard statistics: User Scans, Deepfake Count, Genuine Count, Deepfake Ratio, Avg Processing Time.
 * Scoped to authenticated user's private scans, plus global dataset benchmark statistics.
 */
async function getHistoryStats(req, res, next) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    let userFilter = '';
    const statsParams = [];
    if (!isAdmin) {
      userFilter = ' WHERE a.user_id = $1';
      statsParams.push(userId);
    }

    const statsQuery = `
      SELECT 
        COUNT(a.id) AS total_audio_files,
        COUNT(p.id) AS total_scans,
        COUNT(CASE WHEN p.id IS NULL THEN 1 END) AS pending_scans,
        COUNT(CASE WHEN p.label = 'FAKE' THEN 1 END) AS deepfakes_detected,
        COUNT(CASE WHEN p.label = 'REAL' THEN 1 END) AS genuine_detected,
        ROUND(AVG(p.confidence)::numeric, 4) AS avg_confidence,
        ROUND(AVG(p.processing_ms)::numeric, 0) AS avg_processing_ms
      FROM audio_files a
      LEFT JOIN predictions p ON a.id = p.file_id
      ${userFilter}
    `;

    const statsResult = await db.query(statsQuery, statsParams);
    const row = statsResult.rows[0] || {};

    const datasetStatsQuery = `
      SELECT 
        COUNT(*) AS total_dataset,
        COUNT(CASE WHEN label = 'REAL' THEN 1 END) AS real_dataset,
        COUNT(CASE WHEN label = 'DEEPFAKE' THEN 1 END) AS deepfake_dataset
      FROM dataset_files
    `;
    const datasetResult = await db.query(datasetStatsQuery);
    const dsRow = datasetResult.rows[0] || {};

    const totalAudioFiles = parseInt(row.total_audio_files, 10) || 0;
    const totalScans = parseInt(row.total_scans, 10) || 0;
    const pendingScans = parseInt(row.pending_scans, 10) || 0;
    const deepfakes = parseInt(row.deepfakes_detected, 10) || 0;
    const genuine = parseInt(row.genuine_detected, 10) || 0;
    const totalDataset = parseInt(dsRow.total_dataset, 10) || 0;
    const realDataset = parseInt(dsRow.real_dataset, 10) || 0;
    const deepfakeDataset = parseInt(dsRow.deepfake_dataset, 10) || 0;

    return sendSuccess(res, {
      message: 'Dashboard statistics retrieved.',
      data: {
        totalScans,
        totalAudioFiles,
        pendingScans,
        deepfakesDetected: deepfakes,
        genuineDetected: genuine,
        deepfakePercentage: totalScans > 0 ? ((deepfakes / totalScans) * 100).toFixed(1) : '0.0',
        averageConfidence: row.avg_confidence ? (parseFloat(row.avg_confidence) * 100).toFixed(1) + '%' : (totalScans > 0 ? '0.0%' : 'N/A'),
        avgProcessingTimeMs: parseInt(row.avg_processing_ms, 10) || 0,
        dataset: {
          total: totalDataset,
          real: realDataset,
          deepfake: deepfakeDataset,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/history/export/csv
 * Exports scan history for authenticated user (or all if admin) as a downloadable CSV spreadsheet.
 */
async function exportHistoryCSV(req, res, next) {
  try {
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    let query = `
      SELECT 
        a.id AS file_id,
        a.original_name,
        a.format,
        a.size_human,
        a.created_at,
        p.label,
        p.confidence,
        p.fake_probability,
        p.real_probability,
        p.model_name,
        p.processing_ms
      FROM audio_files a
      JOIN predictions p ON a.id = p.file_id
    `;
    const params = [];
    if (!isAdmin) {
      query += ` WHERE a.user_id = $1`;
      params.push(userId);
    }
    query += ` ORDER BY a.created_at DESC`;

    const result = await db.query(query, params);

    let csv = 'File ID,Filename,Format,Size,Date Analyzed,Verdict,Confidence,Fake Probability,Real Probability,AI Model,Processing Time (ms)\n';

    result.rows.forEach((r) => {
      const line = [
        `"${r.file_id}"`,
        `"${r.original_name.replace(/"/g, '""')}"`,
        `"${r.format}"`,
        `"${r.size_human}"`,
        `"${new Date(r.created_at).toISOString()}"`,
        `"${r.label}"`,
        `"${(r.confidence * 100).toFixed(1)}%"`,
        `"${(r.fake_probability * 100).toFixed(1)}%"`,
        `"${(r.real_probability * 100).toFixed(1)}%"`,
        `"${r.model_name}"`,
        `"${r.processing_ms || 0}"`,
      ].join(',');
      csv += line + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="deepfake_audio_scan_audit.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHistory,
  deleteHistoryItem,
  getHistoryStats,
  exportHistoryCSV,
};
