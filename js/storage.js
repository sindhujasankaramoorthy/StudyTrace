/**
 * StudyTrace - LocalStorage Management Module (Build 2)
 * Handles persistence for sessions, active running session, and user preferences.
 */

const STORAGE_KEYS = {
  SESSIONS: 'studytrace_sessions',
  ACTIVE_SESSION: 'studytrace_active_session',
  DAILY_GOAL: 'studytrace_daily_goal_minutes'
};

const DEFAULT_GOAL_MINUTES = 180; // 3 hours default goal

// Helper to format ISO date to YYYY-MM-DD
function getSampleDateStr(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Enriched sample historical sessions for immediate visual excellence
const SAMPLE_SESSIONS = [
  {
    id: 'sample-1',
    subject: 'Data Structures & Algorithms',
    startTime: new Date(Date.now() - 86400000 * 3 - 5400000).toISOString(),
    endTime: new Date(Date.now() - 86400000 * 3).toISOString(),
    durationSeconds: 5400, // 1h 30m
    date: getSampleDateStr(3),
    device: 'Laptop'
  },
  {
    id: 'sample-2',
    subject: 'Computer Networks',
    startTime: new Date(Date.now() - 86400000 * 2 - 7200000).toISOString(),
    endTime: new Date(Date.now() - 86400000 * 2 - 3600000).toISOString(),
    durationSeconds: 3600, // 1h 00m
    date: getSampleDateStr(2),
    device: 'Laptop'
  },
  {
    id: 'sample-3',
    subject: 'Mathematics',
    startTime: new Date(Date.now() - 86400000 * 2 - 2700000).toISOString(),
    endTime: new Date(Date.now() - 86400000 * 2).toISOString(),
    durationSeconds: 2700, // 45m
    date: getSampleDateStr(2),
    device: 'Mobile'
  },
  {
    id: 'sample-4',
    subject: 'Operating Systems',
    startTime: new Date(Date.now() - 86400000 - 9000000).toISOString(),
    endTime: new Date(Date.now() - 86400000 - 3600000).toISOString(),
    durationSeconds: 5400, // 1h 30m
    date: getSampleDateStr(1),
    device: 'Laptop'
  },
  {
    id: 'sample-5',
    subject: 'Database Management Systems',
    startTime: new Date(Date.now() - 86400000 - 2400000).toISOString(),
    endTime: new Date(Date.now() - 86400000).toISOString(),
    durationSeconds: 2400, // 40m
    date: getSampleDateStr(1),
    device: 'Mobile'
  },
  {
    id: 'sample-6',
    subject: 'Data Structures & Algorithms',
    startTime: new Date(Date.now() - 5400000).toISOString(),
    endTime: new Date(Date.now() - 1800000).toISOString(),
    durationSeconds: 3600, // 1h 00m
    date: getSampleDateStr(0),
    device: 'Laptop'
  }
];

const Storage = {
  /**
   * Initialize storage with starter sample data if empty.
   */
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(SAMPLE_SESSIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DAILY_GOAL)) {
      localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, JSON.stringify(DEFAULT_GOAL_MINUTES));
    }
  },

  /**
   * Retrieve all completed sessions.
   * @returns {Array} Array of session objects
   */
  getSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading sessions from localStorage:', e);
      return [];
    }
  },

  /**
   * Save a newly completed session.
   * @param {Object} session
   * @returns {Array} Updated sessions array
   */
  saveSession(session) {
    const sessions = this.getSessions();
    sessions.unshift(session);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    return sessions;
  },

  /**
   * Delete a session by its ID.
   * @param {string} sessionId
   * @returns {Array} Updated sessions array
   */
  deleteSession(sessionId) {
    const sessions = this.getSessions().filter(s => s.id !== sessionId);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    return sessions;
  },

  /**
   * Clear all sessions from storage.
   */
  clearAllSessions() {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
  },

  /**
   * Restore default sample sessions.
   */
  resetSampleData() {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(SAMPLE_SESSIONS));
  },

  /**
   * Check and get currently active session if one is in progress.
   * @returns {Object|null}
   */
  getActiveSession() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading active session:', e);
      return null;
    }
  },

  /**
   * Persist the currently active running session so page reloads don't disrupt it.
   * @param {Object} activeSessionData
   */
  setActiveSession(activeSessionData) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(activeSessionData));
  },

  /**
   * Clear the active session key upon completion or cancellation.
   */
  clearActiveSession() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  },

  /**
   * Get the daily study goal in minutes.
   * @returns {number}
   */
  getDailyGoalMinutes() {
    try {
      const val = localStorage.getItem(STORAGE_KEYS.DAILY_GOAL);
      return val ? parseInt(JSON.parse(val), 10) : DEFAULT_GOAL_MINUTES;
    } catch (e) {
      return DEFAULT_GOAL_MINUTES;
    }
  },

  /**
   * Update the daily study goal in minutes.
   * @param {number} minutes
   */
  setDailyGoalMinutes(minutes) {
    const parsed = Math.max(15, parseInt(minutes, 10) || DEFAULT_GOAL_MINUTES);
    localStorage.setItem(STORAGE_KEYS.DAILY_GOAL, JSON.stringify(parsed));
    return parsed;
  }
};

window.Storage = Storage;
