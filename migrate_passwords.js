// One-time migration: hash all plain-text client passwords with bcrypt
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH || path.join(__dirname, 'server', 'chatbot.db');
const db     = new Database(dbPath);

async function migratePasswords() {
  const clients = db.prepare('SELECT id, email, password FROM clients').all();
  let migrated = 0;

  for (const client of clients) {
    // Skip already-hashed passwords (bcrypt hashes start with $2)
    if (client.password && client.password.startsWith('$2')) {
      console.log(`⏭️  Already hashed: ${client.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(client.password || 'changeme123', 10);
    db.prepare('UPDATE clients SET password = ? WHERE id = ?').run(hashed, client.id);
    console.log(`✅  Hashed password for: ${client.email}`);
    migrated++;
  }

  console.log(`\n✅ Migration complete — ${migrated} password(s) hashed.`);
  db.close();
}

migratePasswords().catch(console.error);
