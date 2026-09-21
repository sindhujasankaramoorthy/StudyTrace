/**
 * StudyTrace - API Client & Data Sync Service (Build 3)
 * Provides seamless communication with the Express/MongoDB REST backend,
 * with intelligent automatic fallback to LocalStorage when running offline.
 */

const API = {
  // Determine API root based on current origin or default to port 5000
  baseUrl: (window.location.protocol.startsWith('http') && window.location.port !== '') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:5000/api',

  isServerOnline: false,
  statusListeners: [],

  /**
   * Register listener for connection status changes
   */
  onStatusChange(callback) {
    if (typeof callback === 'function') {
      this.statusListeners.push(callback);
    }
  },

  /**
   * Notify listeners about connection state
   */
  _notifyStatus(status, details = null) {
    this.isServerOnline = status;
    this.statusListeners.forEach(cb => {
      try { cb(status, details); } catch (e) { console.error(e); }
    });
  },

  /**
   * Ping backend health endpoint
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        this._notifyStatus(true, data);
        return true;
      } else {
        this._notifyStatus(false);
        return false;
      }
    } catch (err) {
      this._notifyStatus(false);
      return false;
    }
  },

  /**
   * GET /api/sessions
   * Fetch sessions with optional query parameters (filter, date, subject, device)
   */
  async getSessions(params = {}) {
    const query = new URLSearchParams();
    if (params.filter && params.filter !== 'all') query.append('filter', params.filter);
    if (params.date) query.append('date', params.date);
    if (params.subject) query.append('subject', params.subject);
    if (params.device) query.append('device', params.device);

    const url = `${this.baseUrl}/sessions${query.toString() ? '?' + query.toString() : ''}`;

    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json && json.success && Array.isArray(json.data)) {
        this._notifyStatus(true);
        // If query is unfiltered, mirror to LocalStorage cache
        if (!params.filter || params.filter === 'all') {
          try {
            localStorage.setItem('studytrace_sessions', JSON.stringify(json.data));
          } catch (e) {
            console.warn('Could not mirror to localStorage cache:', e);
          }
        }
        return json.data;
      }
      throw new Error('Malformed API response');
    } catch (err) {
      console.warn('[API] Could not fetch sessions from backend, falling back to local storage:', err.message);
      this._notifyStatus(false);
      // Seamless LocalStorage Fallback
      let localSessions = Storage.getSessions();
      if (params.filter && typeof Analytics !== 'undefined') {
        localSessions = Analytics.filterSessions(localSessions, params.filter, params.date);
      }
      return localSessions;
    }
  },

  /**
   * GET /api/sessions/:id
   * Fetch single session by ID
   */
  async getSessionById(id) {
    try {
      const res = await fetch(`${this.baseUrl}/sessions/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      console.warn(`[API] getSessionById fallback for ${id}`);
      return Storage.getSessions().find(s => s.id === id) || null;
    }
  },

  /**
   * POST /api/sessions
   * Save a newly completed session
   */
  async createSession(sessionData) {
    const payload = {
      userId: sessionData.userId || 'student-default',
      subject: sessionData.subject || 'General Study',
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration: sessionData.durationSeconds || sessionData.duration,
      device: sessionData.device || 'Laptop'
    };

    // Always mirror to local storage immediately so no data is ever lost
    const localSession = {
      id: sessionData.id || 'session_' + Date.now(),
      subject: payload.subject,
      startTime: payload.startTime,
      endTime: payload.endTime,
      durationSeconds: payload.duration,
      date: sessionData.date || new Date(payload.startTime).toISOString().split('T')[0],
      device: payload.device
    };
    Storage.saveSession(localSession);

    try {
      const res = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      this._notifyStatus(true);
      return json.data;
    } catch (err) {
      console.warn('[API] POST /api/sessions failed, saved in local storage fallback:', err.message);
      this._notifyStatus(false);
      return localSession;
    }
  },

  /**
   * PUT /api/sessions/:id
   * Update an existing session
   */
  async updateSession(id, updateData) {
    try {
      const res = await fetch(`${this.baseUrl}/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this._notifyStatus(true);
      return json.data;
    } catch (err) {
      console.warn(`[API] PUT /api/sessions/${id} failed:`, err.message);
      return null;
    }
  },

  /**
   * DELETE /api/sessions/:id
   * Remove a single session
   */
  async deleteSession(id) {
    // Mirror locally
    Storage.deleteSession(id);

    try {
      const res = await fetch(`${this.baseUrl}/sessions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        this._notifyStatus(true);
        return true;
      }
    } catch (err) {
      console.warn(`[API] DELETE /api/sessions/${id} failed on backend, removed locally:`, err.message);
      this._notifyStatus(false);
    }
    return true;
  },

  /**
   * DELETE /api/sessions
   * Clear all sessions
   */
  async clearAllSessions() {
    Storage.clearAllSessions();

    try {
      const res = await fetch(`${this.baseUrl}/sessions`, {
        method: 'DELETE'
      });
      if (res.ok) {
        this._notifyStatus(true);
        return true;
      }
    } catch (err) {
      console.warn('[API] DELETE /api/sessions failed on backend, cleared locally:', err.message);
      this._notifyStatus(false);
    }
    return true;
  },

  /**
   * GET /api/analytics/summary
   */
  async getAnalyticsSummary(filter = 'all', date = null) {
    const query = new URLSearchParams({ filter });
    if (date) query.append('date', date);

    try {
      const res = await fetch(`${this.baseUrl}/analytics/summary?${query.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success) {
        this._notifyStatus(true);
        return json.data;
      }
      throw new Error('Invalid analytics response');
    } catch (err) {
      // Offline fallback: compute on client
      this._notifyStatus(false);
      const allSessions = Storage.getSessions();
      const filtered = Analytics.filterSessions(allSessions, filter, date);
      return Analytics.calculateDetailedMetrics(filtered, allSessions);
    }
  },

  /**
   * GET /api/analytics/charts
   */
  async getChartData() {
    try {
      const res = await fetch(`${this.baseUrl}/analytics/charts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success) {
        this._notifyStatus(true);
        return json.data;
      }
      throw new Error('Invalid charts response');
    } catch (err) {
      this._notifyStatus(false);
      return null;
    }
  }
};

window.API = API;
