/**
 * Analytics Routes (Protected by JWT Auth)
 */
const express = require('express');
const router = express.Router();

const {
  getSummary,
  getChartData
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

// Protect all analytics routes
router.use(protect);

// GET /api/analytics/summary
router.get('/summary', getSummary);

// GET /api/analytics/charts
router.get('/charts', getChartData);

module.exports = router;
