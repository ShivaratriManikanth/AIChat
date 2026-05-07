const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

code = code.replace(
  /SELECT id, email, company_name, plan_id, payment_status, created_at FROM clients/,
  "SELECT id, email, password, company_name, plan_id, payment_status, created_at FROM clients"
);

fs.writeFileSync('server/server.js', code);
console.log('Exposed password to superadmin');
