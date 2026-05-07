const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(/app\.get\('\/api\/config', \(req, res\) => \{/g, pp.get('/api/config', checkApiKey, (req, res) => {);

code = code.replace(/app\.post\('\/api\/register', \(req, res\) => \{/, pp.post('/api/register', checkApiKey, (req, res) => {);
code = code.replace(/INSERT OR IGNORE INTO users \(email, session_id\)/g, INSERT OR IGNORE INTO users (email, session_id, client_id));
code = code.replace(/\.run\(email, sessionId\);/g, .run(email, sessionId, req.clientId););

code = code.replace(/app\.post\('\/api\/lead', \(req, res\) => \{/, pp.post('/api/lead', checkApiKey, (req, res) => {);
code = code.replace(/INSERT INTO leads \(session_id, name, email, phone, page_url\)/g, INSERT INTO leads (session_id, name, email, phone, page_url, client_id));
code = code.replace(/\.run\(sessionId, name, email, phone, pageUrl\);/g, .run(sessionId, name, email, phone, pageUrl, req.clientId););

code = code.replace(/app\.post\('\/api\/complaint', \(req, res\) => \{/, pp.post('/api/complaint', checkApiKey, (req, res) => {);
code = code.replace(/INSERT INTO complaints \(session_id, email, name, phone, category, subject, message, page_url, status\)/g, INSERT INTO complaints (session_id, email, name, phone, category, subject, message, page_url, status, client_id));
code = code.replace(/\.run\(sessionId, email, name, phone, category, subject, message, pageUrl, 'open'\);/g, .run(sessionId, email, name, phone, category, subject, message, pageUrl, 'open', req.clientId););

code = code.replace(/app\.post\('\/api\/dropoff', \(req, res\) => \{/, pp.post('/api/dropoff', checkApiKey, (req, res) => {);

fs.writeFileSync('server/server.js', code);
console.log('updated server.js');
