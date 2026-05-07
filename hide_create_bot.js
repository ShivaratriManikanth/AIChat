const fs = require('fs');
let code = fs.readFileSync('admin/index.html', 'utf8');

code = code.replace(
  /<div class="card" id="create-bot-card">/,
  "<div class="card" id="create-bot-card" style="display:none;">"
);

// If ID doesn't exist yet, I'll add it
if (!code.includes('id="create-bot-card"')) {
  code = code.replace(
    /<!-- Create New Bot Section -->\n\s*<div class="card">/,
    "<!-- Create New Bot Section -->\n          <div class="card" style="display:none;">"
  );
}

fs.writeFileSync('admin/index.html', code);
console.log('Hidden Create Bot card');
