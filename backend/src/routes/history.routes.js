/**
 * routes/history.routes.js
 * ─────────────────────────────────────────────────────────────
 * History, Statistics & Report Export Routes.
 * Members: Ashu (Member 2) & Samiksha (Member 4)
 * ─────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');
const { validateUuidParam } = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

// All history, statistics, and export operations require authentication
router.use(requireAuth);

router.get('/', historyController.getHistory);
router.get('/stats', historyController.getHistoryStats);
router.get('/export/csv', historyController.exportHistoryCSV);
router.delete('/:fileId', validateUuidParam('fileId'), historyController.deleteHistoryItem);

module.exports = router;
