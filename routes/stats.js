const express = require('express');
const router = express.Router();
const db = require('../utils/database');

// GET /stats
router.get('/', (req, res) => {
  const stats = db.getStats();
  res.json(stats);
});

module.exports = router;
