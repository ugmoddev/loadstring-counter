const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const logger = require('../utils/logger');

// GET /scripts - danh sách script
router.get('/', (req, res) => {
  const scripts = db.getAllScripts();
  res.json(scripts);
});

// GET /script?id=SCRIPT_ID - chi tiết một script
router.get('/script', (req, res) => {
  const { id } = req.query;
  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid Script ID' });
  }
  const detail = db.getScriptDetail(id);
  if (!detail) {
    return res.status(404).json({ error: 'Script not found' });
  }
  res.json(detail);
});

// POST /reset?id=SCRIPT_ID - reset counter
router.post('/reset', (req, res) => {
  const { id } = req.query;
  const requestId = req.requestId;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || '';

  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    logger.logRequest(requestId, ip, userAgent, id, 'RESET_INVALID_ID');
    return res.status(400).json({ error: 'Invalid Script ID' });
  }

  const success = db.resetCounter(id);
  if (!success) {
    logger.logRequest(requestId, ip, userAgent, id, 'RESET_NOT_FOUND');
    return res.status(404).json({ error: 'Script not found' });
  }

  logger.logRequest(requestId, ip, userAgent, id, 'RESET_SUCCESS');
  res.json({ message: 'Counter reset successfully' });
});

// POST /create - tạo script mới
router.post('/create', (req, res) => {
  const { id, name, script } = req.body;
  const requestId = req.requestId;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || '';

  // Validation
  if (!id || !name || !script) {
    logger.logRequest(requestId, ip, userAgent, id, 'CREATE_MISSING_FIELDS');
    return res.status(400).json({ error: 'Missing required fields: id, name, script' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    logger.logRequest(requestId, ip, userAgent, id, 'CREATE_INVALID_ID');
    return res.status(400).json({ error: 'ID contains invalid characters' });
  }

  try {
    const newScript = db.createScript({ id, name, script });
    logger.logRequest(requestId, ip, userAgent, id, 'CREATE_SUCCESS');
    res.status(201).json({ message: 'Script created', script: newScript });
  } catch (err) {
    logger.logRequest(requestId, ip, userAgent, id, 'CREATE_ERROR', err.message);
    res.status(400).json({ error: err.message });
  }
});

// DELETE /delete?id=SCRIPT_ID - xóa script
router.delete('/delete', (req, res) => {
  const { id } = req.query;
  const requestId = req.requestId;
  const ip = req.ip;
  const userAgent = req.get('User-Agent') || '';

  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    logger.logRequest(requestId, ip, userAgent, id, 'DELETE_INVALID_ID');
    return res.status(400).json({ error: 'Invalid Script ID' });
  }

  const success = db.deleteScript(id);
  if (!success) {
    logger.logRequest(requestId, ip, userAgent, id, 'DELETE_NOT_FOUND');
    return res.status(404).json({ error: 'Script not found' });
  }

  logger.logRequest(requestId, ip, userAgent, id, 'DELETE_SUCCESS');
  res.json({ message: 'Script deleted' });
});

module.exports = router;