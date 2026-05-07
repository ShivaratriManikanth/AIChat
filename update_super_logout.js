const fs = require('fs');
let code = fs.readFileSync('admin/superadmin.html', 'utf8');

code = code.replace(
  /href="\/admin\/"[^>]*>.*?Back to Dashboard<\/a>/,
  href="/admin/" style="font-size:13px;color:rgba(255,255,255,0.5);text-decoration:none;">? Back to Dashboard</a>\n      <a href="#" onclick="logout()" style="font-size:13px;color:#fb7185;text-decoration:none;font-weight:600;margin-left:15px;border-left:1px solid rgba(255,255,255,0.1);padding-left:15px;">?? Logout</a>
);

fs.writeFileSync('admin/superadmin.html', code);
console.log('Added Logout link to superadmin');
