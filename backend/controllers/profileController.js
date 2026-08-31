const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const { requireAuth } = require('../middleware/auth'); // Mock application auth guard

/**
 * Endpoint 1: Toggle public visibility state setting
 */
router.patch('/api/profile/privacy', requireAuth, async (req, res) => {
  const { isPublic, customSlug } = req.body;
  try {
    const slugValue = customSlug ? customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '') : `user-${req.user.id}`;
    
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { isPubliclyVisible: isPublic, publicSlug: isPublic ? slugValue : null } },
      { new: true, upsert: true }
    );
    res.json({ message: 'Privacy configuration synchronized.', profile });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update visibility preferences.' });
  }
});

/**
 * Endpoint 2: Fetch Public Profile Profile by unique shareable slug (No Auth Required)
 */
router.get('/api/profiles/public/:slug', async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ publicSlug: req.params.slug.toLowerCase() })
      .populate('userId', 'username avatarUrl');

    // Strict Data Block Leak Checks
    if (!profile || !profile.isPubliclyVisible) {
      return res.status(404).json({ error: 'Public profile not found or set to private.' });
    }

    // Explicitly return white-listed data parameters (Strictly excluding resume logs)
    res.json({
      username: profile.userId.username,
      avatarUrl: profile.userId.avatarUrl,
      bio: profile.bio,
      scoreBadges: profile.scoreBadges
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal failure resolving public record indices.' });
  }
});

module.exports = router;
