const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '..', 'server', 'chatbot.db');
const db = new Database(dbPath);

console.log('Seeding plans...');
db.prepare("INSERT OR REPLACE INTO plans (id, name, price, duration, features) VALUES (1, 'Basic', 1000, '1 Month', '1000 messages, 1 bot')").run();
db.prepare("INSERT OR REPLACE INTO plans (id, name, price, duration, features) VALUES (2, 'Standard', 2000, '1 Month', '5000 messages, 3 bots')").run();
db.prepare("INSERT OR REPLACE INTO plans (id, name, price, duration, features) VALUES (3, 'Premium', 3000, '1 Month', '50000 messages, 10 bots')").run();

console.log('Plans seeded:');
console.log(db.prepare("SELECT * FROM plans").all());
