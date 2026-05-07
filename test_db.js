
const db = require('better-sqlite3')('chatbot.db');
console.log(db.prepare(SELECT sql FROM sqlite_master WHERE type='table').all().map(t => t.sql).join('\n'));

