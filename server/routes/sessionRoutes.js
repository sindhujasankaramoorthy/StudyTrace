/**
 * Session Routes
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

router.route('/')
  .post(validateSessionInput, createSession)
  .get(getSessions)
  .delete(clearAllSessions);

router.route('/:id')
  .get(getSessionById)
  .put(updateSession)
  .delete(deleteSession);

module.exports = router;
