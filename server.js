const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const db = require('./utils/database');
const logger = require('./utils/logger');

// Import routes
const loadRoute = require('./routes/load');
const statsRoute = require('./routes/stats');
const scriptsRoute = require('./routes/scripts');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware bảo mật và tiện ích
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting toàn cục: 100 request mỗi phút cho mỗi IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Quá nhiều request, vui lòng thử lại sau.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Gán request ID cho logging
app.use((req, res, next) => {
  req.requestId = uuidv4();
  next();
});

// (Tuỳ chọn) Log mọi request
app.use((req, res, next) => {
  next();
});

// Debug: kiểm tra kiểu của từng route (sẽ hiện trên log Render)
console.log('loadRoute type:', typeof loadRoute);
console.log('statsRoute type:', typeof statsRoute);
console.log('scriptsRoute type:', typeof scriptsRoute);

// Routes
app.use('/load', loadRoute);
app.use('/stats', statsRoute);
app.use('/scripts', scriptsRoute);

// Xử lý route không tồn tại
app.use((req, res) => {
  res.status(404).type('text/plain').send('Not Found');
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Loadstring Counter server running on port ${PORT}`);
  db.loadDatabase();
  setInterval(() => {
    db.saveDatabase();
  }, 10000);
});
