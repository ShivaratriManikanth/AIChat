const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(
  /app\.get\('\/api\/config', checkApiKey, \(req, res\) => \{\n\s*const config = loadConfig\(\);\n\s*\/\/ Don't expose sensitive data to widget\n\s*const \{ aiModel, systemPrompt, \.\.\.safeConfig \} = config;\n\s*res\.json\(safeConfig\);\n\}\);/,
  "app.get('/api/config', checkApiKey, (req, res) => {\n  let botConfig = {};\n  try { botConfig = JSON.parse(req.bot.config || '{}'); } catch(e){}\n  const config = { ...loadConfig(), ...botConfig };\n  const { aiModel, systemPrompt, ...safeConfig } = config;\n  res.json(safeConfig);\n});"
);

fs.writeFileSync('server/server.js', code);
console.log('Fixed /api/config');
