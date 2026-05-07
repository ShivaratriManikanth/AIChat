const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

// 1. Add requireAuth to endpoints
const endpoints = ['/api/stats', '/api/users', '/api/chats', '/api/leads', '/api/bots', '/api/settings', '/api/complaints', '/api/faq'];

endpoints.forEach(ep => {
  code = code.replace(new RegExp(`app\\.get\\('${ep}'`, 'g'), `app.get('${ep}', requireAuth`);
  code = code.replace(new RegExp(`app\\.post\\('${ep}'`, 'g'), `app.post('${ep}', requireAuth`);
  code = code.replace(new RegExp(`app\\.delete\\('${ep}/:id'`, 'g'), `app.delete('${ep}/:id', requireAuth`);
});

// 2. Add client_id filters to queries. This is complex to do with regex alone.
