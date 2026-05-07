const fs = require('fs');
let code = fs.readFileSync('admin/index.html', 'utf8');
code = code.replace(/await fetch\(`\$\{API\}\/api\//g, 'await fetchAuth(`${API}/api/');
fs.writeFileSync('admin/index.html', code);
console.log('Replaced', (code.match(/fetchAuth/g) || []).length, 'occurrences');
