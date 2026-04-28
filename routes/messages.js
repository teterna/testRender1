const { Router } = require('express');
const Message = require('../models/Message');

const router = Router();

/**
 * GET /api/messages
 *
 * Returns the 50 most-recent messages sorted oldest-first so the chat
 * window can render them in chronological order on initial page load.
 *
 * `.lean()` returns plain JavaScript objects instead of full Mongoose
 * documents, which is faster when we only need to serialize to JSON.
 */
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ createdAt: 1 })   // ascending — oldest message first
      .limit(50)
      .lean();

    res.json(messages);
  } catch (err) {
    console.error('[API] Failed to fetch messages:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
