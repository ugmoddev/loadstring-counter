const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../database.json');

let data = { scripts: {} };

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      data.scripts = parsed.scripts || {};
      console.log('Database loaded successfully.');
    } else {
      saveDatabase();
      console.log('New database created.');
    }
  } catch (err) {
    console.error('Error loading database:', err);
    data.scripts = {};
  }
}

function saveDatabase() {
  try {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, json, 'utf8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

function getScript(id) {
  const script = data.scripts[id];
  return script ? { ...script } : null;
}

function getAllScripts() {
  return Object.keys(data.scripts).map(id => ({
    id,
    name: data.scripts[id].name,
    loads: data.scripts[id].loads,
  }));
}

function createScript({ id, name, script }) {
  if (!id || !name || !script) throw new Error('Thiếu thông tin id, name hoặc script');
  if (data.scripts[id]) throw new Error('Script ID đã tồn tại');

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
  saveDatabase();
  return newScript;
}

function updateScript(id, updates) {
  const script = data.scripts[id];
  if (!script) return null;
  if (updates.name !== undefined) script.name = updates.name;
  if (updates.script !== undefined) script.script = updates.script;
  if (updates.enabled !== undefined) script.enabled = updates.enabled;
  return script;
}

function deleteScript(id) {
  if (!data.scripts[id]) return false;
  delete data.scripts[id];
  saveDatabase();
  return true;
}

function incrementLoad(id) {
  const script = data.scripts[id];
  if (!script || !script.enabled) return null;
  script.loads += 1;
  script.today += 1;
  script.lastLoad = new Date().toISOString();
  return script;
}

function resetCounter(id) {
  const script = data.scripts[id];
  if (!script) return false;
  script.loads = 0;
  script.today = 0;
  return true;
}

function getStats() {
  let totalLoads = 0, today = 0, scriptsCount = 0, lastLoad = null;
  for (const id in data.scripts) {
    const s = data.scripts[id];
    totalLoads += s.loads;
    today += s.today;
    scriptsCount++;
    if (s.lastLoad && (!lastLoad || s.lastLoad > lastLoad)) lastLoad = s.lastLoad;
  }
  return { totalLoads, today, scripts: scriptsCount, lastLoad };
}

function getScriptDetail(id) {
  const script = data.scripts[id];
  if (!script) return null;
  return {
    id: script.id,
    name: script.name,
    loads: script.loads,
    today: script.today,
    lastLoad: script.lastLoad,
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
