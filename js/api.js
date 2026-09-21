/**
 * StudyTrace - API Client & Data Sync Service (Build 4 - Strict Auth Requirement)
 * Communicates strictly with Express/MongoDB backend using JWT authentication.
 */

const API = {
  // Determine API root based on current origin or default to port 5000
  baseUrl: (window.location.protocol.startsWith('http') && window.location.port !== '') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:5000/api',

  isServerOnline: false,
  statusListeners: [],

  /**
   * Helper to construct request headers with JWT token
   */
  getHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (typeof Auth !== 'undefined' && Auth.getToken()) {
      headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    }
    return headers;
  },

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
   * Fetch sessions for authenticated user
   */
  async getSessions(params = {}) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      return [];
    }

    const query = new URLSearchParams();
    if (params.filter && params.filter !== 'all') query.append('filter', params.filter);
    if (params.date) query.append('date', params.date);
    if (params.subject) query.append('subject', params.subject);
    if (params.device) query.append('device', params.device);

    const url = `${this.baseUrl}/sessions${query.toString() ? '?' + query.toString() : ''}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (res.status === 401) {
        if (typeof Auth !== 'undefined') Auth.logout();
        return [];
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json && json.success && Array.isArray(json.data)) {
        this._notifyStatus(true);
        if (!params.filter || params.filter === 'all') {
          try {
            localStorage.setItem('studytrace_sessions', JSON.stringify(json.data));
          } catch (e) {
            console.warn('Could not mirror to localStorage cache:', e);
          }
        }
        return json.data;
      }
      return [];
    } catch (err) {
      console.warn('[API] Could not fetch sessions from backend:', err.message);
      this._notifyStatus(false);
      return [];
    }
  },

  /**
   * GET /api/sessions/:id
   */
  async getSessionById(id) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) return null;

    try {
      const res = await fetch(`${this.baseUrl}/sessions/${id}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data;
    } catch (err) {
      return null;
    }
  },

  /**
   * POST /api/sessions
   * Save a new study session (Requires mandatory authentication)
   */
  async createSession(sessionData) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      throw new Error('Please sign in or create an account to record your study session.');
    }

    const user = Auth.getUser();
    const payload = {
      userId: user ? user.id : null,
      subject: sessionData.subject || 'General Study',
      startTime: sessionData.startTime,
      endTime: sessionData.endTime,
      duration: sessionData.durationSeconds || sessionData.duration,
      device: sessionData.device || 'Laptop'
    };

    try {
      const res = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      if (res.status === 401) {
        Auth.logout();
        throw new Error('Session expired. Please sign in again.');
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `HTTP ${res.status}`);
      }

      const json = await res.json();
      this._notifyStatus(true);
      return json.data;
    } catch (err) {
      console.warn('[API] POST /api/sessions failed:', err.message);
      this._notifyStatus(false);
      throw err;
    }
  },

  /**
   * PUT /api/sessions/:id
   */
  async updateSession(id, updateData) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) return null;

    try {
      const res = await fetch(`${this.baseUrl}/sessions/${id}`, {
        method: 'PUT',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updateData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this._notifyStatus(true);
      return json.data;
    } catch (err) {
      return null;
    }
  },

  /**
   * DELETE /api/sessions/:id
   */
  async deleteSession(id) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) return false;

    try {
      const res = await fetch(`${this.baseUrl}/sessions/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (res.ok) {
        this._notifyStatus(true);
        return true;
      }
    } catch (err) {
      this._notifyStatus(false);
    }
    return false;
  },

  /**
   * DELETE /api/sessions
   */
  async clearAllSessions() {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) return false;

    try {
      const res = await fetch(`${this.baseUrl}/sessions`, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      if (res.ok) {
        this._notifyStatus(true);
        return true;
      }
    } catch (err) {
      this._notifyStatus(false);
    }
    return false;
  },

  /**
   * GET /api/analytics/summary
   */
  async getAnalyticsSummary(filter = 'all', date = null) {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
      return Analytics.calculateDetailedMetrics([], []);
    }

    const query = new URLSearchParams({ filter });
    if (date) query.append('date', date);

    try {
      const res = await fetch(`${this.baseUrl}/analytics/summary?${query.toString()}`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success) {
        this._notifyStatus(true);
        return json.data;
      }
      return Analytics.calculateDetailedMetrics([], []);
    } catch (err) {
      this._notifyStatus(false);
      return Analytics.calculateDetailedMetrics([], []);
    }
  },

  /**
   * GET /api/analytics/charts
   */
  async getChartData() {
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) return null;

    try {
      const res = await fetch(`${this.baseUrl}/analytics/charts`, {
        headers: this.getHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json && json.success) {
        this._notifyStatus(true);
        return json.data;
      }
      return null;
    } catch (err) {
      this._notifyStatus(false);
      return null;
    }
  }
};

window.API = API;
