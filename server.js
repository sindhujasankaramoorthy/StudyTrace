/**
 * StudyTrace Server Entry Point
 * Express application configured with MongoDB connection, API routes,
 * authentication, centralized error handling, and static client serving.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const { connectDB, isDBConnected } = require('./server/config/db');
const authRoutes = require('./server/routes/authRoutes');
const sessionRoutes = require('./server/routes/sessionRoutes');
const analyticsRoutes = require('./server/routes/analyticsRoutes');
const { notFoundHandler, errorHandler } = require('./server/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Core Middleware
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: isDBConnected() ? 'connected' : 'disconnected'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Fallback route for unmatched /api requests (returns clean JSON 404)
app.use('/api/*', notFoundHandler);

// Fallback for single-page app frontend routing (serves index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 StudyTrace Server running on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📦 MongoDB: ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studytrace'}`);
  console.log(`====================================================`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Process Error] Unhandled Rejection:', err);
});

module.exports = server;
