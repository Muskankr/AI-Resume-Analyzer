const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bio: { type: String, default: '' },
  scoreBadges: [{
    subject: String,
    improvementDelta: Number,
    unlockedAt: { type: Date, default: Date.now }
  }],
  // Acceptance Criteria: Secure visibility flags, private by default
  isPubliclyVisible: { type: Boolean, default: false },
  publicSlug: { type: String, unique: true, sparse: true } // Clean URL sharing hook
}, { timestamps: true });

module.exports = mongoose.model('UserProfile', UserProfileSchema);
