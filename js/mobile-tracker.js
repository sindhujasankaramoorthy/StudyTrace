/**
 * js/mobile-tracker.js
 * 
 * Mobile Focus Mode Web Tracker & Simulation Integration.
 * Provides APIs to register mobile focus events, record session start/end timestamps,
 * and dispatch sessions to StudyTrace backend with deviceCategory="Phone Time".
 */

window.MobileTracker = {
    isFocusActive: false,
    startTime: null,
    clientSessionId: null,

    /**
     * Called when Android Focus Mode / DND mode is turned ON
     */
    onFocusStart(customSubject = "Phone Focus Session") {
        if (this.isFocusActive) return;
        this.isFocusActive = true;
        this.startTime = new Date();
        this.clientSessionId = 'mob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        console.log(`[MobileTracker] Focus Mode Started at ${this.startTime.toISOString()} (ID: ${this.clientSessionId})`);
        
        if (window.onMobileTrackerStateChange) {
            window.onMobileTrackerStateChange(true, "Phone Focus Active");
        }
    },

    /**
     * Called when Android Focus Mode / DND mode is turned OFF
     */
    async onFocusEnd() {
        if (!this.isFocusActive || !this.startTime) return null;
        const endTime = new Date();
        const durationSeconds = Math.max(1, Math.round((endTime.getTime() - this.startTime.getTime()) / 1000));
        const sessionId = this.clientSessionId;

        const sessionPayload = {
            subject: "Phone Focus Session",
            category: "General",
            deviceCategory: "Phone Time",
            device: "Mobile",
            startTime: this.startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: durationSeconds,
            clientSessionId: sessionId,
            notes: "Tracked via Android Focus Mode / Device Interaction"
        };

        // Reset local state
        this.isFocusActive = false;
        this.startTime = null;
        this.clientSessionId = null;

        if (window.onMobileTrackerStateChange) {
            window.onMobileTrackerStateChange(false, "Phone Focus Idle");
        }

        try {
            console.log("[MobileTracker] Syncing phone focus session to backend...", sessionPayload);
            const response = await API.createSession(sessionPayload);
            if (typeof loadHistory === 'function') await loadHistory();
            if (typeof updateAnalyticsUI === 'function') await updateAnalyticsUI();
            return response;
        } catch (err) {
            console.error("[MobileTracker] Failed to sync phone session:", err);
            return null;
        }
    },

    /**
     * Helper to toggle simulated focus mode for testing
     */
    toggleSimulatedFocus() {
        if (this.isFocusActive) {
            return this.onFocusEnd();
        } else {
            this.onFocusStart();
            return Promise.resolve({ status: "started" });
        }
    }
};
