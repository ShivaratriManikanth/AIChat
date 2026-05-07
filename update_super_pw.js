const fs = require('fs');
let code = fs.readFileSync('admin/superadmin.html', 'utf8');

code = code.replace(
  /<th>Joined<\/th>/,
  "<th>Joined</th>\n              <th>Password</th>"
);

code = code.replace(
  /const date = c\.created_at \? new Date\(c\.created_at\)\.toLocaleDateString\(\) : '-';/,
  "const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : '-';\n          const pwd = c.password || '******';"
);

code = code.replace(
  /<td>\<\/td>/,
  "<td>\</td>\n              <td style=\"font-family:monospace; color:#6366f1;\">\C:\Users\shiva\OneDrive\Desktop\ai-chatbot-widget</td>"
);

fs.writeFileSync('admin/superadmin.html', code);
console.log('Updated superadmin table to show password');
