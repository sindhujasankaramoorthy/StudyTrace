/**
 * StudyTrace - Authentication Client Module (Build 4)
 * Handles token storage, user session management, registration, login requests,
 * and automatic migration of Guest Mode local sessions to Cloud MongoDB.
 */

const Auth = {
  TOKEN_KEY: 'studytrace_token',
  USER_KEY: 'studytrace_user',

  /**
   * Determine API base URL
   */
  getBaseUrl() {
    return (window.location.protocol.startsWith('http') && window.location.port !== '')
      ? `${window.location.origin}/api/auth`
      : 'http://localhost:5000/api/auth';
  },

  /**
   * Get currently stored JWT token
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY) || null;
  },

  /**
   * Get currently stored user info
   */
  getUser() {
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Check if user is currently logged in
   */
  isLoggedIn() {
    return !!this.getToken();
  },

  /**
   * Save token and user object upon successful auth
   */
  saveAuth(token, user) {
    if (token) localStorage.setItem(this.TOKEN_KEY, token);
    if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  /**
   * Clear auth session and log out
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  /**
   * Register a new user
   */
  async register(name, email, password) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (data.errors ? data.errors.join(', ') : 'Registration failed'));
      }

      if (data.token && data.user) {
        this.saveAuth(data.token, data.user);
        if (window.API && typeof API.syncGuestSessionsToCloud === 'function') {
          await API.syncGuestSessionsToCloud();
        }
      }
      return data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Log in an existing user
   */
  async login(email, password) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Invalid email or password');
      }

      if (data.token && data.user) {
        this.saveAuth(data.token, data.user);
        if (window.API && typeof API.syncGuestSessionsToCloud === 'function') {
          await API.syncGuestSessionsToCloud();
        }
      }
      return data;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Fetch current user profile from server
   */
  async fetchProfile() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${this.getBaseUrl()}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          this.logout();
        }
        return null;
      }

      const data = await res.json();
      if (data.user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      }
      return data.user;
    } catch (err) {
      return this.getUser();
    }
  }
};

window.Auth = Auth;
