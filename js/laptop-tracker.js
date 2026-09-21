/**
 * js/laptop-tracker.js
 * 
 * Lightweight Laptop Interaction & Inactivity Tracker.
 * Tracks user keyboard and mouse activity during active study sessions.
 * If user is inactive beyond configurable threshold (default 60 seconds),
 * automatically pauses active session and marks device category as 'Laptop Active Time'.
 */

window.LaptopTracker = {
    inactivityThresholdMs: 60000, // 60 seconds default
    idleTimer: null,
    isMonitoring: false,
    isIdle: false,
    lastActivityTime: Date.now(),
    onIdleCallback: null,
    onActiveCallback: null,

    /**
     * Start monitoring user interaction events (mousemove, keydown, click, scroll, touch)
     */
    startMonitoring(options = {}) {
        if (options.thresholdSeconds) {
            this.inactivityThresholdMs = options.thresholdSeconds * 1000;
        }
        if (options.onIdle) this.onIdleCallback = options.onIdle;
        if (options.onActive) this.onActiveCallback = options.onActive;

        if (this.isMonitoring) return;
        this.isMonitoring = true;
        this.isIdle = false;
        this.lastActivityTime = Date.now();

        this._bindEvents();
        this._resetTimer();
        console.log(`[LaptopTracker] Monitoring active laptop interaction (Threshold: ${this.inactivityThresholdMs / 1000}s)`);
    },

    /**
     * Stop monitoring interaction events
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;
        this.isIdle = false;
        this._unbindEvents();
        if (this.idleTimer) clearTimeout(this.idleTimer);
        console.log("[LaptopTracker] Monitoring stopped");
    },

    /**
     * Reset inactivity countdown timer on active user event
     */
    handleUserActivity() {
        if (!this.isMonitoring) return;

        this.lastActivityTime = Date.now();

        if (this.isIdle) {
            this.isIdle = false;
            console.log("[LaptopTracker] User interaction resumed - Active Laptop Time");
            if (typeof this.onActiveCallback === 'function') {
                this.onActiveCallback();
            }
        }

        this._resetTimer();
    },

    _resetTimer() {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
            this.isIdle = true;
            console.log(`[LaptopTracker] Inactive for >${this.inactivityThresholdMs / 1000}s. Triggering auto-pause...`);
            if (typeof this.onIdleCallback === 'function') {
                this.onIdleCallback();
            }
        }, this.inactivityThresholdMs);
    },

    _bindEvents() {
        this._onEvent = this.handleUserActivity.bind(this);
        window.addEventListener('mousemove', this._onEvent, { passive: true });
        window.addEventListener('keydown', this._onEvent, { passive: true });
        window.addEventListener('click', this._onEvent, { passive: true });
        window.addEventListener('scroll', this._onEvent, { passive: true });
        window.addEventListener('touchstart', this._onEvent, { passive: true });
    },

    _unbindEvents() {
        if (this._onEvent) {
            window.removeEventListener('mousemove', this._onEvent);
            window.removeEventListener('keydown', this._onEvent);
            window.removeEventListener('click', this._onEvent);
            window.removeEventListener('scroll', this._onEvent);
            window.removeEventListener('touchstart', this._onEvent);
        }
    }
};
