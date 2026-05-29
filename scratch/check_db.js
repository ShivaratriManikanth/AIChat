const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'server', 'chatbot.db');
const db = new Database(dbPath);

console.log("=== TABLES ===");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

for (const table of tables) {
  console.log(`\n=== SCHEMA FOR ${table.name} ===`);
  const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
  console.log(info);
}
