/**
 * StudyTrace - Advanced Analytics & Visualization Module (Build 2)
 * Handles session filtering, detailed KPIs, streaks, and Chart.js visualizations.
 */

const Analytics = {
  weeklyChartInstance: null,
  monthlyChartInstance: null,
  distributionChartInstance: null,

  /**
   * Helper to format a local date into YYYY-MM-DD
   * @param {Date} date
   * @returns {string}
   */
  getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Format seconds into friendly human duration (e.g. "2h 45m", "35m", "40s")
   * @param {number} seconds
   * @returns {string}
   */
  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    if (mins > 0) {
      return `${mins}m`;
    }
    return `${secs}s`;
  },

  /**
   * Filter sessions by time range or custom date.
   * @param {Array} sessions
   * @param {string} filterType - 'today' | 'week' | 'month' | 'custom' | 'all'
   * @param {string} customDate - 'YYYY-MM-DD'
   * @returns {Array} Filtered sessions
   */
  filterSessions(sessions, filterType = 'all', customDate = null) {
    if (!sessions || sessions.length === 0) return [];
    const today = new Date();
    const todayStr = this.getLocalDateString(today);

    switch (filterType) {
      case 'today':
        return sessions.filter(s => s.date === todayStr);

      case 'week': {
        // Current calendar week starting Monday
        const day = today.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return sessions.filter(s => {
          const sessionDate = new Date(s.startTime || s.date);
          return sessionDate >= monday && sessionDate <= sunday;
        });
      }

      case 'month': {
        const yearMonth = todayStr.substring(0, 7); // 'YYYY-MM'
        return sessions.filter(s => s.date && s.date.startsWith(yearMonth));
      }

      case 'custom':
        if (!customDate) return sessions;
        return sessions.filter(s => s.date === customDate);

      case 'all':
      default:
        return sessions;
    }
  },

  /**
   * Calculate total study seconds for today.
   * @param {Array} sessions
   * @returns {number}
   */
  getTodayTotalSeconds(sessions) {
    const todayStr = this.getLocalDateString(new Date());
    return sessions
      .filter(s => s.date === todayStr)
      .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  },

  /**
   * Get total number of sessions completed today.
   * @param {Array} sessions
   * @returns {number}
   */
  getTodaySessionCount(sessions) {
    const todayStr = this.getLocalDateString(new Date());
    return sessions.filter(s => s.date === todayStr).length;
  },

  /**
   * Calculate detailed analytics metrics for the selected session subset.
   * @param {Array} filteredSessions
   * @param {Array} allSessions
   * @returns {Object}
   */
  calculateDetailedMetrics(filteredSessions, allSessions) {
    const totalSeconds = filteredSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const totalSessions = filteredSessions.length;

    // Distinct active study days in this filtered range
    const activeDates = new Set(
      filteredSessions
        .filter(s => (s.durationSeconds || 0) > 0)
        .map(s => s.date)
    );
    const activeDaysCount = activeDates.size || 1;
    const averageDailySeconds = totalSeconds > 0 ? Math.round(totalSeconds / activeDaysCount) : 0;

    // Longest Session
    let longestSession = null;
    if (filteredSessions.length > 0) {
      longestSession = filteredSessions.reduce((max, s) => {
        return (s.durationSeconds || 0) > (max.durationSeconds || 0) ? s : max;
      }, filteredSessions[0]);
    }

    // Most Productive Day of the Week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];

    filteredSessions.forEach(s => {
      const d = new Date(s.startTime || s.date);
      if (!isNaN(d.getTime())) {
        dayTotals[d.getDay()] += (s.durationSeconds || 0);
      }
    });

    let maxDayIndex = -1;
    let maxDayTime = 0;
    dayTotals.forEach((total, idx) => {
      if (total > maxDayTime) {
        maxDayTime = total;
        maxDayIndex = idx;
      }
    });

    const mostProductiveDay = maxDayIndex !== -1 
      ? `${dayNames[maxDayIndex]} (${this.formatDuration(maxDayTime)})`
      : 'No data yet';

    // Calculate Streaks (always across ALL historical sessions)
    const { currentStreak, longestStreak } = this.calculateStreaks(allSessions);

    return {
      totalSeconds,
      totalDurationFormatted: this.formatDuration(totalSeconds),
      totalHoursDecimal: (totalSeconds / 3600).toFixed(1),
      totalSessions,
      averageDailySeconds,
      averageDailyFormatted: this.formatDuration(averageDailySeconds),
      longestSession: longestSession ? {
        durationFormatted: this.formatDuration(longestSession.durationSeconds),
        subject: longestSession.subject || 'General Study',
        date: longestSession.date
      } : null,
      mostProductiveDay,
      currentStreak,
      longestStreak
    };
  },

  /**
   * Calculate current streak and all-time longest streak in consecutive days.
   * @param {Array} sessions
   * @returns {Object} { currentStreak: number, longestStreak: number }
   */
  calculateStreaks(sessions) {
    if (!sessions || sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Set of distinct dates with at least 1 minute of study
    const studyDays = Array.from(
      new Set(
        sessions
          .filter(s => (s.durationSeconds || 0) >= 60)
          .map(s => s.date)
      )
    ).sort(); // Ascending order YYYY-MM-DD

    if (studyDays.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // 1. Calculate All-time Longest Streak
    let longest = 1;
    let currentRun = 1;

    for (let i = 1; i < studyDays.length; i++) {
      const prev = new Date(studyDays[i - 1]);
      const curr = new Date(studyDays[i]);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentRun++;
        if (currentRun > longest) longest = currentRun;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }

    // 2. Calculate Current Active Streak
    const today = new Date();
    const todayStr = this.getLocalDateString(today);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = this.getLocalDateString(yesterday);

    const studyDaySet = new Set(studyDays);
    let currentStreak = 0;
    let checkDate = new Date(today);

    if (studyDaySet.has(todayStr)) {
      checkDate = new Date(today);
    } else if (studyDaySet.has(yesterdayStr)) {
      checkDate = new Date(yesterday);
    } else {
      return { currentStreak: 0, longestStreak: longest };
    }

    while (true) {
      const dateStr = this.getLocalDateString(checkDate);
      if (studyDaySet.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longest, currentStreak)
    };
  },

  /**
   * Helper for dashboard backward compatibility
   */
  calculateStreak(sessions) {
    return this.calculateStreaks(sessions).currentStreak;
  },

  /**
   * Extract data for the current week (Monday to Sunday)
   * @param {Array} sessions
   * @returns {Object} { labels: string[], valuesHours: number[] }
   */
  getCurrentWeekData(sessions) {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const valuesHours = [0, 0, 0, 0, 0, 0, 0];

    const today = new Date();
    const day = today.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = this.getLocalDateString(d);

      const daySeconds = sessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

      valuesHours[i] = parseFloat((daySeconds / 3600).toFixed(2));
    }

    return { labels, valuesHours };
  },

  /**
   * Extract data for the current month
   * @param {Array} sessions
   * @returns {Object} { labels: string[], valuesHours: number[] }
   */
  getCurrentMonthData(sessions) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const labels = [];
    const valuesHours = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      labels.push(`${d}`);

      const daySeconds = sessions
        .filter(s => s.date === dateStr)
        .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

      valuesHours.push(parseFloat((daySeconds / 3600).toFixed(2)));
    }

    return { labels, valuesHours };
  },

  /**
   * Extract subject distribution data
   * @param {Array} sessions
   * @returns {Object} { labels: string[], valuesHours: number[], colors: string[] }
   */
  getSubjectDistributionData(sessions) {
    const subjectMap = {};

    sessions.forEach(s => {
      const subj = (s.subject || 'General Study').trim();
      const sec = s.durationSeconds || 0;
      subjectMap[subj] = (subjectMap[subj] || 0) + sec;
    });

    const labels = Object.keys(subjectMap);
    const valuesHours = labels.map(subj => parseFloat((subjectMap[subj] / 3600).toFixed(2)));

    // Cyber aesthetic curated palette
    const basePalette = [
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#8b5cf6', // Purple
      '#f59e0b', // Amber
      '#3b82f6', // Blue
      '#ec4899', // Pink
      '#14b8a6'  // Teal
    ];

    const colors = labels.map((_, idx) => basePalette[idx % basePalette.length]);

    return { labels, valuesHours, colors };
  },

  /**
   * Render or update the Chart.js Weekly Bar Chart.
   */
  renderWeeklyChart(canvasId, sessions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const { labels, valuesHours } = this.getCurrentWeekData(sessions);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, '#06b6d4'); // Cyan
    gradient.addColorStop(1, '#0284c7');

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Hours Studied',
          data: valuesHours,
          backgroundColor: gradient,
          hoverBackgroundColor: '#22d3ee',
          borderRadius: 6,
          maxBarThickness: 34
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0a101f',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(6, 182, 212, 0.3)',
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => `${ctx.parsed.y}h (${Math.round(ctx.parsed.y * 60)}m)`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8', font: { family: "'Outfit', sans-serif", size: 11 } }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 3,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { family: "'Outfit', sans-serif", size: 10 },
              callback: (val) => `${val}h`
            }
          }
        }
      }
    };

    if (this.weeklyChartInstance) {
      this.weeklyChartInstance.data.labels = labels;
      this.weeklyChartInstance.data.datasets[0].data = valuesHours;
      this.weeklyChartInstance.update();
    } else {
      this.weeklyChartInstance = new Chart(ctx, config);
    }
  },

  /**
   * Render or update Monthly Study Trend Chart
   */
  renderMonthlyChart(canvasId, sessions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const { labels, valuesHours } = this.getCurrentMonthData(sessions);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.45)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Hours',
          data: valuesHours,
          borderColor: '#10b981',
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0a101f',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(16, 185, 129, 0.3)',
            borderWidth: 1,
            callbacks: {
              title: (items) => `Day ${items[0].label} of Month`,
              label: (ctx) => `${ctx.parsed.y} hrs`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              maxTicksLimit: 12
            }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 3,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#94a3b8',
              font: { size: 10 },
              callback: (v) => `${v}h`
            }
          }
        }
      }
    };

    if (this.monthlyChartInstance) {
      this.monthlyChartInstance.data.labels = labels;
      this.monthlyChartInstance.data.datasets[0].data = valuesHours;
      this.monthlyChartInstance.update();
    } else {
      this.monthlyChartInstance = new Chart(ctx, config);
    }
  },

  /**
   * Render or update Session / Subject Distribution Doughnut Chart
   */
  renderDistributionChart(canvasId, sessions) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const { labels, valuesHours, colors } = this.getSubjectDistributionData(sessions);
    const ctx = canvas.getContext('2d');

    // Handle empty data case
    const chartLabels = labels.length > 0 ? labels : ['No Sessions'];
    const chartData = valuesHours.length > 0 ? valuesHours : [1];
    const chartColors = colors.length > 0 ? colors : ['rgba(255,255,255,0.1)'];

    const config = {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: chartColors,
          borderColor: '#030712',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#cbd5e1',
              font: { family: "'Outfit', sans-serif", size: 11 },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            backgroundColor: '#0a101f',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${ctx.parsed} hrs`
            }
          }
        },
        cutout: '68%'
      }
    };

    if (this.distributionChartInstance) {
      this.distributionChartInstance.data.labels = chartLabels;
      this.distributionChartInstance.data.datasets[0].data = chartData;
      this.distributionChartInstance.data.datasets[0].backgroundColor = chartColors;
      this.distributionChartInstance.update();
    } else {
      this.distributionChartInstance = new Chart(ctx, config);
    }
  }
};

window.Analytics = Analytics;
