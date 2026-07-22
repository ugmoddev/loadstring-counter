const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');

// GET /load?id=SCRIPT_ID
router.get('/', (req, res) => {
  const { id } = req.query;
  const requestId = req.requestId;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    logger.logRequest(requestId, ip, userAgent, id, 'LOAD_INVALID_ID', 'ID không hợp lệ');
    return res.status(400).type('text/plain').send('Invalid Script ID');
  }

  const script = db.getScript(id);
  if (!script) {
    logger.logRequest(requestId, ip, userAgent, id, 'LOAD_NOT_FOUND', 'Script không tồn tại');
    return res.status(404).type('text/plain').send('Script Not Found');
  }

  if (!script.enabled) {
    logger.logRequest(requestId, ip, userAgent, id, 'LOAD_DISABLED', 'Script đã bị vô hiệu hóa');
    return res.status(403).type('text/plain').send('Script Disabled');
  }

  const updated = db.incrementLoad(id, ip, userAgent, requestId);
  if (!updated) {
    return res.status(404).type('text/plain').send('Script Not Found');
  }

  logger.logRequest(requestId, ip, userAgent, id, 'LOAD_SUCCESS', `Loads: ${updated.loads}`);
  res.type('text/plain').send(script.script);
});

module.exports = router;
