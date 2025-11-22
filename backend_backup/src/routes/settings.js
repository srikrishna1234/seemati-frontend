// backend/src/routes/settings.js
const express = require('express');
const router = express.Router();
const Setting = require('../../models/Setting');

// Helper: get-or-create for a key
async function getOrCreate(key, defaultValue) {
  let s = await Setting.findOne({ key }).exec();
  if (!s) {
    s = new Setting({ key, value: defaultValue });
    await s.save();
  }
  return s;
}

// GET announcements
// Public read (used by homepage)
router.get('/settings/announcements', async (req, res) => {
  try {
    const s = await getOrCreate('announcements', { messages: [] });
    res.json({ messages: Array.isArray(s.value.messages) ? s.value.messages : [] });
  } catch (err) {
    console.error('Failed to read announcements', err);
    res.status(500).json({ error: 'Failed to read announcements' });
  }
});

// PUT announcements
// Admin-only: replace the array (expects JSON body { messages: ["a","b"] })
router.put('/settings/announcements', async (req, res) => {
  try {
    // TODO: if you have auth middleware, use it here. For now this is unprotected.
    const incoming = req.body && Array.isArray(req.body.messages) ? req.body.messages : [];
    const s = await getOrCreate('announcements', { messages: [] });
    s.value = { messages: incoming };
    await s.save();
    res.json({ messages: incoming });
  } catch (err) {
    console.error('Failed to update announcements', err);
    res.status(500).json({ error: 'Failed to update announcements' });
  }
});

module.exports = router;
