/**
 * Session Input Validation Middleware
 */

const validateSessionInput = (req, res, next) => {
  const { startTime, endTime, duration, device, subject } = req.body;
  const errors = [];

  // Validate startTime
  if (!startTime) {
    errors.push('startTime is required');
  } else if (isNaN(new Date(startTime).getTime())) {
    errors.push('startTime must be a valid ISO Date string');
  }

  // Validate endTime
  if (!endTime) {
    errors.push('endTime is required');
  } else if (isNaN(new Date(endTime).getTime())) {
    errors.push('endTime must be a valid ISO Date string');
  }

  // Validate start before end
  if (startTime && endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (end < start) {
      errors.push('endTime cannot be earlier than startTime');
    }
  }

  // Validate duration or auto-calculate if missing/invalid
  let computedDuration = Number(duration);
  if (isNaN(computedDuration) || computedDuration < 1) {
    if (startTime && endTime) {
      computedDuration = Math.max(1, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000));
    } else {
      computedDuration = 1;
    }
  }
  req.body.duration = computedDuration;

  // Validate device if provided
  if (device && typeof device === 'string' && device.length > 50) {
    errors.push('device name cannot exceed 50 characters');
  }

  // Validate subject length
  if (subject && typeof subject === 'string' && subject.length > 100) {
    errors.push('subject cannot exceed 100 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = { validateSessionInput };
