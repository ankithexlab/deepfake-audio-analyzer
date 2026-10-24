/**
 * services/upload.service.js
 * ─────────────────────────────────────────────────────────────
 * Business logic for file upload operations with PostgreSQL sync.
 * Member 2: Backend & Database (Ashu)
 * ─────────────────────────────────────────────────────────────
 */

const { buildFileInfo, safeDeleteFile } = require('../utils/fileHelper');
const db = require('../config/db.config');
const logger = require('../utils/logger');

// In-Memory Fast Cache for instant response
const fileStore = new Map();

/**
 * Hydrates in-memory cache with records from PostgreSQL on boot.
 */
async function syncFromDatabase() {
  try {
    const res = await db.query(`
      SELECT 
        a.id AS "fileId",
        a.user_id AS "userId",
        a.original_name AS "originalName",
        a.mime_type AS "mimeType",
        a.format,
        a.size_bytes AS "sizeBytes",
        a.size_human AS "sizeHuman",
        a.saved_path AS "savedPath",
        a.saved_filename AS "savedFilename",
        a.status,
        a.created_at AS "uploadedAt",
        p.is_deepfake,
        p.label,
        p.confidence,
        p.fake_probability,
        p.real_probability,
        p.model_name,
        p.model_type,
        p.model_version,
        p.features_used,
        p.processing_ms
      FROM audio_files a
      LEFT JOIN predictions p ON a.id = p.file_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);

    res.rows.forEach((r) => {
      const record = {
        fileId: r.fileId,
        userId: r.userId,
        originalName: r.originalName,
        mimeType: r.mimeType,
        format: r.format,
        sizeBytes: r.sizeBytes,
        sizeHuman: r.sizeHuman,
        savedPath: r.savedPath,
        savedFilename: r.savedFilename,
        status: r.status,
        uploadedAt: r.uploadedAt,
        analysisResult: r.label ? {
          isDeepfake: r.is_deepfake,
          label: r.label,
          confidence: r.confidence,
          fakeProbability: r.fake_probability,
          realProbability: r.real_probability,
          modelName: r.model_name,
          modelType: r.model_type,
          modelVersion: r.model_version,
          featuresUsed: r.features_used,
          processingMs: r.processing_ms,
        } : null,
      };
      fileStore.set(record.fileId, record);
    });

    logger.info(`Synced ${res.rows.length} audio records from PostgreSQL into memory cache.`);
  } catch (err) {
    logger.warn('Could not sync initial records from PostgreSQL (will retry on demand)', { error: err.message });
  }
}

/**
 * Process and persist a newly uploaded file.
 * Saves to both in-memory cache and PostgreSQL.
 *
 * @param {Express.Multer.File} multerFile
 * @param {string|null} [userId]
 * @returns {Object}
 */
function storeUploadedFile(multerFile, userId = null) {
  const fileInfo = buildFileInfo(multerFile);

  const record = {
    ...fileInfo,
    userId: userId || null,
    uploadedAt: new Date().toISOString(),
    status: 'pending',
    analysisResult: null,
  };

  fileStore.set(record.fileId, record);

  // Asynchronous write to PostgreSQL
  db.query(
    `INSERT INTO audio_files (id, user_id, original_name, format, mime_type, size_bytes, size_human, saved_path, saved_filename, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
    [
      record.fileId,
      record.userId,
      record.originalName,
      record.format,
      record.mimeType,
      record.sizeBytes,
      record.sizeHuman,
      record.savedPath,
      record.savedFilename,
      record.status,
    ]
  ).catch((err) => {
    logger.error('Failed to persist audio_file to PostgreSQL', { fileId: record.fileId, error: err.message });
  });

  logger.info(`File stored in DB and memory: ${record.fileId}`);
  return record;
}

/**
 * Retrieve a file record by fileId.
 */
function getFileById(fileId) {
  return fileStore.get(fileId) || null;
}

/**
 * Delete file from disk, memory, and PostgreSQL.
 */
function deleteFile(fileId) {
  const record = fileStore.get(fileId);

  if (record) {
    safeDeleteFile(record.savedPath);
    fileStore.delete(fileId);
  }

  db.query('DELETE FROM audio_files WHERE id = $1', [fileId]).catch((err) => {
    logger.error('Failed to delete audio_file from PostgreSQL', { fileId, error: err.message });
  });

  return { success: true, message: 'File deleted successfully.' };
}

/**
 * List all stored file records.
 */
function listAllFiles() {
  return Array.from(fileStore.values());
}

/**
 * Update analysis result and persist to PostgreSQL predictions & reports tables.
 */
async function updateAnalysisResult(fileId, status, analysisResult = null) {
  const record = fileStore.get(fileId);
  if (!record) return null;

  record.status = status;
  record.analysisResult = analysisResult;
  fileStore.set(fileId, record);

  try {
    // Update status in PostgreSQL
    await db.query('UPDATE audio_files SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [status, fileId]);

    // If completed with valid AI result, save prediction & report record
    if (status === 'completed' && analysisResult) {
      const isDeepfake = analysisResult.isDeepfake || analysisResult.label === 'FAKE';
      const featuresSummary = record.preprocessing?.featuresSummary || null;
      const visualizations = record.preprocessing?.visualizations || null;

      const predRes = await db.query(
        `INSERT INTO predictions 
         (file_id, user_id, is_deepfake, label, confidence, fake_probability, real_probability, model_name, model_version, model_type, features_used, features_summary, visualizations, processing_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [
          fileId,
          record.userId || null,
          isDeepfake,
          analysisResult.label,
          analysisResult.confidence,
          analysisResult.fakeProbability,
          analysisResult.realProbability,
          analysisResult.modelName || 'DeepfakeDetector',
          analysisResult.modelVersion || '1.0.0',
          analysisResult.modelType || 'trained',
          JSON.stringify(analysisResult.featuresUsed || []),
          JSON.stringify(featuresSummary),
          JSON.stringify(visualizations),
          analysisResult.processingMs || 0,
        ]
      );

      const predictionId = predRes.rows[0]?.id;
      // Auto-generate report entry
      await db.query(
        `INSERT INTO reports (file_id, prediction_id, user_id, report_title, report_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          fileId,
          predictionId,
          record.userId || null,
          `Forensic Report for ${record.originalName}`,
          JSON.stringify({
            fileRecord: record,
            analysisResult,
            featuresSummary,
            verdict: analysisResult.label,
            confidence: analysisResult.confidence,
          }),
        ]
      ).catch((repErr) => logger.warn('Failed to insert report in DB', { error: repErr.message }));
    }
  } catch (dbErr) {
    logger.error('Failed to persist analysisResult to PostgreSQL', { fileId, error: dbErr.message });
  }

  return record;
}

module.exports = {
  syncFromDatabase,
  storeUploadedFile,
  getFileById,
  deleteFile,
  listAllFiles,
  updateAnalysisResult,
};
