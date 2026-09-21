/**
 * Study Session Controller
 * Handles CRUD operations for study sessions using SessionStore.
 */

const SessionStore = require('../services/sessionStore');

/**
 * @route   POST /api/sessions
 * @desc    Create a new study session
 */
const createSession = async (req, res, next) => {
  try {
    const { userId, subject, startTime, endTime, duration, device } = req.body;

    // Calculate duration in seconds if not provided
    const sessionDuration = duration || Math.max(1, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000));

    const newSession = await SessionStore.create({
      userId: userId || 'student-default',
      subject: subject || 'General Study',
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration: sessionDuration,
      device: device || 'Laptop'
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
 * @desc    Get all study sessions (supports query: filter, date, subject, device)
 */
const getSessions = async (req, res, next) => {
  try {
    const { userId = 'student-default', filter, date, subject, device } = req.query;
    
    const formattedSessions = await SessionStore.find({
      userId,
      filter,
      date,
      subject,
      device
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
 * @desc    Get a single study session by ID
 */
const getSessionById = async (req, res, next) => {
  try {
    const session = await SessionStore.findById(req.params.id);

    if (!session) {
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
 * @desc    Update a study session
 */
const updateSession = async (req, res, next) => {
  try {
    const updated = await SessionStore.findByIdAndUpdate(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `No session found with id ${req.params.id}`
      });
    }

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
 * @desc    Delete a study session by ID
 */
const deleteSession = async (req, res, next) => {
  try {
    const deleted = await SessionStore.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: `No session found with id ${req.params.id}`
      });
    }

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
 * @desc    Clear all study sessions for a user
 */
const clearAllSessions = async (req, res, next) => {
  try {
    const userId = req.query.userId || 'student-default';
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
