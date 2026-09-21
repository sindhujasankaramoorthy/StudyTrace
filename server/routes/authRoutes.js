/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/me (Protected)
router.get('/me', protect, getMe);

module.exports = router;
