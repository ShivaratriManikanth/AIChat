const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'server', 'chatbot.db');
const db = new Database(dbPath);

const sessionId = 'sess_1778123590889_b57731737e61'; // Taking from screenshot

console.log('--- Session Info ---');
const session = db.prepare('SELECT * FROM sessions WHERE session_id LIKE ?').get(sessionId + '%');
console.log(session);

if (session) {
    console.log('\n--- Chat History (raw) ---');
    const history = db.prepare('SELECT id, client_id, session_id, role, content FROM chat_history WHERE session_id = ?').all(session.session_id);
    console.log(`Found ${history.length} messages`);
    if (history.length > 0) {
        console.log('First 3 messages:');
        console.log(history.slice(0, 3));
        
        const clientIds = [...new Set(history.map(h => h.client_id))];
        console.log('\nUnique Client IDs in history:', clientIds);
    }
} else {
    console.log('Session not found');
}

db.close();
