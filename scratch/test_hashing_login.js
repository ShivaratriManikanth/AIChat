const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'chatbot.db');
console.log('Loading database from:', dbPath);

const db = new Database(dbPath);

async function runTest() {
  console.log('Testing seeding hashes or existing data...');
  const clients = db.prepare('SELECT id, email, password FROM clients').all();
  
  for (const c of clients) {
    const isHashed = c.password && c.password.startsWith('$2');
    console.log(`Client [${c.email}]: password starts with $2? ${isHashed ? '✅ YES' : '❌ NO'} (${c.password.substring(0, 10)}...)`);
  }

  // Let's create a temporary client with hashed password
  const testEmail = 'test_hash_client_' + Date.now() + '@example.com';
  const testRawPassword = 'Password123!';
  const hashedPassword = await bcrypt.hash(testRawPassword, 10);
  
  const testClientId = 'cli_test_' + Date.now();
  
  console.log(`Inserting test client [${testEmail}] with hashed password...`);
  db.prepare('INSERT INTO clients (id, email, password, company_name, plan_id, payment_status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(testClientId, testEmail, hashedPassword, 'Test Hash Company', 1, 'COD_PENDING');

  console.log('Retrieving inserted client...');
  const inserted = db.prepare('SELECT * FROM clients WHERE id = ?').get(testClientId);
  console.log('Saved password:', inserted.password);
  
  console.log('Verifying login checks...');
  const matches = await bcrypt.compare(testRawPassword, inserted.password);
  console.log(`Plain password matching database hash? ${matches ? '✅ YES (Success)' : '❌ NO (Failed)'}`);

  // Cleanup
  console.log('Cleaning up test client...');
  db.prepare('DELETE FROM clients WHERE id = ?').run(testClientId);
  console.log('Cleanup completed successfully.');
}

runTest().catch(console.error).finally(() => db.close());
