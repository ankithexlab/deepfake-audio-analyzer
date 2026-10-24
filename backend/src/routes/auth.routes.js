/**
 * routes/auth.routes.js
 * ─────────────────────────────────────────────────────────────
 * User Authentication Endpoints.
 * Member 2: Backend & Database (Ashu)
 * ─────────────────────────────────────────────────────────────
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/guest', authController.guestLogin);
router.get('/me', requireAuth, authController.getProfile);

module.exports = router;
