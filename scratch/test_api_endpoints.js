const { spawn } = require('child_process');
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'chatbot.db');
const db = new Database(dbPath);

function postJSON(urlPath, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            raw: body
          });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function getJSON(urlPath, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            raw: body
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function putJSON(urlPath, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            raw: body
          });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSuite() {
  console.log('🚀 Starting Express Server...');
  const server = spawn('node', ['server/server.js'], {
    env: { ...process.env, PORT: '3000' }
  });

  server.stdout.on('data', (data) => {
    console.log(`[Server]: ${data.toString().trim()}`);
  });

  server.stderr.on('data', (data) => {
    console.error(`[Server Error]: ${data.toString().trim()}`);
  });

  // Wait for server to start
  await delay(2000);

  try {
    console.log('\n--- 1. Testing Self-Registration via /api/purchase ---');
    const testEmail = 'customer_self_reg_' + Date.now() + '@example.com';
    const testPassword = 'Password123!';
    const regPayload = {
      company_name: 'Test Customer self-reg',
      email: testEmail,
      password: testPassword,
      plan_id: 2
    };

    const regRes = await postJSON('/api/purchase', regPayload);
    console.log('Registration Status Code:', regRes.statusCode);
    console.log('Registration Response:', regRes.data);

    if (regRes.statusCode !== 200 || !regRes.data.success) {
      throw new Error('Registration failed!');
    }

    const clientId = regRes.data.clientId;

    console.log('\n--- 2. Verifying password is saved hashed in DB ---');
    const dbRecord = db.prepare('SELECT password FROM clients WHERE id = ?').get(clientId);
    console.log('Stored password:', dbRecord.password);
    if (!dbRecord.password.startsWith('$2')) {
      throw new Error('FAILED: Password was NOT stored as a bcrypt hash!');
    }
    console.log('✅ PASS: Password is safely hashed.');

    console.log('\n--- 3. Verifying Login Endpoint /api/login works with plaintext ---');
    const loginRes = await postJSON('/api/login', {
      email: testEmail,
      password: testPassword
    });
    console.log('Login Status Code:', loginRes.statusCode);
    console.log('Login Response:', loginRes.data);
    if (loginRes.statusCode !== 200 || !loginRes.data.success) {
      throw new Error('FAILED: Hashed client login failed with raw password!');
    }
    console.log('✅ PASS: Login succeeded.');

    console.log('\n--- 4. Verifying Login fails with incorrect password ---');
    const badLoginRes = await postJSON('/api/login', {
      email: testEmail,
      password: 'WrongPassword123!'
    });
    console.log('Bad Login Status Code (should be 401):', badLoginRes.statusCode);
    if (badLoginRes.statusCode !== 401) {
      throw new Error('FAILED: Login did not reject invalid password!');
    }
    console.log('✅ PASS: Login rejected invalid password correctly.');

    console.log('\n--- 5. Log in as Superadmin to test CRUD actions ---');
    const superLogin = await postJSON('/api/login', {
      email: 'admin@aichat.com',
      password: 'admin123'
    });
    console.log('Super Login Status Code:', superLogin.statusCode);
    const superToken = superLogin.data.token;
    const authHeaders = { 'Authorization': `Bearer ${superToken}` };

    console.log('\n--- 6. Test Superadmin Manual Client Creation with Hashing ---');
    const manualEmail = 'manual_client_' + Date.now() + '@example.com';
    const manualPassword = 'SuperSecret123!';
    const manualCreateRes = await postJSON('/api/super/clients', {
      company_name: 'Superadmin Manual Client',
      email: manualEmail,
      password: manualPassword,
      plan_id: 3
    }, authHeaders);
    console.log('Manual Create Status Code:', manualCreateRes.statusCode);
    console.log('Manual Create Response:', manualCreateRes.data);
    
    const manualClientId = manualCreateRes.data.clientId;
    const manualDbRecord = db.prepare('SELECT password FROM clients WHERE id = ?').get(manualClientId);
    console.log('Manually created stored password:', manualDbRecord.password);
    if (!manualDbRecord.password.startsWith('$2')) {
      throw new Error('FAILED: Manually created client password is not hashed!');
    }
    console.log('✅ PASS: Manually created client password is saved securely as hash.');

    console.log('\n--- 7. Test Superadmin Client Password Editing with Hashing ---');
    const newPassword = 'NewlyChangedPassword99!';
    const editRes = await putJSON(`/api/super/clients/${manualClientId}`, {
      email: manualEmail,
      password: newPassword,
      company_name: 'Superadmin Manual Client Edited',
      plan_id: 3
    }, authHeaders);
    console.log('Edit Status Code:', editRes.statusCode);
    console.log('Edit Response:', editRes.data);

    const editedDbRecord = db.prepare('SELECT password FROM clients WHERE id = ?').get(manualClientId);
    console.log('Edited stored password:', editedDbRecord.password);
    if (!editedDbRecord.password.startsWith('$2')) {
      throw new Error('FAILED: Edited client password is not hashed!');
    }
    console.log('✅ PASS: Edited client password is saved securely as hash.');

    console.log('\n--- 8. Verifying login works with edited password ---');
    const editedLogin = await postJSON('/api/login', {
      email: manualEmail,
      password: newPassword
    });
    console.log('Edited Login Status:', editedLogin.statusCode);
    if (editedLogin.statusCode !== 200) {
      throw new Error('FAILED: Cannot login after password update!');
    }
    console.log('✅ PASS: Login with new password succeeded.');

    // Cleanup
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    db.prepare('DELETE FROM clients WHERE id = ?').run(manualClientId);
    console.log('\n🎉 ALL TESTS PASSED FLawlessly! Cleaned up successfully.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    console.log('Shutting down server...');
    server.kill();
    db.close();
  }
}

runSuite();
