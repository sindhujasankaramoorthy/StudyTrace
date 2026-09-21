/**
 * StudyTrace - Live Session Timer Module
 * Handles live timing, accurate drift-free elapsed calculations, and formatting.
 */

class StudyTimer {
  constructor(onTickCallback) {
    this.onTick = onTickCallback || (() => {});
    this.intervalId = null;
    this.startTime = null;
    this.elapsedSeconds = 0;
    this.subject = 'General Study';
    this.device = 'Laptop';
  }

  /**
   * Start or resume the timer.
   * @param {string} subject - Study subject/topic
   * @param {string} device - Device identifier (Laptop, Mobile, etc.)
   * @param {number|null} existingStartTime - Timestamp if resuming an existing session
   */
  start(subject = 'General Study', device = 'Laptop', existingStartTime = null) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.subject = subject;
    this.device = device;
    this.startTime = existingStartTime || Date.now();

    // Calculate initial elapsed time if resuming
    this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.startTime) / 1000));
    this.onTick(this.formatTime(this.elapsedSeconds), this.elapsedSeconds);

    this.intervalId = setInterval(() => {
      this.elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.startTime) / 1000));
      this.onTick(this.formatTime(this.elapsedSeconds), this.elapsedSeconds);
    }, 1000);
  }

  /**
   * Stop the timer and compute session metrics.
   * @returns {Object} Session result { startTime, endTime, durationSeconds, subject, device }
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const endTime = Date.now();
    const finalDurationSeconds = this.startTime 
      ? Math.max(1, Math.floor((endTime - this.startTime) / 1000)) 
      : this.elapsedSeconds;

    const sessionSummary = {
      startTime: new Date(this.startTime || (endTime - finalDurationSeconds * 1000)).toISOString(),
      endTime: new Date(endTime).toISOString(),
      durationSeconds: finalDurationSeconds,
      subject: this.subject,
      device: this.device
    };

    this.startTime = null;
    this.elapsedSeconds = 0;
    return sessionSummary;
  }

  /**
   * Check if timer is running.
   * @returns {boolean}
   */
  isRunning() {
    return this.intervalId !== null;
  }

  /**
   * Format seconds into HH:MM:SS string.
   * @param {number} totalSeconds
   * @returns {string}
   */
  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}

// Export globally
window.StudyTimer = StudyTimer;
