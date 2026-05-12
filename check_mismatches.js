const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'server', 'chatbot.db');
const db = new Database(dbPath);

console.log('--- Mismatched Messages Check ---');
const mismatches = db.prepare(`
    SELECT c.client_id as history_client, s.client_id as session_client, COUNT(*) as count
    FROM chat_history c
    JOIN sessions s ON c.session_id = s.session_id
    WHERE c.client_id != s.client_id
    GROUP BY c.client_id, s.client_id
`).all();

console.log('Mismatches found:', mismatches);

if (mismatches.length > 0) {
    console.log('\nSuggested Fix: UPDATE chat_history SET client_id = (SELECT client_id FROM sessions WHERE sessions.session_id = chat_history.session_id) WHERE client_id != (SELECT client_id FROM sessions WHERE sessions.session_id = chat_history.session_id)');
}

db.close();
