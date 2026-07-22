const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../database.json');

// Cấu trúc dữ liệu trong RAM:
// {
//   scripts: {
//     'abc123': {
//       id: 'abc123',
//       name: 'Aura Hub',
//       script: "print('Hello')",
//       loads: 0,
//       today: 0,
//       createdAt: ISO,
//       lastLoad: ISO or null,
//       enabled: true
//     }
//   }
// }
let data = {
  scripts: {},
};

// Hàm tải dữ liệu từ file (nếu có)
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      data.scripts = parsed.scripts || {};
      console.log('Database loaded successfully.');
    } else {
      // Tạo file mới
      saveDatabase();
      console.log('New database created.');
    }
  } catch (err) {
    console.error('Error loading database:', err);
    // Nếu lỗi, khởi tạo rỗng
    data.scripts = {};
  }
}

// Hàm lưu dữ liệu xuống file
function saveDatabase() {
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, json, 'utf8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

// Lấy script theo id, trả về bản sao (để tránh tham chiếu)
function getScript(id) {
  const script = data.scripts[id];
  if (!script) return null;
  return { ...script };
}

// Lấy tất cả script (chỉ trả về các trường cần thiết)
function getAllScripts() {
  const result = [];
  for (const id in data.scripts) {
    const s = data.scripts[id];
    result.push({
      id: s.id,
      name: s.name,
      loads: s.loads,
    });
  }
  return result;
}

// Tạo mới script
function createScript(scriptData) {
  const { id, name, script } = scriptData;
  if (!id || !name || !script) {
    throw new Error('Thiếu thông tin id, name hoặc script');
  }
  if (data.scripts[id]) {
    throw new Error('Script ID đã tồn tại');
  }
  const now = new Date().toISOString();
  const newScript = {
    id,
    name,
    script,
    loads: 0,
    today: 0,
    createdAt: now,
    lastLoad: null,
    enabled: true,
  };
  data.scripts[id] = newScript;
  // Lưu ngay sau khi tạo (có thể không cần vì chu kỳ tự lưu)
  // Nhưng để an toàn, ta lưu luôn
  saveDatabase();
  return newScript;
}

// Cập nhật script (chỉ cho phép cập nhật một số trường)
function updateScript(id, updates) {
  const script = data.scripts[id];
  if (!script) return null;
  // Chỉ cho phép cập nhật name, script, enabled
  if (updates.name !== undefined) script.name = updates.name;
  if (updates.script !== undefined) script.script = updates.script;
  if (updates.enabled !== undefined) script.enabled = updates.enabled;
  // Không tự động lưu ở đây, để chu kỳ lưu
  return script;
}

// Xóa script
function deleteScript(id) {
  if (!data.scripts[id]) return false;
  delete data.scripts[id];
  saveDatabase();
  return true;
}

// Tăng bộ đếm cho script (gọi khi load)
function incrementLoad(id, ip, userAgent, requestId) {
  const script = data.scripts[id];
  if (!script) return null;
  if (!script.enabled) return null; // không tăng nếu disabled

  script.loads += 1;
  script.today += 1;
  script.lastLoad = new Date().toISOString();

  // Lưu log riêng (có thể tách ra, nhưng ở đây gọi logger)
  // Ta sẽ để logger xử lý ở route, không làm ở đây để giữ đơn thuần
  return script;
}

// Reset counter
function resetCounter(id) {
  const script = data.scripts[id];
  if (!script) return false;
  script.loads = 0;
  script.today = 0;
  // Không reset lastLoad, giữ nguyên
  return true;
}

// Thống kê tổng hợp
function getStats() {
  let totalLoads = 0;
  let today = 0;
  let scriptsCount = 0;
  let lastLoad = null;

  for (const id in data.scripts) {
    const s = data.scripts[id];
    totalLoads += s.loads;
    today += s.today;
    scriptsCount++;
    if (s.lastLoad) {
      if (!lastLoad || s.lastLoad > lastLoad) {
        lastLoad = s.lastLoad;
      }
    }
  }

  return {
    totalLoads,
    today,
    scripts: scriptsCount,
    lastLoad: lastLoad || null,
  };
}

// Lấy chi tiết script (cho endpoint /script)
function getScriptDetail(id) {
  const script = data.scripts[id];
  if (!script) return null;
  return {
    id: script.id,
    name: script.name,
    loads: script.loads,
    today: script.today,
    lastLoad: script.lastLoad,
    // Không trả về script content ở đây để bảo mật
  };
}

module.exports = {
  loadDatabase,
  saveDatabase,
  getScript,
  getAllScripts,
  createScript,
  updateScript,
  deleteScript,
  incrementLoad,
  resetCounter,
  getStats,
  getScriptDetail,
};