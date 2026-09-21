/**
 * Study Session Controller (Authenticated & Scoped to req.user)
 * Handles CRUD operations for study sessions using SessionStore.
 */

const SessionStore = require('../services/sessionStore');

/**
 * @route   POST /api/sessions
 * @desc    Create a new study session for logged-in user
 */
const createSession = async (req, res, next) => {
  try {
    const { subject, startTime, endTime, duration, device, deviceCategory, clientSessionId, source, status, notes } = req.body;
    const userId = req.user ? req.user.id : 'student-default';

    // Calculate duration in seconds if not provided
    const sessionDuration = Math.max(1, parseInt(duration, 10) || Math.max(1, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000)));

    const newSession = await SessionStore.create({
      userId,
      subject: subject || (source === 'study-mode' ? 'Phone Focus Session' : 'General Study'),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: sessionDuration,
      device: device || 'Laptop',
      deviceCategory: deviceCategory || (device === 'Mobile' ? 'Phone Time' : 'Laptop Active Time'),
      source: source || 'manual',
      status: status || 'completed',
      clientSessionId,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Study session recorded successfully',
      data: newSession
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions
 * @desc    Get all study sessions for logged-in user
 */
const getSessions = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'student-default';
    const { filter, date, subject, device, source, status } = req.query;
    
    const formattedSessions = await SessionStore.find({
      userId,
      filter,
      date,
      subject,
      device,
      source,
      status
    });

    res.status(200).json({
      success: true,
      count: formattedSessions.length,
      data: formattedSessions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a single study session by ID (must belong to logged-in user)
 */
const getSessionById = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'student-default';
    const session = await SessionStore.findById(req.params.id);

    if (!session || (session.userId && session.userId !== userId)) {
      return res.status(404).json({
        success: false,
        message: `No session found with id ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/sessions/:id
 * @desc    Update a study session (must belong to logged-in user)
 */
const updateSession = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'student-default';
    const existing = await SessionStore.findById(req.params.id);

    if (!existing || (existing.userId && existing.userId !== userId)) {
      return res.status(404).json({
        success: false,
        message: `No session found with id ${req.params.id}`
      });
    }

    const updated = await SessionStore.findByIdAndUpdate(req.params.id, req.body);

    res.status(200).json({
      success: true,
      message: 'Session updated successfully',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete a study session by ID (must belong to logged-in user)
 */
const deleteSession = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'student-default';
    const existing = await SessionStore.findById(req.params.id);

    if (!existing || (existing.userId && existing.userId !== userId)) {
      return res.status(404).json({
        success: false,
        message: `No session found with id ${req.params.id}`
      });
    }

    const deleted = await SessionStore.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Session deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/sessions
 * @desc    Clear all study sessions for logged-in user
 */
const clearAllSessions = async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : 'student-default';
    const result = await SessionStore.deleteMany(userId);

    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} study sessions successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  clearAllSessions
};
