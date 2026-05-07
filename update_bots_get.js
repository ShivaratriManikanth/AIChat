const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(
  /const bots = db\.prepare\('SELECT bot_id, name, api_key, created_at FROM bots WHERE client_id = \? ORDER BY created_at DESC'\)\.all\(req\.clientId\);/,
  "const botsRows = db.prepare('SELECT bot_id, name, config, created_at FROM bots WHERE client_id = ? ORDER BY created_at DESC').all(req.clientId);\n  const bots = botsRows.map(row => {\n    let apiKey = '';\n    try { apiKey = JSON.parse(row.config || '{}').apiKey || ''; } catch(e){}\n    return { bot_id: row.bot_id, name: row.name, api_key: apiKey, created_at: row.created_at };\n  });"
);

fs.writeFileSync('server/server.js', code);
console.log('Fixed /api/bots query');
