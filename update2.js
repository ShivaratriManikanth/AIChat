const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(
  /'INSERT INTO complaints \(session_id, email, name, phone, category, subject, message, page_url\) VALUES \(\?, \?, \?, \?, \?, \?, \?, \?\)'/,
  "'INSERT INTO complaints (session_id, email, name, phone, category, subject, message, page_url, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'"
);
code = code.replace(
  /\)\.run\(sessionId, safeEmail, safeName, safePhone, safeCategory, safeSubject, safeMessage, safeUrl\);/,
  ").run(sessionId, safeEmail, safeName, safePhone, safeCategory, safeSubject, safeMessage, safeUrl, req.clientId);"
);

fs.writeFileSync('server/server.js', code);
console.log('Fixed /api/complaint');
