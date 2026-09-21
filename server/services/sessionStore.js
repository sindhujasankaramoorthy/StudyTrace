/**
 * Session Data Store Adapter
 * Seamlessly routes queries to MongoDB (Mongoose) when connected,
 * or to a fast in-memory store when MongoDB is offline (e.g. ECONNREFUSED).
 * Completely eliminates Mongoose buffering timeout errors.
 */

const mongoose = require('mongoose');
const Session = require('../models/Session');
const { isDBConnected } = require('../config/db');

// Helper to format ISO date to YYYY-MM-DD
function getLocalDateString(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initial in-memory starter sessions
let inMemorySessions = [
  {
    _id: 'sample-1',
    id: 'sample-1',
    userId: 'student-default',
    subject: 'Data Structures & Algorithms',
    startTime: new Date(Date.now() - 86400000 * 3 - 5400000),
    endTime: new Date(Date.now() - 86400000 * 3),
    duration: 5400,
    durationSeconds: 5400,
    date: getLocalDateString(Date.now() - 86400000 * 3),
    device: 'Laptop',
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  {
    _id: 'sample-2',
    id: 'sample-2',
    userId: 'student-default',
    subject: 'Computer Networks',
    startTime: new Date(Date.now() - 86400000 * 2 - 7200000),
    endTime: new Date(Date.now() - 86400000 * 2 - 3600000),
    duration: 3600,
    durationSeconds: 3600,
    date: getLocalDateString(Date.now() - 86400000 * 2),
    device: 'Laptop',
    createdAt: new Date(Date.now() - 86400000 * 2)
  },
  {
    _id: 'sample-3',
    id: 'sample-3',
    userId: 'student-default',
    subject: 'Mathematics',
    startTime: new Date(Date.now() - 86400000 * 2 - 2700000),
    endTime: new Date(Date.now() - 86400000 * 2),
    duration: 2700,
    durationSeconds: 2700,
    date: getLocalDateString(Date.now() - 86400000 * 2),
    device: 'Mobile',
    createdAt: new Date(Date.now() - 86400000 * 2)
  },
  {
    _id: 'sample-4',
    id: 'sample-4',
    userId: 'student-default',
    subject: 'Operating Systems',
    startTime: new Date(Date.now() - 86400000 - 9000000),
    endTime: new Date(Date.now() - 86400000 - 3600000),
    duration: 5400,
    durationSeconds: 5400,
    date: getLocalDateString(Date.now() - 86400000),
    device: 'Laptop',
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    _id: 'sample-5',
    id: 'sample-5',
    userId: 'student-default',
    subject: 'Database Management Systems',
    startTime: new Date(Date.now() - 86400000 - 2400000),
    endTime: new Date(Date.now() - 86400000),
    duration: 2400,
    durationSeconds: 2400,
    date: getLocalDateString(Date.now() - 86400000),
    device: 'Mobile',
    createdAt: new Date(Date.now() - 86400000)
  },
  {
    _id: 'sample-6',
    id: 'sample-6',
    userId: 'student-default',
    subject: 'Data Structures & Algorithms',
    startTime: new Date(Date.now() - 5400000),
    endTime: new Date(Date.now() - 1800000),
    duration: 3600,
    durationSeconds: 3600,
    date: getLocalDateString(Date.now()),
    device: 'Laptop',
    createdAt: new Date()
  }
];

class SessionStore {
  /**
   * Create a new session
   */
  static async create(sessionData) {
    if (isDBConnected()) {
      const doc = await Session.create(sessionData);
      const obj = doc.toObject({ virtuals: true });
      return {
        ...obj,
        id: doc._id.toString(),
        date: getLocalDateString(doc.startTime),
        durationSeconds: doc.duration
      };
    }

    // In-memory fallback
    const id = 'session_' + Date.now();
    const newSession = {
      _id: id,
      id,
      userId: sessionData.userId || 'student-default',
      subject: sessionData.subject || 'General Study',
      startTime: new Date(sessionData.startTime),
      endTime: new Date(sessionData.endTime),
      duration: Number(sessionData.duration),
      durationSeconds: Number(sessionData.duration),
      device: sessionData.device || 'Laptop',
      date: getLocalDateString(sessionData.startTime),
      createdAt: new Date()
    };
    inMemorySessions.unshift(newSession);
    return newSession;
  }

  /**
   * Find sessions matching criteria
   */
  static async find(query = {}) {
    const { userId = 'student-default', filter, date, subject, device } = query;

    if (isDBConnected()) {
      const dbQuery = { userId };
      if (subject) dbQuery.subject = new RegExp(subject, 'i');
      if (device) dbQuery.device = device;

      const today = new Date();
      if (filter === 'today') {
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);
        dbQuery.startTime = { $gte: startOfDay, $lte: endOfDay };
      } else if (filter === 'week') {
        const day = today.getDay();
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        dbQuery.startTime = { $gte: monday };
      } else if (filter === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        dbQuery.startTime = { $gte: startOfMonth };
      } else if (date) {
        const customStart = new Date(date);
        customStart.setHours(0, 0, 0, 0);
        const customEnd = new Date(date);
        customEnd.setHours(23, 59, 59, 999);
        dbQuery.startTime = { $gte: customStart, $lte: customEnd };
      }

      const sessions = await Session.find(dbQuery).sort({ startTime: -1 }).lean();
      return sessions.map(s => ({
        ...s,
        id: s._id.toString(),
        date: getLocalDateString(s.startTime),
        durationSeconds: s.duration
      }));
    }

    // In-memory fallback
    let result = inMemorySessions.filter(s => s.userId === userId);

    if (subject) {
      const re = new RegExp(subject, 'i');
      result = result.filter(s => re.test(s.subject));
    }
    if (device) {
      result = result.filter(s => s.device === device);
    }

    const todayStr = getLocalDateString(new Date());

    if (filter === 'today') {
      result = result.filter(s => getLocalDateString(s.startTime) === todayStr);
    } else if (filter === 'week') {
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      result = result.filter(s => new Date(s.startTime) >= monday);
    } else if (filter === 'month') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      result = result.filter(s => new Date(s.startTime) >= startOfMonth);
    } else if (date) {
      result = result.filter(s => getLocalDateString(s.startTime) === date);
    }

    result.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return result;
  }

  /**
   * Find a session by its ID
   */
  static async findById(id) {
    if (isDBConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const session = await Session.findById(id);
      if (!session) return null;
      return {
        ...session.toObject({ virtuals: true }),
        id: session._id.toString(),
        date: getLocalDateString(session.startTime),
        durationSeconds: session.duration
      };
    }

    // In-memory fallback
    const found = inMemorySessions.find(s => s.id === id || s._id === id);
    return found ? { ...found } : null;
  }

  /**
   * Update a session by ID
   */
  static async findByIdAndUpdate(id, updateData) {
    if (isDBConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const session = await Session.findById(id);
      if (!session) return null;

      if (updateData.subject) session.subject = updateData.subject;
      if (updateData.startTime) session.startTime = new Date(updateData.startTime);
      if (updateData.endTime) session.endTime = new Date(updateData.endTime);
      if (updateData.duration) session.duration = Number(updateData.duration);
      if (updateData.device) session.device = updateData.device;

      await session.save();
      return {
        ...session.toObject({ virtuals: true }),
        id: session._id.toString(),
        date: getLocalDateString(session.startTime),
        durationSeconds: session.duration
      };
    }

    // In-memory fallback
    const idx = inMemorySessions.findIndex(s => s.id === id || s._id === id);
    if (idx === -1) return null;

    inMemorySessions[idx] = {
      ...inMemorySessions[idx],
      ...updateData,
      durationSeconds: updateData.duration ? Number(updateData.duration) : inMemorySessions[idx].durationSeconds
    };
    return inMemorySessions[idx];
  }

  /**
   * Delete a session by ID
   */
  static async findByIdAndDelete(id) {
    if (isDBConnected()) {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const session = await Session.findByIdAndDelete(id);
      return session ? { id } : null;
    }

    // In-memory fallback
    const initialLen = inMemorySessions.length;
    inMemorySessions = inMemorySessions.filter(s => s.id !== id && s._id !== id);
    return inMemorySessions.length < initialLen ? { id } : null;
  }

  /**
   * Clear all sessions for a user
   */
  static async deleteMany(userId = 'student-default') {
    if (isDBConnected()) {
      const res = await Session.deleteMany({ userId });
      return { deletedCount: res.deletedCount };
    }

    // In-memory fallback
    const count = inMemorySessions.filter(s => s.userId === userId).length;
    inMemorySessions = inMemorySessions.filter(s => s.userId !== userId);
    return { deletedCount: count };
  }
}

module.exports = SessionStore;
