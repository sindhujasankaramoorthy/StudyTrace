/**
 * JWT Authentication Protection Middleware
 */
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'studytrace_jwt_secret_key_2026_super_secure_9988';
      const decoded = jwt.verify(token, secret);

      req.user = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      };

      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid or expired'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no access token provided'
    });
  }
};

module.exports = { protect };
