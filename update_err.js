const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(
  /\} catch \(err\) \{\n\s*console\.error\('Error creating client:', err\);\n\s*res\.status\(500\)\.json\(\{ error: 'DB not available' \}\);\n\s*\}/,
  "} catch (err) {\n    console.error('Error creating client:', err);\n    res.status(500).json({ error: err.message });\n  }"
);

fs.writeFileSync('server/server.js', code);
console.log('Fixed error reporting for client creation');
