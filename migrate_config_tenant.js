const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

// 1. Add tenant-aware config loader
const loaderCode = 
function loadClientBotConfig(clientId) {
  if (!db) return loadConfig();
  const bot = db.prepare('SELECT config FROM bots WHERE client_id = ?').get(clientId);
  if (!bot) return loadConfig();
  try {
    return JSON.parse(bot.config);
  } catch(e) {
    return loadConfig();
  }
}

function saveClientBotConfig(clientId, config) {
  if (!db) return saveConfig(config);
  db.prepare('UPDATE bots SET config = ? WHERE client_id = ?').run(JSON.stringify(config), clientId);
}
;

// Insert before /api/config
code = code.replace("app.get('/api/config'", loaderCode + "\napp.get('/api/config'");

// 2. Update GET /api/config to be tenant-aware via API key
code = code.replace(
  /app\.get\('\/api\/config', \(req, res\) => \{[\s\S]*?const config = loadConfig\(\);/,
  pp.get('/api/config', (req, res) => {
  // If API key provided via header, load THAT specific bot config
  const apiKey = req.headers['x-bot-key'] || req.query?.apiKey;
  let config;
  if (apiKey && db) {
    const bot = db.prepare('SELECT config FROM bots WHERE api_key = ?').get(apiKey);
    config = bot ? JSON.parse(bot.config) : loadConfig();
  } else {
    config = loadConfig();
  }
);

// 3. Update GET /api/config/full to use requireAuth
code = code.replace(
  /app\.get\('\/api\/config\/full', \(req, res\) => \{[\s\S]*?res\.json\(loadConfig\(\)\);/,
  pp.get('/api/config/full', requireAuth, (req, res) => {
  res.json(loadClientBotConfig(req.clientId));
);

// 4. Update POST /api/config to use requireAuth and save to DB
code = code.replace(
  /app\.post\('\/api\/config', \(req, res\) => \{[\s\S]*?saveConfig\(req\.body\);/,
  pp.post('/api/config', requireAuth, (req, res) => {
  saveClientBotConfig(req.clientId, req.body);
);

fs.writeFileSync('server/server.js', code);
console.log('Migrated config endpoints to multi-tenant (DB-backed)');
