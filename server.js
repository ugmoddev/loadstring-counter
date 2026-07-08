// server.js
const express = require('express');
const app = express();

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip || req.connection.remoteAddress}`);
    next();
});

// ========== DATABASE ==========
let stats = {
    totalCalls: 0,
    startTime: new Date().toISOString(),
    lastCall: null,
    calls: [],
    ipStats: {},
    robloxCalls: [],
    dailyStats: {},
    hourlyStats: {}
};

// ========== HELPER FUNCTIONS ==========

// Lấy thống kê theo thời gian
function updateTimeStats() {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hourKey = now.getHours();
    
    if (!stats.dailyStats[dateKey]) {
        stats.dailyStats[dateKey] = 0;
    }
    stats.dailyStats[dateKey]++;
    
    if (!stats.hourlyStats[dateKey]) {
        stats.hourlyStats[dateKey] = {};
    }
    if (!stats.hourlyStats[dateKey][hourKey]) {
        stats.hourlyStats[dateKey][hourKey] = 0;
    }
    stats.hourlyStats[dateKey][hourKey]++;
}

// Giới hạn dữ liệu
function limitData() {
    if (stats.calls.length > 1000) {
        stats.calls = stats.calls.slice(-1000);
    }
    if (stats.robloxCalls.length > 500) {
        stats.robloxCalls = stats.robloxCalls.slice(-500);
    }
    
    // Giữ 30 ngày gần nhất
    const dates = Object.keys(stats.dailyStats).sort();
    if (dates.length > 30) {
        const oldDates = dates.slice(0, dates.length - 30);
        oldDates.forEach(date => {
            delete stats.dailyStats[date];
            delete stats.hourlyStats[date];
        });
    }
}

// ========== MAIN ENDPOINT ==========

// GET - Dành cho loadstring
app.get('/loadstring', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const isRoblox = userAgent.includes('Roblox') || userAgent.includes('rbx') || userAgent.includes('ROBLOX');
    
    // Tăng đếm
    stats.totalCalls++;
    updateTimeStats();
    
    // Lưu thông tin call
    const callInfo = {
        id: stats.totalCalls,
        timestamp: new Date().toISOString(),
        ip: ip,
        isRoblox: isRoblox,
        userAgent: userAgent.substring(0, 100),
        method: 'GET'
    };
    
    stats.calls.push(callInfo);
    stats.lastCall = callInfo;
    
    if (isRoblox) {
        stats.robloxCalls.push(callInfo);
    }
    
    // Thống kê IP
    if (!stats.ipStats[ip]) {
        stats.ipStats[ip] = 0;
    }
    stats.ipStats[ip]++;
    
    limitData();
    
    console.log(`[#${stats.totalCalls}] Roblox: ${isRoblox} | IP: ${ip}`);
    
    // Tạo code trả về cho Roblox
    const responseCode = `
-- ==========================================
-- LOADSTRING #${stats.totalCalls}
-- Timestamp: ${new Date().toISOString()}
-- ==========================================

print("✅ Loadstring #${stats.totalCalls} executed successfully!")
print("📅 Time: ${new Date().toLocaleString()}")

-- ==========================================
-- CODE CỦA BẠN Ở ĐÂY
-- ==========================================

-- Ví dụ: In thông tin player
local player = game:GetService("Players").LocalPlayer
if player then
    print("👤 Player:", player.Name)
    print("🆔 UserId:", player.UserId)
end

-- Gửi thông tin về server (tùy chọn)
-- local http = game:GetService("HttpService")
-- http:GetAsync("https://your-app.onrender.com/log?player=" .. player.Name)

-- ==========================================
-- RETURN DATA
-- ==========================================
return {
    success = true,
    callNumber = ${stats.totalCalls},
    timestamp = "${new Date().toISOString()}",
    player = player and player.Name or "Unknown"
}
`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.send(responseCode);
});

// POST - Nhận loadstring
app.post('/loadstring', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const code = req.body.code || req.body.content || '';
    
    stats.totalCalls++;
    updateTimeStats();
    
    const callInfo = {
        id: stats.totalCalls,
        timestamp: new Date().toISOString(),
        ip: ip,
        codeLength: code.length,
        codePreview: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
        method: 'POST'
    };
    
    stats.calls.push(callInfo);
    stats.lastCall = callInfo;
    
    if (!stats.ipStats[ip]) {
        stats.ipStats[ip] = 0;
    }
    stats.ipStats[ip]++;
    
    limitData();
    
    console.log(`[POST #${stats.totalCalls}] IP: ${ip} | Length: ${code.length}`);
    
    res.json({
        success: true,
        callNumber: stats.totalCalls,
        timestamp: new Date().toISOString(),
        codeLength: code.length
    });
});

// ========== STATS ENDPOINTS ==========

// Lấy tổng số lần gọi
app.get('/count', (req, res) => {
    res.json({
        totalCalls: stats.totalCalls,
        robloxCalls: stats.robloxCalls.length,
        timestamp: new Date().toISOString()
    });
});

