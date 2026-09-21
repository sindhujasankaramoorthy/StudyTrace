/**
 * StudyTrace - Main Application Controller (Build 3)
 * Coordinates UI interactions, multi-view navigation, live timer lifecycle,
 * session filtering, advanced analytics, and data synchronization with
 * the Express/MongoDB REST API (with offline LocalStorage fallback).
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Local Storage (as local cache and offline fallback)
  Storage.init();

  // 2. DOM Elements - Views & Navigation
  const tabDashboard = document.getElementById('tab-dashboard');
  const tabHistory = document.getElementById('tab-history');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewHistory = document.getElementById('view-history');

  // DOM Elements - Dashboard View
  const timerDisplay = document.getElementById('timer-display');
  const timerStatus = document.getElementById('timer-status');
  const timerStatusDot = document.getElementById('timer-status-dot');
  const sessionCard = document.getElementById('session-controller-card');
  const subjectInput = document.getElementById('subject-input');
  const btnStart = document.getElementById('btn-start-session');
  const btnStop = document.getElementById('btn-stop-session');
  const quickTags = document.querySelectorAll('.quick-tag');
  
  // Dashboard Stats Elements
  const statTodayTime = document.getElementById('stat-today-time');
  const statTodaySessions = document.getElementById('stat-today-sessions');
  const statStreakDays = document.getElementById('stat-streak-days');
  const statStreakSubtitle = document.getElementById('stat-streak-subtitle');
  const statGoalProgress = document.getElementById('stat-goal-progress');
  const goalProgressBar = document.getElementById('goal-progress-bar');
  const statGoalPercent = document.getElementById('stat-goal-percent');
  const btnEditGoal = document.getElementById('btn-edit-goal');

  // Header & Device Elements
  const headerDate = document.getElementById('header-date');
  const deviceBadge = document.getElementById('header-device-badge');
  const headerBackendStatus = document.getElementById('header-backend-status');

  // Recent Sessions Elements (Dashboard)
  const recentSessionsContainer = document.getElementById('recent-sessions-container');
  const btnClearAll = document.getElementById('btn-clear-sessions');
  const btnAddSample = document.getElementById('btn-add-sample');

  // DOM Elements - History & Analytics View (Build 2)
  const filterButtons = document.querySelectorAll('.filter-btn');
  const filterCustomDateInput = document.getElementById('filter-custom-date');
  const btnClearDate = document.getElementById('btn-clear-date');
  const filterMatchCount = document.getElementById('filter-match-count');

  // Analytics KPI Elements
  const kpiTotalTime = document.getElementById('kpi-total-time');
  const kpiTotalHoursDecimal = document.getElementById('kpi-total-hours-decimal');
  const kpiAvgTime = document.getElementById('kpi-avg-time');
  const kpiSessionCount = document.getElementById('kpi-session-count');
  const kpiLongestDuration = document.getElementById('kpi-longest-duration');
  const kpiLongestSubject = document.getElementById('kpi-longest-subject');
  const kpiTopDay = document.getElementById('kpi-top-day');

  // Streak Banner Elements
  const streakCurrentVal = document.getElementById('streak-current-val');
  const streakCurrentSub = document.getElementById('streak-current-sub');
  const streakLongestVal = document.getElementById('streak-longest-val');

  // History Table Elements
  const historyTableBody = document.getElementById('history-table-body');
  const btnClearAllHistory = document.getElementById('btn-clear-all-history');

  // Current Filter State
  let activeFilter = 'all';
  let customDateValue = null;

  // Active Device Detection
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
  const currentDevice = isMobile ? 'Mobile' : 'Laptop';
  if (deviceBadge) {
    deviceBadge.textContent = isMobile ? '📱 Mobile' : '💻 Laptop';
  }

  // Set today's date in header
  if (headerDate) {
    const todayOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    headerDate.textContent = new Date().toLocaleDateString(undefined, todayOptions);
  }

  // 3. Backend REST Connection Status Indicator
  function updateBackendBadge(isOnline, details = null) {
    if (!headerBackendStatus) return;
    if (isOnline) {
      const dbText = (details && details.database === 'connected') ? ' (MongoDB)' : ' (Live REST)';
      headerBackendStatus.className = 'header-badge online';
      headerBackendStatus.innerHTML = `🟢 Cloud Synced${dbText}`;
      headerBackendStatus.title = (details && details.database === 'connected')
        ? 'Connected to StudyTrace Express & MongoDB REST API'
        : 'Connected to StudyTrace Express REST API (in-memory fallback)';
    } else {
      headerBackendStatus.className = 'header-badge offline';
      headerBackendStatus.innerHTML = `💾 Local Mode`;
      headerBackendStatus.title = 'Operating locally via LocalStorage fallback. Start server on :5000 to sync.';
    }
  }

  if (window.API) {
    API.onStatusChange(updateBackendBadge);
    API.checkHealth();
  } else {
    updateBackendBadge(false);
  }

  // 4. View Switcher Logic
  async function switchView(targetView) {
    if (targetView === 'dashboard') {
      tabDashboard.classList.add('active');
      tabHistory.classList.remove('active');
      viewDashboard.style.display = 'block';
      viewHistory.style.display = 'none';
      await refreshDashboard();
    } else if (targetView === 'history') {
      tabHistory.classList.add('active');
      tabDashboard.classList.remove('active');
      viewDashboard.style.display = 'none';
      viewHistory.style.display = 'block';
      await refreshHistoryAndAnalytics();
    }
  }

  tabDashboard.addEventListener('click', () => switchView('dashboard'));
  tabHistory.addEventListener('click', () => switchView('history'));

  // 5. Initialize Live Timer instance
  const timer = new StudyTimer((formattedTime, elapsedSeconds) => {
    timerDisplay.textContent = formattedTime;
    document.title = `(${formattedTime}) StudyTrace`;
  });

  // 6. Update UI State for Running/Idle Session
  function setSessionUIState(isRunning, subject = '') {
    if (isRunning) {
      sessionCard.classList.add('session-active');
      btnStart.disabled = true;
      btnStop.disabled = false;
      timerStatus.textContent = `Focusing on: ${subject || 'Study Session'}`;
      timerStatusDot.className = 'status-dot active';
      subjectInput.disabled = true;
    } else {
      sessionCard.classList.remove('session-active');
      btnStart.disabled = false;
      btnStop.disabled = true;
      timerStatus.textContent = 'Ready to focus';
      timerStatusDot.className = 'status-dot idle';
      subjectInput.disabled = false;
      timerDisplay.textContent = '00:00:00';
      document.title = 'StudyTrace — Cross-Device Study Tracker';
    }
  }

  // 7. Render Dashboard View
  async function refreshDashboard() {
    const sessions = window.API ? await API.getSessions() : Storage.getSessions();
    const todaySeconds = Analytics.getTodayTotalSeconds(sessions);
    const todaySessionsCount = Analytics.getTodaySessionCount(sessions);
    const streak = Analytics.calculateStreak(sessions);
    const dailyGoalMinutes = Storage.getDailyGoalMinutes();
    const goalSeconds = dailyGoalMinutes * 60;

    // A. Today's Focus Time
    statTodayTime.textContent = Analytics.formatDuration(todaySeconds);
    statTodaySessions.textContent = `${todaySessionsCount} session${todaySessionsCount === 1 ? '' : 's'} today`;

    // B. Daily Goal Progress
    const goalPercent = Math.min(100, Math.round((todaySeconds / goalSeconds) * 100));
    statGoalProgress.textContent = `${(todaySeconds / 3600).toFixed(1)} / ${(dailyGoalMinutes / 60).toFixed(1)} hrs`;
    statGoalPercent.textContent = `${goalPercent}%`;
    goalProgressBar.style.width = `${goalPercent}%`;
    if (goalPercent >= 100) {
      goalProgressBar.classList.add('goal-reached');
    } else {
      goalProgressBar.classList.remove('goal-reached');
    }

    // C. Study Streak
    statStreakDays.textContent = `${streak} Day${streak === 1 ? '' : 's'}`;
    if (streak > 0) {
      statStreakSubtitle.textContent = '🔥 Consistency is on track!';
    } else {
      statStreakSubtitle.textContent = 'Start a session to start your streak';
    }

    // D. Weekly Chart on Dashboard
    Analytics.renderWeeklyChart('weekly-chart-canvas', sessions);

    // E. Recent Sessions List (Dashboard)
    renderRecentSessionsDashboard(sessions);
  }

  // 8. Render Dashboard Recent Sessions List
  function renderRecentSessionsDashboard(sessions) {
    if (!sessions || sessions.length === 0) {
      recentSessionsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <p>No study sessions recorded yet.</p>
          <span class="empty-sub">Hit "Start Session" to log your focused time!</span>
        </div>
      `;
      return;
    }

    const sessionListHTML = sessions.slice(0, 6).map(session => {
      const sessionDate = new Date(session.startTime);
      const timeStr = sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = sessionDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const deviceIcon = session.device === 'Mobile' ? '📱' : '💻';
      const sessionId = session.id || session._id;

      return `
        <div class="session-row" data-id="${sessionId}">
          <div class="session-info">
            <div class="session-title-wrap">
              <span class="session-subject">${escapeHtml(session.subject || 'General Study')}</span>
              <span class="device-pill">${deviceIcon} ${session.device || 'Laptop'}</span>
            </div>
            <div class="session-timestamp">
              <span>📅 ${dateStr} at ${timeStr}</span>
            </div>
          </div>
          <div class="session-meta">
            <span class="duration-badge">${Analytics.formatDuration(session.durationSeconds || session.duration)}</span>
            <button class="btn-delete-session" title="Delete Session" data-id="${sessionId}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    recentSessionsContainer.innerHTML = sessionListHTML;

    // Attach delete handlers
    recentSessionsContainer.querySelectorAll('.btn-delete-session').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (window.API) {
          await API.deleteSession(id);
        } else {
          Storage.deleteSession(id);
        }
        await refreshDashboard();
        if (viewHistory.style.display !== 'none') {
          await refreshHistoryAndAnalytics();
        }
      });
    });
  }

  // 9. Render History & Advanced Analytics View (Build 2 + Build 3 REST Sync)
  async function refreshHistoryAndAnalytics() {
    const allSessions = window.API ? await API.getSessions() : Storage.getSessions();
    const filteredSessions = window.API
      ? await API.getSessions({ filter: activeFilter, date: customDateValue })
      : Analytics.filterSessions(allSessions, activeFilter, customDateValue);

    // A. Filter match badge
    const count = filteredSessions.length;
    filterMatchCount.textContent = `${count} session${count === 1 ? '' : 's'} in view`;

    // B. Calculate Metrics
    const metrics = Analytics.calculateDetailedMetrics(filteredSessions, allSessions);

    // C. Populate KPI Cards
    kpiTotalTime.textContent = metrics.totalDurationFormatted;
    kpiTotalHoursDecimal.textContent = `${metrics.totalHoursDecimal} hrs total`;
    kpiAvgTime.textContent = metrics.averageDailyFormatted;
    kpiSessionCount.textContent = metrics.totalSessions;
    
    if (metrics.longestSession) {
      kpiLongestDuration.textContent = metrics.longestSession.durationFormatted;
      kpiLongestSubject.textContent = `${metrics.longestSession.subject} (${metrics.longestSession.date})`;
      kpiLongestSubject.title = `${metrics.longestSession.subject} on ${metrics.longestSession.date}`;
    } else {
      kpiLongestDuration.textContent = '0m';
      kpiLongestSubject.textContent = 'No session yet';
    }

    kpiTopDay.textContent = metrics.mostProductiveDay;

    // D. Populate Streak Banner
    streakCurrentVal.textContent = `${metrics.currentStreak} Day${metrics.currentStreak === 1 ? '' : 's'}`;
    streakCurrentSub.textContent = metrics.currentStreak > 0 ? '🔥 Streak active!' : 'Start a session to build consistency';
    streakLongestVal.textContent = `${metrics.longestStreak} Day${metrics.longestStreak === 1 ? '' : 's'}`;

    // E. Render 3 Visual Analytics Charts
    Analytics.renderWeeklyChart('chart-analytics-week', allSessions);
    Analytics.renderMonthlyChart('chart-analytics-month', allSessions);
    Analytics.renderDistributionChart('chart-analytics-distribution', filteredSessions);

    // F. Render History Table
    renderHistoryTable(filteredSessions);
  }

  // 10. Render Detailed History Table
  function renderHistoryTable(sessions) {
    if (!sessions || sessions.length === 0) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
            <div style="font-size: 2rem; margin-bottom: 8px;">📂</div>
            <p style="font-weight: 500;">No sessions match the selected filter.</p>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Try choosing "All Time" or start a new study session.</span>
          </td>
        </tr>
      `;
      return;
    }

    const rowsHTML = sessions.map(session => {
      const startDate = new Date(session.startTime);
      const endDate = session.endTime ? new Date(session.endTime) : null;
      
      const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTimeStr = endDate ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
      const dateStr = session.date || (startDate && !isNaN(startDate) ? startDate.toISOString().split('T')[0] : '-');
      const deviceIcon = session.device === 'Mobile' ? '📱' : '💻';
      const sessionId = session.id || session._id;

      return `
        <tr data-id="${sessionId}">
          <td class="table-date-cell">${dateStr}</td>
          <td class="table-subject-cell">${escapeHtml(session.subject || 'General Study')}</td>
          <td class="table-time-cell">${startTimeStr}</td>
          <td class="table-time-cell">${endTimeStr}</td>
          <td><span class="duration-badge">${Analytics.formatDuration(session.durationSeconds || session.duration)}</span></td>
          <td><span class="device-pill">${deviceIcon} ${session.device || 'Laptop'}</span></td>
          <td>
            <button class="btn-delete-row" title="Delete session" data-id="${sessionId}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    historyTableBody.innerHTML = rowsHTML;

    // Attach row delete handlers
    historyTableBody.querySelectorAll('.btn-delete-row').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (window.API) {
          await API.deleteSession(id);
        } else {
          Storage.deleteSession(id);
        }
        await refreshDashboard();
        await refreshHistoryAndAnalytics();
      });
    });
  }

  // 11. Filter Bar Events
  filterButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      customDateValue = null;
      filterCustomDateInput.value = '';
      btnClearDate.style.display = 'none';
      await refreshHistoryAndAnalytics();
    });
  });

  filterCustomDateInput.addEventListener('change', async (e) => {
    if (e.target.value) {
      filterButtons.forEach(b => b.classList.remove('active'));
      activeFilter = 'custom';
      customDateValue = e.target.value;
      btnClearDate.style.display = 'inline-flex';
      await refreshHistoryAndAnalytics();
    }
  });

  btnClearDate.addEventListener('click', async () => {
    filterCustomDateInput.value = '';
    customDateValue = null;
    btnClearDate.style.display = 'none';
    activeFilter = 'all';
    filterButtons.forEach(b => {
      if (b.getAttribute('data-filter') === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });
    await refreshHistoryAndAnalytics();
  });

  // 12. Clear All History Action (Build 2 & 3)
  btnClearAllHistory.addEventListener('click', async () => {
    if (confirm('Are you sure you want to permanently delete all study history? This action cannot be undone.')) {
      if (window.API) {
        await API.clearAllSessions();
      } else {
        Storage.clearAllSessions();
      }
      await refreshDashboard();
      await refreshHistoryAndAnalytics();
    }
  });

  // Helper to escape HTML tags in subjects
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 13. Event Listeners for Session Start & Stop
  btnStart.addEventListener('click', () => {
    const subject = subjectInput.value.trim() || 'General Study';
    const startTime = Date.now();

    Storage.setActiveSession({
      startTime,
      subject,
      device: currentDevice
    });

    timer.start(subject, currentDevice, startTime);
    setSessionUIState(true, subject);
  });

  btnStop.addEventListener('click', async () => {
    if (!timer.isRunning()) return;

    const summary = timer.stop();
    Storage.clearActiveSession();

    // Create session record
    const todayStr = Analytics.getLocalDateString(new Date(summary.startTime));
    const newSession = {
      id: 'session_' + Date.now(),
      userId: 'student-default',
      subject: summary.subject,
      startTime: summary.startTime,
      endTime: summary.endTime,
      durationSeconds: summary.durationSeconds,
      duration: summary.durationSeconds,
      date: todayStr,
      device: summary.device
    };

    if (window.API) {
      await API.createSession(newSession);
    } else {
      Storage.saveSession(newSession);
    }

    setSessionUIState(false);
    await refreshDashboard();
    if (viewHistory.style.display !== 'none') {
      await refreshHistoryAndAnalytics();
    }
  });

  // Quick subject tags
  quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      if (!timer.isRunning()) {
        subjectInput.value = tag.getAttribute('data-subject');
        quickTags.forEach(t => t.classList.remove('selected'));
        tag.classList.add('selected');
      }
    });
  });

  // Daily Goal Editor
  btnEditGoal.addEventListener('click', async () => {
    const currentGoalMinutes = Storage.getDailyGoalMinutes();
    const currentGoalHours = (currentGoalMinutes / 60).toFixed(1);
    const input = prompt('Enter your daily study target in hours (e.g., 2, 3.5, 4):', currentGoalHours);
    
    if (input !== null) {
      const hours = parseFloat(input);
      if (!isNaN(hours) && hours > 0) {
        const minutes = Math.round(hours * 60);
        Storage.setDailyGoalMinutes(minutes);
        await refreshDashboard();
      }
    }
  });

  // Clear all sessions (Dashboard quick action)
  if (btnClearAll) {
    btnClearAll.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all recorded sessions?')) {
        if (window.API) {
          await API.clearAllSessions();
        } else {
          Storage.clearAllSessions();
        }
        await refreshDashboard();
        if (viewHistory.style.display !== 'none') {
          await refreshHistoryAndAnalytics();
        }
      }
    });
  }

  // Reset sample data
  if (btnAddSample) {
    btnAddSample.addEventListener('click', async () => {
      Storage.resetSampleData();
      await refreshDashboard();
      if (viewHistory.style.display !== 'none') {
        await refreshHistoryAndAnalytics();
      }
    });
  }

  // 14. Check and Resume Active Session on page reload
  const activeSession = Storage.getActiveSession();
  if (activeSession && activeSession.startTime) {
    subjectInput.value = activeSession.subject || 'General Study';
    timer.start(activeSession.subject, activeSession.device || currentDevice, activeSession.startTime);
    setSessionUIState(true, activeSession.subject);
  } else {
    setSessionUIState(false);
  }

  // Initial dashboard load
  refreshDashboard();
});
