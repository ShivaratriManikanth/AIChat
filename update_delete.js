const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

const newRoute = 
app.delete('/api/super/clients/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const clientId = req.params.id;
  try {
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    db.prepare('DELETE FROM bots WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM users WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM leads WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM chat_history WHERE client_id = ?').run(clientId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});
;

code = code.replace(/app\.post\('\/api\/login'/, newRoute + '\napp.post(\'/api/login\'');

fs.writeFileSync('server/server.js', code);
console.log('Added DELETE client endpoint');