// Lấy stats chi tiết
app.get('/stats', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const ipFilter = req.query.ip;
    
    let calls = stats.calls;
    if (ipFilter) {
        calls = calls.filter(c => c.ip === ipFilter);
    }
    
    // Tính tổng theo ngày
    const dailySummary = Object.keys(stats.dailyStats)
        .sort()
        .slice(-7)
        .map(date => ({
            date: date,
            calls: stats.dailyStats[date]
        }));
    
    res.json({
        summary: {
            totalCalls: stats.totalCalls,
            robloxCalls: stats.robloxCalls.length,
            uniqueIPs: Object.keys(stats.ipStats).length,
            startTime: stats.startTime,
            lastCall: stats.lastCall,
            uptime: Math.floor((new Date() - new Date(stats.startTime)) / 1000) + ' seconds',
            memoryCalls: stats.calls.length
        },
        topIPs: Object.entries(stats.ipStats)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([ip, count]) => ({ ip, count })),
        dailyStats: dailySummary,
        recentCalls: calls.slice(-limit).reverse()
    });
});

// Lấy stats đơn giản
app.get('/simple-stats', (req, res) => {
    res.json({
        totalCalls: stats.totalCalls,
        uniqueIPs: Object.keys(stats.ipStats).length,
        lastCall: stats.lastCall,
        uptime: Math.floor((new Date() - new Date(stats.startTime)) / 1000)
    });
});

// Lấy call theo ID
app.get('/call/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const call = stats.calls.find(c => c.id === id);
    
    if (!call) {
        return res.status(404).json({
            error: 'Not found',
            message: `Call #${id} not found`
        });
    }
    
    res.json(call);
});

// ========== LOG ENDPOINT ==========

// Nhận log từ Roblox
app.get('/log', (req, res) => {
    const player = req.query.player || 'Unknown';
    const action = req.query.action || 'loadstring';
    
    console.log(`[LOG] Player: ${player} | Action: ${action}`);
    
    res.json({
        success: true,
        message: 'Logged successfully',
        timestamp: new Date().toISOString()
    });
});

// ========== ADMIN ENDPOINTS ==========

// Reset stats (có bảo vệ)
app.post('/reset', (req, res) => {
    const secret = req.headers['x-api-key'] || req.body.secret;
    
    if (secret !== 'your_secret_key_here') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
        });
    }
    
    stats.totalCalls = 0;
    stats.calls = [];
    stats.ipStats = {};
    stats.robloxCalls = [];
    stats.dailyStats = {};
    stats.hourlyStats = {};
    stats.lastCall = null;
    stats.startTime = new Date().toISOString();
    
    console.log('🔄 Stats reset by admin');
    
    res.json({
        success: true,
        message: 'Stats reset successfully',
        timestamp: new Date().toISOString()
    });
});

// Xóa call cũ
app.post('/clean', (req, res) => {
    const secret = req.headers['x-api-key'] || req.body.secret;
    
    if (secret !== 'your_secret_key_here') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid API key'
        });
    }
    
    const keepCount = req.body.keep || 100;
    if (stats.calls.length > keepCount) {
        stats.calls = stats.calls.slice(-keepCount);
    }
    if (stats.robloxCalls.length > keepCount) {
        stats.robloxCalls = stats.robloxCalls.slice(-keepCount);
    }
    
    res.json({
        success: true,
        message: `Cleaned to last ${keepCount} calls`,
        timestamp: new Date().toISOString()
    });
});

// ========== HEALTH & INFO ==========

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        totalCalls: stats.totalCalls,
        uptime: Math.floor((new Date() - new Date(stats.startTime)) / 1000)
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        service: 'Loadstring Counter API',
        version: '1.0.0',
        description: 'Đếm số lần loadstring từ Roblox',
        howToUse: 'loadstring(game:HttpGet("https://your-app.onrender.com/loadstring"))()',
        endpoints: {
            'GET /loadstring': '✅ Trả về code Lua để thực thi (main)',
            'POST /loadstring': '✅ Gửi code lên server',
            'GET /count': '📊 Tổng số lần gọi',
            'GET /stats': '📊 Thống kê chi tiết',
            'GET /simple-stats': '📊 Thống kê đơn giản',
            'GET /call/:id': '🔍 Xem call theo ID',
            'GET /log': '📝 Log từ Roblox',
            'POST /reset': '🔄 Reset stats (cần API key)',
            'POST /clean': '🧹 Xóa call cũ (cần API key)',
            'GET /health': '💚 Health check'
        },
        example: 'loadstring(game:HttpGet("https://your-app.onrender.com/loadstring"))()',
        serverTime: new Date().toISOString()
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// ========== START SERVER ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 LOADSTRING COUNTER SERVER');
    console.log('========================================');
    console.log(`✅ Server chạy tại port: ${PORT}`);
    console.log(`📤 Endpoint: https://your-app.onrender.com/loadstring`);
    console.log(`📊 Stats: https://your-app.onrender.com/stats`);
    console.log(`🔢 Count: https://your-app.onrender.com/count`);
    console.log('========================================');
    console.log('📌 Cách dùng trong Roblox:');
    console.log('   loadstring(game:HttpGet("https://your-app.onrender.com/loadstring"))()');
    console.log('========================================');
});
