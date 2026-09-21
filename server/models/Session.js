/**
 * Study Session Mongoose Model
 */
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'student-default',
      trim: true,
      index: true
    },
    subject: {
      type: String,
      default: 'General Study',
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters']
    },
    startTime: {
      type: Date,
      required: [true, 'Session start time is required']
    },
    endTime: {
      type: Date,
      required: [true, 'Session end time is required']
    },
    duration: {
      type: Number,
      required: [true, 'Session duration in seconds is required'],
      min: [1, 'Session duration must be at least 1 second']
    },
    device: {
      type: String,
      enum: {
        values: ['Laptop', 'Mobile', 'Desktop', 'Tablet'],
        message: '{VALUE} is not a supported device type'
      },
      default: 'Laptop'
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for local ISO Date string YYYY-MM-DD
sessionSchema.virtual('date').get(function () {
  if (!this.startTime) return new Date().toISOString().split('T')[0];
  const d = new Date(this.startTime);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
});

// Map durationSeconds alias for frontend backward compatibility
sessionSchema.virtual('durationSeconds').get(function () {
  return this.duration;
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
