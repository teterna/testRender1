const { Router } = require('express');
const NumberModel = require('../models/Number');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const numbers = await NumberModel.find()
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json(numbers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch numbers' });
  }
});

module.exports = router;
