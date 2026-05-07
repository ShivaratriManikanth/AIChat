const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

// Find the /api/chat block
const startMatch = code.indexOf("app.post('/api/chat'");
const endMatch = code.indexOf("app.post('/api/lead'");

if (startMatch !== -1 && endMatch !== -1) {
    let block = code.substring(startMatch, endMatch);
    // Replace standalone clientId with req.clientId
    // Using word boundary to avoid replacing req.clientId
    block = block.replace(/\bclientId\b/g, 'req.clientId');
    
    code = code.substring(0, startMatch) + block + code.substring(endMatch);
    fs.writeFileSync('server/server.js', code);
    console.log('Fixed clientId usage in /api/chat block');
} else {
    console.log('Could not find chat block');
}
