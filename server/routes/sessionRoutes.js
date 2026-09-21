/**
 * Session Routes (Protected by JWT Auth)
 */
const express = require('express');
const router = express.Router();

const {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  clearAllSessions
} = require('../controllers/sessionController');

const { validateSessionInput } = require('../middleware/validateSession');
const { protect } = require('../middleware/authMiddleware');

// Protect all session routes
router.use(protect);

router.route('/')
  .post(validateSessionInput, createSession)
  .get(getSessions)
  .delete(clearAllSessions);

router.route('/:id')
  .get(getSessionById)
  .put(updateSession)
  .delete(deleteSession);

module.exports = router;
