const Database = require('better-sqlite3');
const db = new Database('server/chatbot.db');
console.log('Tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());
const bots = db.prepare('SELECT * FROM bots').all();
console.log('Bots:', bots);
