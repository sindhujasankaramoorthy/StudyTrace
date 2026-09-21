/**
 * Analytics Service
 * Business logic for computing summary KPIs, streaks, and chart metrics.
 */

const SessionStore = require('./sessionStore');

// Helper to format ISO date to YYYY-MM-DD
function getLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format seconds into friendly duration string
function formatDuration(seconds) {
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
}

class AnalyticsService {
  /**
   * Calculate summary KPIs for a user across all sessions or filtered set.
   */
  static async getSummary(userId = 'student-default', filter = 'all', customDate = null) {
    const sessions = await SessionStore.find({ userId, filter, date: customDate });
    const allSessions = await SessionStore.find({ userId });

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const totalSessions = sessions.length;

    // Calculate Build 5 Specific Metrics across all user sessions
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // 1. Today Focused Seconds
    const todayFocusedSeconds = allSessions
      .filter(s => getLocalDateString(s.startTime) === todayStr)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    // 2. Weekly Focused Seconds (Current Week Mon-Sun)
    const currentDay = now.getDay();
    const diffToMon = (currentDay === 0 ? -6 : 1) - currentDay;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyFocusedSeconds = allSessions
      .filter(s => new Date(s.startTime) >= startOfWeek)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    // 3. Monthly Focused Seconds (Current Calendar Month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyFocusedSeconds = allSessions
      .filter(s => new Date(s.startTime) >= startOfMonth)
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    // 4. Phone Time Seconds
    const phoneTimeSeconds = allSessions
      .filter(s => s.deviceCategory === 'Phone Time' || s.device === 'Mobile')
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    // 5. Laptop Active Seconds
    const laptopActiveSeconds = allSessions
      .filter(s => s.deviceCategory === 'Laptop Active Time' || s.device === 'Desktop' || s.device === 'Laptop' || (!s.deviceCategory && s.device !== 'Mobile'))
      .reduce((sum, s) => sum + (s.duration || 0), 0);

    // Distinct active study days in this range
    const activeDates = new Set(sessions.map(s => getLocalDateString(s.startTime)));
    const activeDaysCount = activeDates.size || 1;
    const averageDailySeconds = totalSeconds > 0 ? Math.round(totalSeconds / activeDaysCount) : 0;

    // Longest Session
    let longestSession = null;
    if (sessions.length > 0) {
      longestSession = sessions.reduce((max, s) => ((s.duration || 0) > (max.duration || 0) ? s : max), sessions[0]);
    }

    // Most productive day of the week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    sessions.forEach(s => {
      const d = new Date(s.startTime);
      if (!isNaN(d.getTime())) {
        dayTotals[d.getDay()] += (s.duration || 0);
      }
    });

    let maxDayIdx = -1;
    let maxDayVal = 0;
    dayTotals.forEach((val, idx) => {
      if (val > maxDayVal) {
        maxDayVal = val;
        maxDayIdx = idx;
      }
    });
    const mostProductiveDay = maxDayIdx !== -1 
      ? `${dayNames[maxDayIdx]} (${formatDuration(maxDayVal)})` 
      : 'No data yet';

    // Streaks (computed across all historical sessions)
    const { currentStreak, longestStreak } = this.calculateStreaks(allSessions);

    return {
      totalSeconds,
      totalDurationFormatted: formatDuration(totalSeconds),
      totalHoursDecimal: parseFloat((totalSeconds / 3600).toFixed(1)),
      todayFocusedSeconds,
      todayFocusedFormatted: formatDuration(todayFocusedSeconds),
      weeklyFocusedSeconds,
      weeklyFocusedFormatted: formatDuration(weeklyFocusedSeconds),
      monthlyFocusedSeconds,
      monthlyFocusedFormatted: formatDuration(monthlyFocusedSeconds),
      phoneTimeSeconds,
      phoneTimeFormatted: formatDuration(phoneTimeSeconds),
      laptopActiveSeconds,
      laptopActiveFormatted: formatDuration(laptopActiveSeconds),
      totalSessions,
      averageDailySeconds,
      averageDailyFormatted: formatDuration(averageDailySeconds),
      longestSession: longestSession ? {
        durationFormatted: formatDuration(longestSession.duration),
        durationSeconds: longestSession.duration,
        subject: longestSession.subject,
        date: getLocalDateString(longestSession.startTime)
      } : null,
      mostProductiveDay,
      currentStreak,
      longestStreak
    };
  }

  /**
   * Calculate streaks in consecutive days
   */
  static calculateStreaks(allSessions) {
    if (!allSessions || allSessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    const studyDays = Array.from(
      new Set(
        allSessions
          .filter(s => (s.duration || 0) >= 60)
          .map(s => getLocalDateString(s.startTime))
      )
    ).sort();

    if (studyDays.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Longest streak
    let longest = 1;
    let currentRun = 1;
    for (let i = 1; i < studyDays.length; i++) {
      const prev = new Date(studyDays[i - 1]);
      const curr = new Date(studyDays[i]);
      const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentRun++;
        if (currentRun > longest) longest = currentRun;
      } else if (diff > 1) {
        currentRun = 1;
      }
    }

    // Current active streak
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    const daySet = new Set(studyDays);
    let currentStreak = 0;
    let checkDate = new Date();

    if (daySet.has(todayStr)) {
      checkDate = new Date();
    } else if (daySet.has(yesterdayStr)) {
      checkDate = yesterday;
    } else {
      return { currentStreak: 0, longestStreak: longest };
    }

    while (true) {
      const str = getLocalDateString(checkDate);
      if (daySet.has(str)) {
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
  }

  /**
   * Pre-aggregate chart data for weekly, monthly, and subject distributions
   */
  static async getChartData(userId = 'student-default') {
    const sessions = await SessionStore.find({ userId });

    // 1. Weekly breakdown (Mon - Sun)
    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekHours = [0, 0, 0, 0, 0, 0, 0];

    const today = new Date();
    const day = today.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalDateString(d);

      const daySec = sessions
        .filter(s => getLocalDateString(s.startTime) === dStr)
        .reduce((sum, s) => sum + (s.duration || 0), 0);

      weekHours[i] = parseFloat((daySec / 3600).toFixed(2));
    }

    // 2. Monthly breakdown
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabels = [];
    const monthHours = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      monthLabels.push(`${i}`);
      const daySec = sessions
        .filter(s => getLocalDateString(s.startTime) === dStr)
        .reduce((sum, s) => sum + (s.duration || 0), 0);
      monthHours.push(parseFloat((daySec / 3600).toFixed(2)));
    }

    // 3. Subject distribution
    const subjectMap = {};
    sessions.forEach(s => {
      const subj = s.subject || 'General Study';
      subjectMap[subj] = (subjectMap[subj] || 0) + (s.duration || 0);
    });

    const subjectLabels = Object.keys(subjectMap);
    const subjectHours = subjectLabels.map(subj => parseFloat((subjectMap[subj] / 3600).toFixed(2)));

    return {
      weekly: { labels: weekLabels, values: weekHours },
      monthly: { labels: monthLabels, values: monthHours },
      distribution: { labels: subjectLabels, values: subjectHours }
    };
  }
}

module.exports = AnalyticsService;
