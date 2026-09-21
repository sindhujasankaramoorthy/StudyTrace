/**
 * Analytics Controller
 * Handles requests for KPI summaries and chart metrics.
 */

const AnalyticsService = require('../services/analyticsService');

/**
 * @route   GET /api/analytics/summary
 * @desc    Get aggregated KPIs (totals, averages, longest session, top day, streaks)
 */
const getSummary = async (req, res, next) => {
  try {
    const { userId = 'student-default', filter = 'all', date = null } = req.query;
    const summary = await AnalyticsService.getSummary(userId, filter, date);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/analytics/charts
 * @desc    Get precomputed chart data for weekly, monthly, and subject distributions
 */
const getChartData = async (req, res, next) => {
  try {
    const { userId = 'student-default' } = req.query;
    const chartData = await AnalyticsService.getChartData(userId);

    res.status(200).json({
      success: true,
      data: chartData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getChartData
};
