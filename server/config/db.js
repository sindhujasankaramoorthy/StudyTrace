/**
 * Database Configuration & Connection Manager
 * 
 * Supports:
 * 1. Cloud MongoDB Atlas (via MONGODB_URI in .env)
 * 2. Local MongoDB daemon (mongodb://127.0.0.1:27017/studytrace)
 * 3. Self-managed automated in-process MongoDB (via mongodb-memory-server)
 * 4. Fast resilient fallback adapter
 */

const mongoose = require('mongoose');

// Disable Mongoose command buffering so queries never hang if MongoDB is offline
mongoose.set('bufferCommands', false);

let isConnecting = false;
let memoryServerInstance = null;

const connectDB = async () => {
  if (isConnecting || mongoose.connection.readyState === 1) return;
  isConnecting = true;

  const envUri = process.env.MONGODB_URI;

  // 1. Try explicit Cloud MONGODB_URI if configured in .env (and not default localhost)
  if (envUri && !envUri.includes('127.0.0.1') && !envUri.includes('localhost')) {
    try {
      const conn = await mongoose.connect(envUri, { serverSelectionTimeoutMS: 3000 });
      console.log(`[Database] MongoDB Connected to Cloud URI: ${conn.connection.host}/${conn.connection.name}`);
      isConnecting = false;
      return conn;
    } catch (err) {
      console.warn(`[Database Warning] Could not connect to Cloud MONGODB_URI: ${err.message}`);
    }
  }

  // 2. Try local MongoDB daemon at 127.0.0.1:27017 (fast 500ms check)
  try {
    const conn = await mongoose.connect('mongodb://127.0.0.1:27017/studytrace', {
      serverSelectionTimeoutMS: 500
    });
    console.log(`[Database] MongoDB Connected to Localhost: ${conn.connection.host}/${conn.connection.name}`);
    isConnecting = false;
    return conn;
  } catch (err) {
    // Local daemon not running
  }

  // 3. Try automated self-managed in-process MongoDB via mongodb-memory-server
  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    if (!memoryServerInstance) {
      console.log('[Database] Auto-provisioning in-process MongoDB engine...');
      memoryServerInstance = await MongoMemoryServer.create();
    }
    const autoUri = memoryServerInstance.getUri();
    const conn = await mongoose.connect(autoUri);
    console.log(`====================================================`);
    console.log(`🚀 [Database] In-Process MongoDB started & connected automatically!`);
    console.log(`📡 [Database] Auto-generated URI: ${autoUri}`);
    console.log(`====================================================`);
    isConnecting = false;
    return conn;
  } catch (memErr) {
    console.warn(`[Database Warning] Could not start mongodb-memory-server: ${memErr.message}`);
    isConnecting = false;
    console.warn(`[Database Notice] Operating in fast in-memory resilient mode.`);
    return null;
  }
};

const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Periodic auto-reconnect retry every 15 seconds if MongoDB was offline at boot
setInterval(() => {
  if (!isDBConnected() && !isConnecting && !memoryServerInstance) {
    connectDB().catch(() => {});
  }
}, 15000);

module.exports = { connectDB, isDBConnected };
