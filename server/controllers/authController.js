/**
 * Authentication Controller
 * Handles user registration, login, and profile fetching with JWT signing.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDBConnected } = require('../config/db');

// In-memory fallback user array when MongoDB is offline
const inMemoryUsers = [];

// Helper to sign JWT token
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'studytrace_jwt_secret_key_2026_super_secure_9988';
  return jwt.sign(
    { id: user.id || user._id, email: user.email, name: user.name },
    secret,
    { expiresIn: '30d' }
  );
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new student user
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || !name.trim()) {
      errors.push('Full name is required');
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      errors.push('A valid email address is required');
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Registration validation failed',
        errors
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    if (isDBConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists'
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash
      });

      const token = generateToken({
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email
        }
      });
    }

    // In-memory fallback mode
    const existingMem = inMemoryUsers.find(u => u.email === normalizedEmail);
    if (existingMem) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const id = 'user_' + Date.now();

    const memUser = {
      _id: id,
      id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date()
    };
    inMemoryUsers.push(memUser);

    const token = generateToken(memUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful (In-Memory Fallback)',
      token,
      user: {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & return JWT token
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (isDBConnected()) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        name: user.name
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email
        }
      });
    }

    // In-memory fallback mode
    const memUser = inMemoryUsers.find(u => u.email === normalizedEmail);
    if (!memUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, memUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(memUser);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
