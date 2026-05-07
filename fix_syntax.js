const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

// Fix the destructuring line
code = code.replace(
  /let \{ message, sessionId, req\.clientId, file/,
  "let { message, sessionId, file"
);

// Fix req.req.clientId
code = code.replace(/req\.req\.clientId/g, "req.clientId");

fs.writeFileSync('server/server.js', code);
console.log('Fixed syntax errors in server.js');
