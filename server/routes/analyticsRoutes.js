/**
 * Analytics Routes
 */
const express = require('express');
const router = express.Router();

const {
  getSummary,
  getChartData
} = require('../controllers/analyticsController');

// GET /api/analytics/summary
router.get('/summary', getSummary);

// GET /api/analytics/charts
router.get('/charts', getChartData);

module.exports = router;
