
const db = require('better-sqlite3')('chatbot.db');
console.log(JSON.stringify(db.prepare('SELECT email FROM clients').all()));

