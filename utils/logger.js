const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = path.join(__dirname, '../logs');
const LOG_FILE = path.join(LOG_DIR, 'requests.log');

// Đảm bảo thư mục logs tồn tại
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Hàm hash IP (để ẩn danh, dùng SHA256 + salt)
function hashIP(ip, salt = 'loadstring-secret-salt') {
  return crypto.createHmac('sha256', salt).update(ip).digest('hex');
}

// Ghi log
function logRequest(requestId, ip, userAgent, scriptId, action, details = '') {
  const timestamp = new Date().toISOString();
  const hashedIp = hashIP(ip);
  const logLine = `[${timestamp}] [${requestId}] [${hashedIp}] [${userAgent || 'unknown'}] [${scriptId || 'N/A'}] [${action}] ${details}\n`;
  
  // Ghi vào file (bất đồng bộ)
  fs.appendFile(LOG_FILE, logLine, (err) => {
    if (err) console.error('Lỗi ghi log:', err);
  });
}

module.exports = {
  logRequest,
};