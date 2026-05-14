const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'server', 'chatbot.db');
const db = new Database(dbPath);

console.log('Tables:');
console.log(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

console.log('\nPlans Schema:');
try {
    console.log(db.prepare("PRAGMA table_info(plans)").all());
} catch (e) {
    console.log('Plans schema error:', e.message);
}

console.log('\nClients Sample:');
try {
    console.log(db.prepare("SELECT id, email, plan_id FROM clients LIMIT 5").all());
} catch (e) {
    console.log('Clients table error:', e.message);
}
