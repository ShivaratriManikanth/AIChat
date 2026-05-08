// ============================================================
//  AI CHATBOT WIDGET — Backend Server
//  Express + OpenAI + SQLite for chat history
// ============================================================

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const OpenAI     = require('openai');
const nodemailer = require('nodemailer');
const bcrypt     = require('bcryptjs');
const dns        = require('dns');

// Fix for Node 18+ preferring IPv6 in environments without IPv6 routing (e.g. Railway) causing ENETUNREACH
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}


const app  = express();
const PORT = process.env.PORT || 4000;

// ---- Middleware --------------------------------------------
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Serve GAdigital Solution Landing Page (at root)
app.use(express.static(path.join(__dirname, '..', 'gadigital')));

// Serve widget files
app.use('/widget', express.static(path.join(__dirname, '..', 'widget')));

// Serve admin dashboard
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Serve demo website
app.use('/demo', express.static(path.join(__dirname, '..', 'hospital-demo')));

// ---- Config ------------------------------------------------
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// ---- SQLite Database for Chat History ----------------------
let db;
try {
  const Database = require('better-sqlite3');
  // Use DB_PATH from environment if provided, otherwise default to local file
  const dbPath = process.env.DB_PATH || path.join(__dirname, 'chatbot.db');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN file_data TEXT DEFAULT ''`); } catch (e) {}
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN file_name TEXT DEFAULT ''`); } catch (e) {}
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN file_type TEXT DEFAULT ''`); } catch (e) {}
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN source TEXT DEFAULT ''`); } catch (e) {}
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN response_ms INTEGER DEFAULT 0`); } catch (e) {}
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN user_email TEXT DEFAULT ''`); } catch (e) {}

  // Leads table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      name       TEXT DEFAULT '',
      email      TEXT DEFAULT '',
      phone      TEXT DEFAULT '',
      page_url   TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata   TEXT DEFAULT '{}'
    )
  `);
  // Users table for email capture
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, session_id)
    )
  `);
  // Ensure multi-tenancy columns exist in all tables
  try { db.exec(`ALTER TABLE chat_history ADD COLUMN client_id TEXT DEFAULT 'default_client'`); } catch(e){}
  try { db.exec(`ALTER TABLE leads ADD COLUMN client_id TEXT DEFAULT 'default_client'`); } catch(e){}
  try { db.exec(`ALTER TABLE sessions ADD COLUMN client_id TEXT DEFAULT 'default_client'`); } catch(e){}
  try { db.exec(`ALTER TABLE users ADD COLUMN client_id TEXT DEFAULT 'default_client'`); } catch(e){}

  // Add email column to sessions if not exists
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN email TEXT DEFAULT ''`);
  } catch (e) { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE sessions ADD COLUMN bot_id TEXT DEFAULT 'default'`);
    db.exec(`ALTER TABLE sessions ADD COLUMN widget_version TEXT DEFAULT ''`);
    db.exec(`ALTER TABLE sessions ADD COLUMN last_user_msg_at DATETIME`);
    db.exec(`ALTER TABLE sessions ADD COLUMN abandoned INTEGER DEFAULT 0`);
  } catch (e) {}

  // Bots table for multi-tenant
  db.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      bot_id     TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      api_key    TEXT NOT NULL,
      config     TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Complaints table
  db.exec(`
    CREATE TABLE IF NOT EXISTS complaints (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      email      TEXT DEFAULT '',
      name       TEXT DEFAULT '',
      category   TEXT DEFAULT 'other',
      subject    TEXT DEFAULT '',
      message    TEXT NOT NULL,
      status     TEXT DEFAULT 'open',
      page_url   TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { db.exec(`ALTER TABLE complaints ADD COLUMN phone TEXT DEFAULT ''`); } catch (e) {}

  // SaaS Multi-tenant extensions
  db.exec(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      price INTEGER DEFAULT 0,
      duration TEXT DEFAULT '1 Month',
      features TEXT
    )
  `);
  try { db.exec(`ALTER TABLE plans ADD COLUMN price INTEGER DEFAULT 0`); } catch(e){}
  try { db.exec(`ALTER TABLE plans ADD COLUMN duration TEXT DEFAULT '1 Month'`); } catch(e){}
  // Seed default plans if empty
  const planCount = db.prepare('SELECT COUNT(*) as c FROM plans').get();
  if (planCount.c === 0) {
    db.prepare("INSERT INTO plans (name, price, duration, features) VALUES ('Basic', 1000, '1 Month', '')").run();
    db.prepare("INSERT INTO plans (name, price, duration, features) VALUES ('Standard', 2000, '1 Month', '')").run();
    db.prepare("INSERT INTO plans (name, price, duration, features) VALUES ('Premium', 3000, '1 Month', '')").run();
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      company_name TEXT,
      plan_id INTEGER,
      payment_status TEXT DEFAULT 'COD_PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS bot_configs (
      client_id TEXT PRIMARY KEY,
      bot_name TEXT DEFAULT 'AI Assistant',
      theme_color TEXT DEFAULT '#4F46E5',
      logo_url TEXT,
      position TEXT DEFAULT 'bottom-right'
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      url TEXT NOT NULL
    )
  `);

  // Alter existing tables for multi-tenancy
  try { db.exec(`ALTER TABLE bots ADD COLUMN client_id TEXT DEFAULT 'default_client'`); } catch(e){}
  try { db.exec(`ALTER TABLE bots ADD COLUMN api_key TEXT DEFAULT ''`); } catch(e){}

  // Data Migration: Fix chat history messages that have 'default_client' but belong to a specific client's session
  try {
    const fixResult = db.prepare(`
      UPDATE chat_history 
      SET client_id = (SELECT client_id FROM sessions WHERE sessions.session_id = chat_history.session_id)
      WHERE client_id = 'default_client' 
      AND EXISTS (SELECT 1 FROM sessions WHERE sessions.session_id = chat_history.session_id AND client_id != 'default_client')
    `).run();
    if (fixResult.changes > 0) console.log(`Fixed ${fixResult.changes} chat_history client_id mismatches`);
  } catch(e){}

  // Default super admin & client if empty
  const hasSuperAdmin = db.prepare("SELECT COUNT(*) as count FROM super_admins").get();
  if (hasSuperAdmin.count === 0) {
    db.prepare("INSERT INTO super_admins (email, password) VALUES ('superadmin@example.com', 'super123')").run();
  }
  const hasClient = db.prepare("SELECT COUNT(*) as count FROM clients").get();
  if (hasClient.count === 0) {
    db.prepare("INSERT INTO clients (id, email, password, company_name) VALUES ('default_client', 'client@example.com', 'client123', 'Default Company')").run();
    db.prepare("INSERT INTO bot_configs (client_id) VALUES ('default_client')").run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS flows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      flow_data TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS flow_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      flow_id INTEGER NOT NULL,
      node_id TEXT NOT NULL,
      response_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('SQLite database connected and SaaS schema initialized');
} catch (err) {
  console.error('CRITICAL DATABASE ERROR:', err);
}

// In-memory fallback
const memoryStore = {};

function saveMessage(clientId, sessionId, role, content, file, meta = {}, userEmail = null) {
  const safeMeta = meta || {};
  if (db) {
    try {
      db.prepare('INSERT OR IGNORE INTO sessions (session_id, client_id, email) VALUES (?, ?, ?)').run(sessionId, clientId || 'default_client', userEmail);
      db.prepare('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP, email = COALESCE(?, email) WHERE session_id = ?').run(userEmail, sessionId);
      db.prepare('INSERT INTO chat_history (client_id, session_id, role, content, file_data, file_name, file_type, source, response_ms, user_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        clientId || 'default_client', sessionId, role, content,
        file?.dataUrl || '', file?.name || '', file?.type || '',
        safeMeta.source || '', safeMeta.responseMs || 0, userEmail
      );
    } catch (err) {
      console.error('Database error in saveMessage:', err.message);
    }
  } else {
    if (!memoryStore[sessionId]) memoryStore[sessionId] = [];
    memoryStore[sessionId].push({ role, content, file, timestamp: new Date().toISOString(), userEmail, ...safeMeta });
  }
}

function getHistory(sessionId, clientId, limit = 20) {
  if (db) {
    return db.prepare(
      'SELECT role, content, file_data, file_name, file_type FROM chat_history WHERE session_id = ? AND client_id = ? ORDER BY id DESC LIMIT ?'
    ).all(sessionId, clientId || 'default_client', limit).reverse();
  }
  return (memoryStore[sessionId] || []).slice(-limit);
}

function getAllSessions(clientId) {
  if (db) {
    return db.prepare(`
      SELECT s.session_id, s.created_at, s.updated_at, s.metadata, s.email,
             COUNT(c.id) as message_count
      FROM sessions s
      LEFT JOIN chat_history c ON s.session_id = c.session_id
      WHERE s.client_id = ?
      GROUP BY s.session_id
      ORDER BY s.updated_at DESC
    `).all(clientId || 'default_client');
  }
  return Object.keys(memoryStore).map(id => ({
    session_id: id,
    message_count: memoryStore[id].length,
    created_at: memoryStore[id][0]?.timestamp,
    updated_at: memoryStore[id][memoryStore[id].length - 1]?.timestamp
  }));
}

// ---- OpenAI Client -----------------------------------------
let openai;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ---- Rate Limiting & Sanitization --------------------------
const rateMap = new Map();
function rateLimit(req, res, next) {
  const config = loadConfig();
  const limit = config.rateLimitPerMinute || 20;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const record = rateMap.get(ip) || { count: 0, reset: now + 60_000 };
  if (now > record.reset) { record.count = 0; record.reset = now + 60_000; }
  record.count++;
  rateMap.set(ip, record);
  if (record.count > limit) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  next();
}

function sanitize(text) {
  if (typeof text !== 'string') return '';
  // Strip HTML tags and scripts — keep emojis and normal chars
  return text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .slice(0, 2000);
}

// Domain restriction middleware
function restrictDomain(req, res, next) {
  const config = loadConfig();
  const allowed = config.allowedDomains || [];
  if (!allowed.length) return next(); // no restriction

  const origin = req.headers.origin || req.headers.referer || '';
  const isAllowed = allowed.some(d => {
    const clean = d.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return origin.includes(clean);
  });

  if (!isAllowed) {
    return res.status(403).json({ error: 'Domain not authorized to use this chatbot' });
  }
  next();
}

// Email notification helper
async function sendLeadEmail(lead) {
  try {
    const config = loadConfig();
    const emailCfg = config.emailNotifications || {};
    if (!emailCfg.enabled || !emailCfg.smtpUser || !emailCfg.adminEmail) return;

    const transporter = nodemailer.createTransport({
      host: emailCfg.smtpHost,
      port: emailCfg.smtpPort || 587,
      secure: emailCfg.smtpPort === 465,
      auth: { user: emailCfg.smtpUser, pass: emailCfg.smtpPass }
    });

    await transporter.sendMail({
      from: `"${config.companyName || 'Chatbot'}" <${emailCfg.smtpUser}>`,
      to: emailCfg.adminEmail,
      subject: `🎯 New Lead Captured: ${lead.name || lead.email}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:${config.themeColor || '#4F46E5'};">New Lead from ${config.companyName}</h2>
          <table style="border-collapse:collapse;width:100%;margin-top:16px;">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Name:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${lead.name || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Email:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${lead.email || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Phone:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${lead.phone || '-'}</td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Page:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${lead.pageUrl || '-'}</td></tr>
            <tr><td style="padding:8px;"><b>Time:</b></td><td style="padding:8px;">${new Date().toLocaleString()}</td></tr>
          </table>
          <p style="margin-top:20px;color:#888;font-size:12px;">Captured by ${config.botName} AI Chatbot</p>
        </div>
      `
    });
    console.log('Lead email sent to', emailCfg.adminEmail);
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

// Generate default API key if not set
(function ensureApiKey() {
  const config = loadConfig();
  if (!config.apiKey) {
    config.apiKey = 'bot_' + require('crypto').randomBytes(16).toString('hex');
    saveConfig(config);
    console.log('Generated default API key:', config.apiKey);
  }
})();

// API key middleware
function checkApiKey(req, res, next) {
  const provided = req.headers['x-bot-key'] || req.body?.apiKey || req.query?.apiKey;
  if (!provided) return res.status(401).json({ error: 'Missing API key' });

  if (db) {
    const bot = db.prepare('SELECT * FROM bots WHERE api_key = ?').get(provided);
    if (!bot) return res.status(401).json({ error: 'Invalid API key' });
    req.bot = bot;
    req.clientId = bot.client_id;
  }
  next();
}

// ---- Semantic (TF-IDF style) FAQ Search --------------------
const stopWords = new Set(['what', 'are', 'your', 'is', 'the', 'how', 'can', 'you', 'my', 'do', 'does', 'did', 'to', 'for', 'of', 'and', 'in', 'on', 'with', 'a', 'an', 'this', 'that', 'about', 'tell', 'me']);
function tokenize(text) {
  return (text || '').toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function cosineSimilarity(a, b) {
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);
  const freqA = {}, freqB = {};
  wordsA.forEach(w => freqA[w] = (freqA[w] || 0) + 1);
  wordsB.forEach(w => freqB[w] = (freqB[w] || 0) + 1);
  const all = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0, magA = 0, magB = 0;
  all.forEach(w => {
    const x = freqA[w] || 0, y = freqB[w] || 0;
    dot += x * y; magA += x * x; magB += y * y;
  });
  return magA && magB ? dot / Math.sqrt(magA * magB) : 0;
}

function semanticFaqMatch(query, faqs, threshold = 0.25) {
  let best = null, bestScore = 0;
  for (const faq of faqs) {
    const score = Math.max(
      cosineSimilarity(query, faq.question),
      cosineSimilarity(query, (faq.question || '') + ' ' + (faq.answer || ''))
    );
    if (score > bestScore) { bestScore = score; best = faq; }
  }
  return bestScore >= threshold ? { faq: best, score: bestScore } : null;
}

// ---- Website URL scraper -----------------------------------
async function scrapeUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : require('http');
    lib.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0 ChatbotTrainer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return scrapeUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('HTTP ' + res.statusCode + ' — Site may be blocking bots. Try a public/docs URL instead.'));
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Strip scripts/styles, then tags
        let text = body
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        resolve(text);
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

// ---- Helper functions for Multi-tenancy Config ----
function loadClientBotConfig(clientId) {
  if (!db) return loadConfig();
  const bot = db.prepare('SELECT config FROM bots WHERE client_id = ?').get(clientId);
  if (!bot) return loadConfig();
  try {
    const config = JSON.parse(bot.config);
    config.emailCapture = true; // Force mandatory
    return config;
  } catch(e) {
    return loadConfig();
  }
}

function saveClientBotConfig(clientId, config) {
  if (!db) return saveConfig(config);
  db.prepare('UPDATE bots SET config = ? WHERE client_id = ?').run(JSON.stringify(config), clientId);
}

// ---- API Routes --------------------------------------------

// GET /api/config — Widget loads config on init
app.get('/api/config', (req, res) => {
  const apiKey = req.headers['x-bot-key'] || req.query?.apiKey;
  let config;
  if (apiKey && db) {
    const bot = db.prepare('SELECT config FROM bots WHERE api_key = ?').get(apiKey);
    config = bot ? JSON.parse(bot.config) : loadConfig();
  } else {
    config = loadConfig();
  }
  // Don't expose sensitive data to widget
  config.emailCapture = true; // Force mandatory
  const { aiModel, systemPrompt, ...safeConfig } = config;
  res.json(safeConfig);
});

// POST /api/register — Register user email with session
app.post('/api/register', checkApiKey, (req, res) => {
  const { email, sessionId } = req.body;
  if (!email || !sessionId) {
    return res.status(400).json({ error: 'email and sessionId are required' });
  }
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (db) {
    db.prepare('INSERT OR IGNORE INTO users (email, session_id, client_id) VALUES (?, ?, ?)').run(email, sessionId, req.clientId);
    db.prepare('INSERT OR IGNORE INTO sessions (session_id, email, client_id) VALUES (?, ?, ?)').run(sessionId, email, req.clientId);
    db.prepare('UPDATE sessions SET email = ? WHERE session_id = ? AND client_id = ?').run(email, sessionId, req.clientId);
  } else {
    if (!memoryStore._users) memoryStore._users = {};
    memoryStore._users[sessionId] = email;
  }

  res.json({ success: true });
});

// GET /api/users — Admin: list all users with email
app.get('/api/users', requireAuth, (req, res) => {
  if (db) {
    const users = db.prepare(`
      SELECT u.email, u.session_id, u.created_at,
             COUNT(c.id) as message_count,
             MAX(c.timestamp) as last_message
      FROM users u
      LEFT JOIN chat_history c ON u.session_id = c.session_id
      WHERE u.client_id = ?
      GROUP BY u.email, u.session_id
      ORDER BY u.created_at DESC
    `).all(req.clientId);
    return res.json(users);
  }
  const users = Object.entries(memoryStore._users || {}).map(([sid, email]) => ({
    email, session_id: sid,
    message_count: (memoryStore[sid] || []).length
  }));
  res.json(users);
});

// GET /api/stats — Admin: dashboard stats
app.get('/api/stats', requireAuth, (req, res) => {
  if (db) {
    const totalUsers = db.prepare('SELECT COUNT(DISTINCT email) as count FROM users WHERE client_id = ?').get(req.clientId).count;
    const totalChats = db.prepare('SELECT COUNT(*) as count FROM chat_history WHERE client_id = ?').get(req.clientId).count;
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE client_id = ?').get(req.clientId).count;
    const activeSessions = db.prepare(
      "SELECT COUNT(*) as count FROM sessions WHERE client_id = ? AND updated_at > datetime('now', '-30 minutes')"
    ).get(req.clientId).count;
    const recentUsers = db.prepare(`
      SELECT u.email, u.created_at, COUNT(c.id) as message_count
      FROM users u
      LEFT JOIN chat_history c ON u.session_id = c.session_id
      WHERE u.client_id = ?
      GROUP BY u.email
      ORDER BY u.created_at DESC LIMIT 5
    `).all(req.clientId);
    return res.json({ totalUsers, totalChats, totalSessions, activeSessions, recentUsers });
  }
  res.json({
    totalUsers: Object.keys(memoryStore._users || {}).length,
    totalChats: Object.values(memoryStore).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0),
    totalSessions: Object.keys(memoryStore).filter(k => k !== '_users').length,
    activeSessions: 0,
    recentUsers: []
  });
});

// GET /api/flows — Get all flows for the logged-in client
app.get('/api/flows', requireAuth, (req, res) => {
  if (!db) return res.json([]);
  const flows = db.prepare('SELECT id, name, flow_data, is_active, created_at, updated_at FROM flows WHERE client_id = ?').all(req.clientId);
  res.json(flows);
});

// GET /api/flows/:id — Get a specific flow
app.get('/api/flows/:id', requireAuth, (req, res) => {
  if (!db) return res.status(404).json({ error: 'DB not available' });
  const flow = db.prepare('SELECT * FROM flows WHERE id = ? AND client_id = ?').get(req.params.id, req.clientId);
  if (!flow) return res.status(404).json({ error: 'Flow not found' });
  res.json(flow);
});

// POST /api/flows — Create or update a flow
app.post('/api/flows', requireAuth, (req, res) => {
  const { id, name, flow_data, is_active } = req.body;
  if (!db) return res.status(500).json({ error: 'DB not available' });
  
  if (id) {
    db.prepare('UPDATE flows SET name = ?, flow_data = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND client_id = ?')
      .run(name, JSON.stringify(flow_data || []), is_active ? 1 : 0, id, req.clientId);
    if (is_active) {
      db.prepare('UPDATE flows SET is_active = 0 WHERE id != ? AND client_id = ?').run(id, req.clientId);
    }
    return res.json({ success: true, id });
  } else {
    const result = db.prepare('INSERT INTO flows (client_id, name, flow_data, is_active) VALUES (?, ?, ?, ?)')
      .run(req.clientId, name || 'New Flow', JSON.stringify(flow_data || []), is_active ? 1 : 0);
    if (is_active) {
      db.prepare('UPDATE flows SET is_active = 0 WHERE id != ? AND client_id = ?').run(result.lastInsertRowid, req.clientId);
    }
    return res.json({ success: true, id: result.lastInsertRowid });
  }
});

// DELETE /api/flows/:id — Delete a flow
app.delete('/api/flows/:id', requireAuth, (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  db.prepare('DELETE FROM flows WHERE id = ? AND client_id = ?').run(req.params.id, req.clientId);
  res.json({ success: true });
});

// GET /api/active-flow — Get the active flow for a widget (uses bot key)
app.get('/api/active-flow', checkApiKey, (req, res) => {
  if (!db) return res.json({ flow: null });
  const flow = db.prepare('SELECT id, name, flow_data FROM flows WHERE client_id = ? AND is_active = 1 LIMIT 1').get(req.clientId);
  if (!flow) return res.json({ flow: null });
  
  try {
    flow.flow_data = JSON.parse(flow.flow_data);
  } catch(e) {
    flow.flow_data = [];
  }
  res.json({ flow });
});

// POST /api/chat — Main chat endpoint
app.post('/api/chat', restrictDomain, checkApiKey, rateLimit, async (req, res) => {
  let { message, sessionId, file, pageUrl, botId, widgetVersion, lang, email, flowNodeId, flowId } = req.body;

  if (!message && !file) {
    return res.status(400).json({ error: 'message or file is required' });
  }
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  // Handle flow responses
  if (flowNodeId && flowId) {
    if (db) {
      db.prepare('INSERT INTO flow_responses (client_id, session_id, flow_id, node_id, response_data) VALUES (?, ?, ?, ?, ?)')
        .run(req.clientId, sessionId, flowId, flowNodeId, JSON.stringify(message || file));
    }
    // Track bot_id and last_user_msg_at
    if (db) {
      db.prepare('INSERT OR IGNORE INTO sessions (session_id, client_id) VALUES (?, ?)').run(sessionId, req.clientId);
      db.prepare('UPDATE sessions SET bot_id = ?, widget_version = ?, last_user_msg_at = CURRENT_TIMESTAMP, client_id = ? WHERE session_id = ?')
        .run(botId || 'default', widgetVersion || '', req.clientId, sessionId);
    }
    saveMessage(req.clientId, sessionId, 'user', typeof message === 'string' ? message : JSON.stringify(message), file, { source: 'flow_response' }, email);
    
    return res.json({ success: true, source: 'flow' });
  }

  // Sanitize input
  message = sanitize(message);
  if (!message.trim() && !file) {
    return res.status(400).json({ error: 'Empty message' });
  }

  const config = loadClientBotConfig(req.clientId);
  const startTime = Date.now();

  // Track bot_id, widget version, last user msg time
  if (db) {
    db.prepare('INSERT OR IGNORE INTO sessions (session_id, client_id) VALUES (?, ?)').run(sessionId, req.clientId);
    db.prepare('UPDATE sessions SET bot_id = ?, widget_version = ?, last_user_msg_at = CURRENT_TIMESTAMP, client_id = ? WHERE session_id = ?')
      .run(botId || 'default', widgetVersion || '', req.clientId, sessionId);
  }

  // Save user message with optional file
  saveMessage(req.clientId, sessionId, 'user', message, file, null, email);

  // Try FAQ matching if enabled
  let faqMatch = null;
  if (config.enableFaq !== false) {
    // Try semantic (TF-IDF) match first if enabled
    if (config.semanticSearch !== false && config.faqs && config.faqs.length) {
      const result = semanticFaqMatch(message, config.faqs, 0.30);
      if (result) faqMatch = result.faq;
    }

    // Fallback: keyword match
    if (!faqMatch && config.faqs && Array.isArray(config.faqs)) {
      faqMatch = config.faqs.find(f => {
        if (!f || typeof f.question !== 'string') return false;
        const q = f.question.toLowerCase().replace(/[?]/g, '');
        const m = message.toLowerCase().replace(/[?]/g, '');
        return m.includes(q) || q.includes(m);
      });
    }

    if (faqMatch) {
      const responseMs = Date.now() - startTime;
      saveMessage(req.clientId, sessionId, 'assistant', faqMatch.answer, null, { source: 'faq', responseMs }, email);
      return res.json({ reply: faqMatch.answer, source: 'faq' });
    }
  }

  // Page context and language hint
  const langNames = { en: 'English', hi: 'Hindi', te: 'Telugu' };
  const languageName = langNames[lang] || 'English';
  const langHint = `\n\nIMPORTANT: You must generate your response entirely in ${languageName}. Do not use any other language.`;
  
  const advancedInstructions = `\n\nIMPORTANT FORMATTING:
Your output MUST be a valid JSON object with EXACTLY the following structure:
{
  "reply": "Your main response to the user. Adjust tone: empathetic/supportive if negative, friendly if positive.",
  "sentiment": "positive" | "neutral" | "negative",
  "suggestions": ["Related Question 1?", "Related Question 2?"]
}
Do NOT wrap in markdown \`\`\`json. Only output the raw JSON object.`;

  const contextHint = (pageUrl ? `\n\nUser is currently on the page: ${pageUrl}` : '') + langHint + advancedInstructions;

  const enableAi = config.enableAiChatbot !== false; // true by default

  // Use OpenAI if available
  let openaiReply = null;
  let openaiLowConfidence = false;
  if (enableAi && openai) {
    try {
      const history = getHistory(sessionId, req.clientId, 10);
      const messages = [
        { role: 'system', content: (config.systemPrompt || '') + contextHint },
        ...history.map(h => ({ role: h.role, content: h.content })),
      ];

      const completion = await openai.chat.completions.create({
        model: config.aiModel || 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      const rawReply = completion.choices[0].message.content;
      const responseMs = Date.now() - startTime;

      let replyText = rawReply;
      let suggestions = [];
      let sentiment = 'neutral';
      try {
        const parsed = JSON.parse(rawReply.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed.reply) {
          replyText = parsed.reply;
          suggestions = parsed.suggestions || [];
          sentiment = parsed.sentiment || 'neutral';
        }
      } catch (e) {}

      // Low confidence fallback - if reply contains uncertainty markers
      openaiLowConfidence = /i'?m not sure|i don'?t know|i cannot|i can'?t help/i.test(replyText);
      if (!openaiLowConfidence) {
        saveMessage(req.clientId, sessionId, 'assistant', replyText, null, { source: 'ai', responseMs, sentiment }, email);
        return res.json({ reply: replyText, source: 'ai', suggestions, sentiment });
      }
      openaiReply = replyText;
    } catch (err) {
      console.error('OpenAI error:', err.message);
    }
  }

  // ---- Fallback: Gemini 2.5 Flash API ----
  if (enableAi && process.env.GEMINI_API_KEY) {
    try {
      const https = require('https');
      const payload = JSON.stringify({
        systemInstruction: { parts: [{ text: (config.systemPrompt || '') + contextHint }] },
        contents: [{ role: 'user', parts: [{ text: message }] }]
      });

      let geminiReply = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          geminiReply = await new Promise((resolve, reject) => {
            const req = https.request('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
              }
            }, (res) => {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.candidates && parsed.candidates[0]?.content?.parts?.[0]?.text) {
                    resolve(parsed.candidates[0].content.parts[0].text);
                  } else {
                    reject(new Error('Unexpected Gemini structure: ' + data));
                  }
                } catch (e) {
                  reject(e);
                }
              });
            });
            req.on('error', reject);
            req.write(payload);
            req.end();
          });
          break; // Success! Break out of loop
        } catch (err) {
          if (attempt === 3) throw err; // Fail completely after 3 attempts
          await new Promise(r => setTimeout(r, 800)); // Wait 800ms before retrying
        }
      }

      const responseMs = Date.now() - startTime;

      let replyText = geminiReply;
      let suggestions = [];
      let sentiment = 'neutral';
      try {
        const parsed = JSON.parse(geminiReply.replace(/```json/g, '').replace(/```/g, '').trim());
        if (parsed.reply) {
          replyText = parsed.reply;
          suggestions = parsed.suggestions || [];
          sentiment = parsed.sentiment || 'neutral';
        }
      } catch (e) {}

      saveMessage(req.clientId, sessionId, 'assistant', replyText, null, { source: 'gemini', responseMs, sentiment }, email);
      return res.json({ reply: replyText, source: 'gemini', suggestions, sentiment });
    } catch (err) {
      console.error('Gemini error:', err.message);
    }
  }

  // If both OpenAI and Gemini fail, fallback to original logic
  if (openaiReply && openaiLowConfidence) {
    const finalReply = config.fallbackMessage || openaiReply;
    const responseMs = Date.now() - startTime;
    saveMessage(req.clientId, sessionId, 'assistant', finalReply, null, { source: 'ai', responseMs });
    return res.json({ reply: finalReply, source: 'ai', lowConfidence: true });
  }

  // If all AI fails, try keyword fallback
  const reply = generateFallbackReply(message, config);
  const responseMs = Date.now() - startTime;
  saveMessage(req.clientId, sessionId, 'assistant', reply, null, { source: 'fallback', responseMs }, email);
  return res.json({ reply, source: 'fallback' });
});

// POST /api/lead — Capture lead (name, phone, email)
app.post('/api/lead', checkApiKey, (req, res) => {
  const { sessionId, name, email, phone, pageUrl } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const safeName  = sanitize(name  || '');
  const safeEmail = sanitize(email || '');
  const safePhone = sanitize(phone || '');
  const safeUrl   = sanitize(pageUrl || '');

  // Validate email if present
  if (safeEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail)) return res.status(400).json({ error: 'Invalid email' });
  }

  if (db) {
    db.prepare('INSERT INTO leads (session_id, name, email, phone, page_url, client_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(sessionId, safeName, safeEmail, safePhone, safeUrl, req.clientId);
  }

  // Send email notification to admin (async, non-blocking)
  sendLeadEmail({ name: safeName, email: safeEmail, phone: safePhone, pageUrl: safeUrl });

  res.json({ success: true });
});

// POST /api/knowledge/pdf — Upload PDF to extract knowledge
app.post('/api/knowledge/pdf', requireAuth, async (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileData) return res.status(400).json({ error: 'fileData required (base64)' });

  try {
    const pdfParse = require('pdf-parse');
    const base64 = fileData.replace(/^data:application\/pdf;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const data   = await pdfParse(buffer);
    const text   = (data.text || '').trim();

    if (!text) return res.status(400).json({ error: 'No text extracted from PDF' });

    // Split into Q&A chunks — simple heuristic: split by double newlines
    const config = loadClientBotConfig(req.clientId);
    const chunks = text.split(/\n\s*\n/).filter(c => c.trim().length > 20);
    const newFaqs = chunks.slice(0, 20).map((chunk, i) => ({
      question: `[From ${fileName || 'PDF'}] Topic ${i + 1}`,
      answer: chunk.trim().slice(0, 500)
    }));

    config.faqs = [...(config.faqs || []), ...newFaqs];
    saveClientBotConfig(req.clientId, config);

    res.json({ success: true, added: newFaqs.length, totalChars: text.length });
  } catch (err) {
    console.error('PDF parse error:', err.message);
    res.status(500).json({ error: 'Failed to parse PDF: ' + err.message });
  }
});

// POST /api/logo — Upload logo (base64 image)
app.post('/api/logo', (req, res) => {
  const { logo } = req.body;
  if (!logo) return res.status(400).json({ error: 'logo required' });
  const config = loadConfig();
  config.logo = logo;
  saveConfig(config);
  res.json({ success: true });
});

// POST /api/test-email — Test email configuration
app.post('/api/test-email', async (req, res) => {
  try {
    await sendLeadEmail({ name: 'Test User', email: 'test@test.com', phone: '1234567890', pageUrl: 'http://test.com' });
    res.json({ success: true, message: 'Test email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads — Admin: list all leads
app.get('/api/leads', requireAuth, (req, res) => {
  if (db) {
    return res.json(db.prepare('SELECT * FROM leads WHERE client_id = ? ORDER BY created_at DESC').all(req.clientId));
  }
  res.json([]);
});

// GET /api/leads/csv — Admin: download leads as CSV
app.get('/api/leads/csv', requireAuth, (req, res) => {
  if (!db) return res.status(500).send('DB not available');
  const leads = db.prepare('SELECT name, email, phone, page_url, created_at FROM leads WHERE client_id = ? ORDER BY created_at DESC').all(req.clientId);
  const csvRows = [
    ['Name', 'Email', 'Phone', 'Page URL', 'Captured At'],
    ...leads.map(l => [l.name, l.email, l.phone, l.page_url, l.created_at])
  ];
  const csv = csvRows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="leads-${new Date().toISOString().slice(0,10)}.csv"`);
  res.send(csv);
});

// GET /api/analytics — advanced analytics
app.get('/api/analytics', requireAuth, (req, res) => {
  if (!db) return res.json({});
  const avgResponse = db.prepare("SELECT AVG(response_ms) as avg FROM chat_history WHERE role = 'assistant' AND response_ms > 0 AND client_id = ?").get(req.clientId).avg || 0;
  const sourceBreakdown = db.prepare(
    "SELECT source, COUNT(*) as count FROM chat_history WHERE role = 'assistant' AND source != '' AND client_id = ? GROUP BY source"
  ).all(req.clientId);
  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads WHERE client_id = ?').get(req.clientId).count;
  const totalUsers = db.prepare('SELECT COUNT(DISTINCT email) as count FROM users WHERE client_id = ?').get(req.clientId).count;
  const conversionRate = totalUsers > 0 ? ((totalLeads / totalUsers) * 100).toFixed(1) : 0;

  res.json({
    avgResponseMs: Math.round(avgResponse),
    sourceBreakdown,
    totalLeads,
    conversionRate: parseFloat(conversionRate)
  });
});

function generateFallbackReply(message, config) {
  const msg = message.toLowerCase();

  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
    return `Hello! Welcome to ${config.companyName}. How can I help you?`;
  }
  if (msg.includes('help')) {
    return `I'd be happy to help! You can ask me about our services, pricing, or contact info. Here are some things I can help with:\n${config.suggestedQuestions.map(q => `• ${q}`).join('\n')}`;
  }
  if (msg.includes('thank')) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  if (msg.includes('bye') || msg.includes('goodbye')) {
    return "Goodbye! Have a great day! Feel free to come back anytime.";
  }
  if (msg.includes('price') || msg.includes('cost') || msg.includes('plan')) {
    return "For pricing details, please visit our pricing page or contact our sales team. Would you like me to help with something else?";
  }
  if (msg.includes('contact') || msg.includes('support') || msg.includes('email')) {
    return `You can reach our support team at support@${config.companyName.toLowerCase().replace(/\s/g, '')}.com. Is there anything else?`;
  }
  return `Thank you for your message. I understand you're asking about "${message}". For the most accurate answer, our team will get back to you shortly. Meanwhile, you can try asking:\n${config.suggestedQuestions.slice(0, 2).map(q => `• ${q}`).join('\n')}`;
}

// GET /api/history — Get chat history for a session (used by widget)
app.get('/api/history/:sessionId', (req, res) => {
  if (!db) return res.json([]);
  // Look up client for this session to ensure we get the right history
  const session = db.prepare('SELECT client_id FROM sessions WHERE session_id = ?').get(req.params.sessionId);
  const clientId = session ? session.client_id : 'default_client';
  const history = getHistory(req.params.sessionId, clientId, 50);
  res.json(history);
});

// GET /api/sessions — Admin: list all sessions
app.get('/api/sessions', requireAuth, (req, res) => {
  if (db) {
    const sessions = db.prepare(`
      SELECT s.session_id, s.created_at, s.updated_at, s.metadata, s.email,
             COUNT(c.id) as message_count
      FROM sessions s
      LEFT JOIN chat_history c ON s.session_id = c.session_id
      WHERE s.client_id = ?
      GROUP BY s.session_id
      ORDER BY s.updated_at DESC
    `).all(req.clientId);
    return res.json(sessions);
  }
  res.json([]);
});

// GET /api/session/:id — Admin: get session messages
app.get('/api/session/:sessionId', requireAuth, (req, res) => {
  if (db) {
    // 1. Verify session ownership first
    const session = db.prepare('SELECT client_id FROM sessions WHERE session_id = ?').get(req.params.sessionId);
    if (!session || (req.userRole !== 'super' && session.client_id !== req.clientId)) {
      return res.status(403).json({ error: 'Access denied or session not found' });
    }
    
    // 2. Get history (now we can trust the sessionId)
    const history = db.prepare(
      'SELECT role, content, file_data, file_name, file_type FROM chat_history WHERE session_id = ? ORDER BY id ASC LIMIT 150'
    ).all(req.params.sessionId);
    return res.json(history);
  }
  res.json([]);
});

// PUT /api/config — Admin: update config
app.put('/api/config', requireAuth, (req, res) => {
  try {
    const current = loadClientBotConfig(req.clientId);
    const updated = { ...current, ...req.body };
    saveClientBotConfig(req.clientId, updated);
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// GET /api/config/full — Admin: full config including sensitive fields
app.get('/api/config/full', requireAuth, (req, res) => {
  res.json(loadClientBotConfig(req.clientId));
});

// POST /api/knowledge/url — Auto-train from website URL
app.post('/api/knowledge/url', requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Valid URL required (http:// or https://)' });
  }

  try {
    const text = await scrapeUrl(url);
    if (!text || text.length < 50) {
      return res.status(400).json({ error: 'No usable text found at URL' });
    }

    // Split text into chunks and add as FAQs
    const config = loadClientBotConfig(req.clientId);
    const chunks = text.match(/.{1,500}(?:\s|$)/g) || [];
    const usefulChunks = chunks.filter(c => c.trim().length > 80).slice(0, 15);

    const urlLabel = new URL(url).hostname;
    const newFaqs = usefulChunks.map((chunk, i) => ({
      question: `[From ${urlLabel}] Section ${i + 1}`,
      answer: chunk.trim().slice(0, 500)
    }));

    config.faqs = [...(config.faqs || []), ...newFaqs];
    saveClientBotConfig(req.clientId, config);

    res.json({ success: true, added: newFaqs.length, totalChars: text.length, url });
  } catch (err) {
    res.status(500).json({ error: 'Scrape failed: ' + err.message });
  }
});

// GET /api/bots - List all bots (multi-tenant)
app.get('/api/bots', requireAuth, (req, res) => {
  if (!db) return res.json([]);
  const botsRows = db.prepare('SELECT bot_id, name, config, created_at FROM bots WHERE client_id = ? ORDER BY created_at DESC').all(req.clientId);
  const bots = botsRows.map(row => {
    let apiKey = '';
    try { apiKey = JSON.parse(row.config || '{}').apiKey || ''; } catch(e){}
    return { bot_id: row.bot_id, name: row.name, api_key: apiKey, created_at: row.created_at };
  });
  res.json(bots);
});

// POST /api/bots - Create a new bot
app.post('/api/bots', requireAuth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Bot name required' });
  const bot_id = 'bot_' + require('crypto').randomBytes(6).toString('hex');
  const api_key = 'key_' + require('crypto').randomBytes(20).toString('hex');
  const defaultConfig = JSON.stringify({ 
    botName: name, 
    themeColor: '#4F46E5',
    emailCapture: true,
    emailCaptureTitle: 'Welcome!',
    emailCaptureSubtitle: 'Please enter your email to start.'
  });
  if (db) {
    db.prepare('INSERT INTO bots (bot_id, name, api_key, config, client_id) VALUES (?, ?, ?, ?, ?)').run(bot_id, name, api_key, defaultConfig, req.clientId);
  }
  res.json({ success: true, bot_id, api_key, name });
});

// DELETE /api/bots/:id
app.delete('/api/bots/:id', requireAuth, (req, res) => {
  if (db) db.prepare('DELETE FROM bots WHERE bot_id = ? AND client_id = ?').run(req.params.id, req.clientId);
  res.json({ success: true });
});

// POST /api/apikey/regenerate — Regenerate default API key
app.post('/api/apikey/regenerate', requireAuth, (req, res) => {
  const config = loadClientBotConfig(req.clientId);
  const newApiKey = 'key_' + require('crypto').randomBytes(20).toString('hex');
  config.apiKey = newApiKey;
  
  // Update both the specific field and the JSON config in DB
  if (db) {
    db.prepare('UPDATE bots SET api_key = ?, config = ? WHERE client_id = ?')
      .run(newApiKey, JSON.stringify(config), req.clientId);
  } else {
    saveConfig(config);
  }
  
  res.json({ success: true, apiKey: newApiKey });
});

// GET /api/dropoff — Drop-off analytics
app.get('/api/dropoff', requireAuth, (req, res) => {
  if (!db) return res.json({});

  // Mark sessions as abandoned if last user msg was > 30 min ago and no recent assistant reply
  db.prepare(`
    UPDATE sessions SET abandoned = 1
    WHERE last_user_msg_at IS NOT NULL
      AND last_user_msg_at < datetime('now', '-30 minutes')
      AND abandoned = 0
  `).run();

  const buckets = db.prepare(`
    SELECT
      CASE
        WHEN msg_count = 0 THEN '0 messages'
        WHEN msg_count BETWEEN 1 AND 3 THEN '1-3 messages'
        WHEN msg_count BETWEEN 4 AND 10 THEN '4-10 messages'
        ELSE '10+ messages'
      END as bucket,
      COUNT(*) as count
    FROM (
      SELECT s.session_id, COUNT(c.id) as msg_count
      FROM sessions s
      LEFT JOIN chat_history c ON s.session_id = c.session_id AND c.role = 'user'
      WHERE s.client_id = ?
      GROUP BY s.session_id
    )
    GROUP BY bucket
  `).all(req.clientId);

  const abandonedCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE abandoned = 1 AND client_id = ?').get(req.clientId).count;
  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE client_id = ?').get(req.clientId).count;
  const abandonRate = totalSessions > 0 ? ((abandonedCount / totalSessions) * 100).toFixed(1) : 0;

  // Widget version distribution
  const versions = db.prepare(`
    SELECT COALESCE(widget_version, 'unknown') as version, COUNT(*) as count
    FROM sessions
    WHERE widget_version IS NOT NULL AND widget_version != '' AND client_id = ?
    GROUP BY widget_version
  `).all(req.clientId);

  res.json({ buckets, abandonedCount, abandonRate: parseFloat(abandonRate), versions });
});

// ==============================================
// COMPLAINTS API
// ==============================================

// POST /api/complaint — Submit a complaint
app.post('/api/complaint', checkApiKey, (req, res) => {
  const { sessionId, email, name, phone, category, subject, message, pageUrl } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message required' });
  }
  const safeEmail    = sanitize(email || '');
  const safeName     = sanitize(name || '');
  const safePhone    = sanitize(phone || '');
  const safeCategory = sanitize(category || 'other');
  const safeSubject  = sanitize(subject || '');
  const safeMessage  = sanitize(message);
  const safeUrl      = sanitize(pageUrl || '');

  if (db) {
    db.prepare(
      'INSERT INTO complaints (session_id, email, name, phone, category, subject, message, page_url, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(sessionId, safeEmail, safeName, safePhone, safeCategory, safeSubject, safeMessage, safeUrl, req.clientId);
  }

  // Send notification email (reuse sendLeadEmail-like path)
  try {
    const config = loadConfig();
    const emailCfg = config.emailNotifications || {};
    if (emailCfg.enabled && emailCfg.smtpUser && emailCfg.adminEmail) {
      const transporter = nodemailer.createTransport({
        host: emailCfg.smtpHost,
        port: emailCfg.smtpPort || 587,
        secure: emailCfg.smtpPort === 465,
        auth: { user: emailCfg.smtpUser, pass: emailCfg.smtpPass }
      });
      transporter.sendMail({
        from: `"${config.companyName || 'Chatbot'}" <${emailCfg.smtpUser}>`,
        to: emailCfg.adminEmail,
        subject: `⚠️ New Complaint: ${safeSubject || safeCategory}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#EF4444;">⚠️ New Complaint Received</h2>
            <table style="border-collapse:collapse;width:100%;margin-top:16px;">
              <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Name:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${safeName || '-'}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Mobile:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${safePhone || '-'}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Email:</b></td><td style="padding:8px;border-bottom:1px solid #eee;">${safeEmail || '-'}</td></tr>
              <tr><td style="padding:8px;"><b>Issue:</b></td><td style="padding:8px;">${safeMessage}</td></tr>
            </table>
          </div>`
      }).catch(e => console.error('Complaint email failed:', e.message));
    }
  } catch (e) { /* email optional */ }

  res.json({ success: true, ticketId: 'CMP-' + Date.now().toString(36).toUpperCase() });
});

// GET /api/complaints — Admin: list all
app.get('/api/complaints', requireAuth, (req, res) => {
  if (!db) return res.json([]);
  res.json(db.prepare('SELECT * FROM complaints WHERE client_id = ? ORDER BY created_at DESC').all(req.clientId));
});

// PUT /api/complaint/:id/status — Admin: update status
app.put('/api/complaint/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  if (!['open', 'in_progress', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (db) db.prepare('UPDATE complaints SET status = ? WHERE id = ? AND client_id = ?').run(status, req.params.id, req.clientId);
  res.json({ success: true });
});

// ==========================================
// SAAS CLIENT AUTHENTICATION (JWT)
// ==========================================
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_saas_key';

// PUBLIC PURCHASE ENDPOINT (GAdigital Solution)
app.post('/api/purchase', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const { company_name, email, plan_id, password } = req.body;
  
  if (!company_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const clientId = 'cli_' + Date.now() + Math.random().toString(36).substring(2, 8);
  
  try {
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM clients WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    db.prepare('INSERT INTO clients (id, email, password, company_name, plan_id, payment_status) VALUES (?, ?, ?, ?, ?, ?)').run(
      clientId, email, password, company_name, plan_id || 1, 'COD_PENDING'
    );
    
    const botId = 'bot_' + require('crypto').randomBytes(6).toString('hex');
    const apiKey = 'key_' + require('crypto').randomBytes(20).toString('hex');
    const defaultConfig = JSON.stringify({ 
      botName: company_name + ' Bot', 
      themeColor: '#6366f1', 
      apiKey,
      emailCapture: true,
      emailCaptureTitle: 'Welcome to ' + company_name,
      emailCaptureSubtitle: 'Please enter your email to start the conversation.'
    });
    
    db.prepare('INSERT INTO bots (bot_id, name, client_id, api_key, config) VALUES (?, ?, ?, ?, ?)').run(
      botId, company_name + ' Bot', clientId, apiKey, defaultConfig
    );
    
    // Send Email via GAdigital (non-blocking, fire-and-forget)
    sendWelcomeEmail({ company_name, email, password, botId, apiKey, plan_id })
      .then(() => console.log(`📧 Welcome email sent to ${email}`))
      .catch(err => console.error(`❌ Email failed for ${email}:`, err.message));
    
    res.json({ success: true, clientId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// TEST ENDPOINT: Actually try to send a test email and report errors
app.get('/api/test-smtp', async (req, res) => {
  const smtpEmail = process.env.SMTP_EMAIL || 'NOT SET';
  const smtpPass = process.env.SMTP_PASSWORD ? '✅ SET (' + process.env.SMTP_PASSWORD.length + ' chars)' : '❌ NOT SET';
  const serverUrl = process.env.SERVER_URL || 'NOT SET';
  
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    return res.json({ error: 'SMTP not configured', smtp_email: smtpEmail, smtp_password_status: smtpPass });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const targetEmail = req.query.to || process.env.SMTP_EMAIL;

    // Verify connection
    await transporter.verify();
    
    // Send a real test email to yourself or the specified client
    const info = await transporter.sendMail({
      from: `"GAdigital Test" <${process.env.SMTP_EMAIL}>`,
      to: targetEmail,
      subject: '✅ SMTP Test - GAdigital Solution',
      text: 'If you receive this, your SMTP is working correctly!'
    });

    res.json({
      success: true,
      message: `Test email sent to ${targetEmail}!`,
      messageId: info.messageId,
      smtp_email: smtpEmail,
      target_email: targetEmail,
      smtp_password_status: smtpPass
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message,
      error_code: err.code,
      smtp_email: smtpEmail,
      smtp_password_status: smtpPass
    });
  }
});

// Helper for sending welcome email
async function sendWelcomeEmail({ company_name, email, password, botId, apiKey, plan_id }) {
  console.log('📧 Attempting to send email to:', email);
  
  const planName = plan_id === '3' ? 'Premium' : plan_id === '2' ? 'Standard' : 'Basic';
  const serverUrl = process.env.SERVER_URL || 'https://aichat-production-e0ec.up.railway.app';
  const subject = '🚀 Your AI Chatbot is Ready! - GAdigital Solution';

  const htmlContent = `
    <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
      <div style="background: #6366f1; padding: 40px; border-radius: 20px 20px 0 0; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 28px;">Welcome to the Future!</h1>
        <p style="opacity: 0.9; margin-top: 10px;">GAdigital Solution has successfully activated your ${planName} Plan.</p>
      </div>
      <div style="padding: 40px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 20px 20px;">
        <h2 style="font-size: 20px; color: #6366f1;">Hello ${company_name},</h2>
        <p>Your AI Chatbot is now ready to be integrated into your website. Here are your access details:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">DASHBOARD LOGIN</p>
          <p style="margin: 8px 0;"><b>Link:</b> <a href="${serverUrl}/admin/login.html" style="color: #6366f1;">Click here to Login</a></p>
          <p style="margin: 4px 0;"><b>Username:</b> ${email}</p>
          <p style="margin: 4px 0;"><b>Password:</b> ${password}</p>
        </div>

        <h3 style="font-size: 16px;">How to Embed Your Chatbot</h3>
        <p style="font-size: 14px;">Simply copy and paste the code below into your website's <code>&lt;head&gt;</code> or <code>&lt;body&gt;</code> tag:</p>
        
        <div style="background: #1e293b; color: #94a3b8; padding: 20px; border-radius: 12px; font-family: monospace; font-size: 12px; overflow-x: auto;">
          &lt;script <br>
          &nbsp;&nbsp;src="${serverUrl}/widget/chatbot.js" <br>
          &nbsp;&nbsp;data-server="${serverUrl}" <br>
          &nbsp;&nbsp;data-bot-id="${botId}" <br>
          &nbsp;&nbsp;data-api-key="${apiKey}"<br>
          &gt;&lt;/script&gt;
        </div>

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b;">
          <p><b>Payment Mode:</b> Cash on Delivery (COD)</p>
          <p>Our team will reach out to you shortly for the payment collection.</p>
          <p style="margin-top: 20px;">Best Regards,<br><b>GAdigital Solution Team</b></p>
        </div>
      </div>
    </div>
  `;

  // 1. Try Resend HTTP API
  if (process.env.RESEND_API_KEY) {
    console.log('📧 Using Resend API');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'GAdigital Solution <onboarding@resend.dev>', // Change when domain is verified
        to: email,
        subject: subject,
        html: htmlContent
      })
    });
    if (!res.ok) throw new Error('Resend Error: ' + await res.text());
    return;
  }

  // 2. Try SendGrid HTTP API
  if (process.env.SENDGRID_API_KEY) {
    console.log('📧 Using SendGrid API');
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email }] }],
        from: { email: process.env.SMTP_EMAIL || 'manikanthshivaratri@gmail.com', name: 'GAdigital Solution' },
        subject: subject,
        content: [{ type: 'text/html', value: htmlContent }]
      })
    });
    if (!res.ok) throw new Error('SendGrid Error: ' + await res.text());
    return;
  }

  // 3. Fallback to Nodemailer SMTP
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.log('⚠️ No Email API or SMTP configured. Logged creds:', { email, password, botId });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: `"GAdigital Solution" <${process.env.SMTP_EMAIL}>`,
    to: email,
    subject: subject,
    html: htmlContent
  });
}
// ---- ONE-TIME: Migrate plain-text passwords to bcrypt hashes ----
app.post('/api/super/migrate-passwords', requireSuperAuth, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const clients = db.prepare('SELECT id, email, password FROM clients').all();
  let migrated = 0;
  for (const client of clients) {
    if (client.password && client.password.startsWith('$2')) continue; // already hashed
    const hashed = await bcrypt.hash(client.password || 'changeme123', 10);
    db.prepare('UPDATE clients SET password = ? WHERE id = ?').run(hashed, client.id);
    migrated++;
    console.log(`🔒 Hashed password for: ${client.email}`);
  }
  res.json({ success: true, migrated, total: clients.length });
});

app.put('/api/super/clients/:id', requireSuperAuth, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const clientId = req.params.id;
  const { email, password, company_name, plan_id } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  
  try {
    if (password && password.trim()) {
      // Hash the new password before storing
      const hashed = await bcrypt.hash(password.trim(), 10);
      db.prepare('UPDATE clients SET email = ?, password = ?, company_name = COALESCE(?, company_name), plan_id = COALESCE(?, plan_id) WHERE id = ?').run(email, hashed, company_name || null, plan_id || null, clientId);
    } else {
      db.prepare('UPDATE clients SET email = ?, company_name = COALESCE(?, company_name), plan_id = COALESCE(?, plan_id) WHERE id = ?').run(email, company_name || null, plan_id || null, clientId);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update failed: ' + err.message });
  }
});

app.delete('/api/super/clients/:id', requireSuperAuth, (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const clientId = req.params.id;
  try {
    db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);
    db.prepare('DELETE FROM bots WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM users WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM leads WHERE client_id = ?').run(clientId);
    db.prepare('DELETE FROM chat_history WHERE client_id = ?').run(clientId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Deletion failed' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!db) return res.status(500).json({ error: 'DB not available' });

  // Super Admin Check (hardcoded credentials remain unchanged)
  if (email === 'admin@aichat.com' && password === 'admin123') {
    const token = jwt.sign({ role: 'super' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ success: true, token, role: 'super' });
  }

  const client = db.prepare('SELECT * FROM clients WHERE email = ?').get(email);
  if (client) {
    // Support both plain text (legacy) and hashed passwords
    let passwordMatch = false;
    if (client.password && client.password.startsWith('$2')) {
      // Bcrypt hash
      passwordMatch = await bcrypt.compare(password, client.password);
    } else {
      // Legacy plain text
      passwordMatch = (client.password === password);
    }
    if (passwordMatch) {
      const token = jwt.sign({ clientId: client.id, role: 'client' }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ success: true, token, clientId: client.id, role: 'client' });
    }
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.clientId = decoded.clientId;
    req.userRole = decoded.role;
    next();
  });
}

function requireSuperAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || decoded.role !== 'super') return res.status(403).json({ error: 'Super Admin access required' });
    next();
  });
}

// ==========================================
// SAAS SUPER ADMIN ENDPOINTS
// ==========================================

// ---- Plans CRUD ----
app.get('/api/super/plans', requireSuperAuth, (req, res) => {
  if (!db) return res.json([]);
  res.json(db.prepare('SELECT * FROM plans ORDER BY id').all());
});
app.post('/api/super/plans', requireSuperAuth, (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const { name, price, duration } = req.body;
  if (!name) return res.status(400).json({ error: 'Plan name required' });
  const result = db.prepare('INSERT INTO plans (name, price, duration, features) VALUES (?, ?, ?, ?)').run(
    name, price || 0, duration || '1 Month', ''
  );
  res.json({ success: true, id: result.lastInsertRowid });
});
app.put('/api/super/plans/:id', requireSuperAuth, (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const { name, price, duration } = req.body;
  db.prepare('UPDATE plans SET name = ?, price = ?, duration = ? WHERE id = ?').run(
    name, price || 0, duration || '1 Month', req.params.id
  );
  res.json({ success: true });
});
app.delete('/api/super/plans/:id', requireSuperAuth, (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  db.prepare('DELETE FROM plans WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ---- Clients ----
app.get('/api/super/clients', requireSuperAuth, (req, res) => {
  if (!db) return res.json([]);
  const clients = db.prepare('SELECT id, email, password, company_name, plan_id, payment_status, created_at FROM clients').all();
  res.json(clients);
});

app.post('/api/super/clients', requireSuperAuth, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const { company_name, email, plan_id, password, duration } = req.body;
  const clientId = 'cli_' + Date.now() + Math.random().toString(36).substring(2, 8);
  const rawPassword = password || Math.random().toString(36).substring(2, 10);
  const hashedPassword = await bcrypt.hash(rawPassword, 10);
  
  try {
    db.prepare('INSERT INTO clients (id, email, password, company_name, plan_id, payment_status) VALUES (?, ?, ?, ?, ?, ?)').run(
      clientId, email, hashedPassword, company_name, plan_id || 1, 'COD_PENDING'
    );
    
    // Automatically generate a unique bot for this new client
    const botId = 'bot_' + require('crypto').randomBytes(6).toString('hex');
    const apiKey = 'key_' + require('crypto').randomBytes(20).toString('hex');
    const defaultConfig = JSON.stringify({ 
      botName: company_name + ' Bot', 
      themeColor: '#4F46E5', 
      apiKey,
      emailCapture: true,
      emailCaptureTitle: 'Welcome!',
      emailCaptureSubtitle: 'Please enter your email to start the conversation.'
    });
    
    db.prepare('INSERT INTO bots (bot_id, name, client_id, api_key, config) VALUES (?, ?, ?, ?, ?)').run(
      botId, company_name + ' Bot', clientId, apiKey, defaultConfig
    );
    
    // Send Email to Client with the RAW (pre-hash) password so they can login
    await sendWelcomeEmail({ company_name, email, password: rawPassword, botId, apiKey, plan_id });
    
    res.json({ success: true, clientId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Email Broadcast (Client sends bulk email to their users/leads) ----
app.post('/api/broadcast', requireAuth, async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not available' });
  const { subject, body, audience } = req.body; // audience: 'users' | 'leads' | 'all'
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required' });

  // Get client's SMTP config from their bot config
  const bot = db.prepare('SELECT config FROM bots WHERE client_id = ?').get(req.clientId);
  if (!bot) return res.status(404).json({ error: 'Bot config not found' });

  let clientConfig = {};
  try { clientConfig = JSON.parse(bot.config); } catch(e) {}

  const emailCfg = clientConfig.emailNotifications || {};
  const smtpUser = emailCfg.smtpUser || process.env.SMTP_EMAIL;
  const smtpPass = emailCfg.smtpPass || process.env.SMTP_PASSWORD;
  const smtpHost = emailCfg.smtpHost || 'smtp.gmail.com';
  const smtpPort = emailCfg.smtpPort || 465;

  if (!smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'SMTP not configured. Please set SMTP details in Settings > Email Notifications.' });
  }

  // Collect target emails based on audience — each table queried independently for safety
  let emails = [];
  try {
    const fetchUsersEmails = () => {
      try {
        return db.prepare('SELECT DISTINCT email FROM users WHERE client_id = ? AND email IS NOT NULL AND email != ""').all(req.clientId).map(u => u.email);
      } catch(e) {
        // Fallback: client_id column may not exist in older DB
        try {
          return db.prepare('SELECT DISTINCT email FROM users WHERE email IS NOT NULL AND email != ""').all().map(u => u.email);
        } catch(e2) { return []; }
      }
    };
    const fetchLeadsEmails = () => {
      try {
        return db.prepare('SELECT DISTINCT email FROM leads WHERE client_id = ? AND email IS NOT NULL AND email != ""').all(req.clientId).map(l => l.email);
      } catch(e) {
        // Fallback: client_id column may not exist in older DB
        try {
          return db.prepare('SELECT DISTINCT email FROM leads WHERE email IS NOT NULL AND email != ""').all().map(l => l.email);
        } catch(e2) { return []; }
      }
    };

    if (audience === 'leads') {
      emails = fetchLeadsEmails();
    } else if (audience === 'users') {
      emails = fetchUsersEmails();
    } else {
      // 'all' — merge both, deduplicate
      const set = new Set([...fetchUsersEmails(), ...fetchLeadsEmails()]);
      emails = [...set];
    }
  } catch(e) {
    return res.status(500).json({ error: 'Failed to fetch recipients: ' + e.message });
  }

  if (emails.length === 0) {
    return res.status(400).json({ error: 'No recipients found for the selected audience.' });
  }

  // Build transporter using client's SMTP or system SMTP
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort == 465,
    auth: { user: smtpUser, pass: smtpPass }
  });

  const companyName = clientConfig.companyName || clientConfig.botName || 'Your Company';
  const htmlBody = body.replace(/\n/g, '<br>');

  let sent = 0, failed = 0, failedEmails = [];
  for (const to of emails) {
    try {
      await transporter.sendMail({
        from: `"${companyName}" <${smtpUser}>`,
        to,
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;border-radius:12px 12px 0 0;">
              <h2 style="color:white;margin:0;font-size:22px;">${companyName}</h2>
            </div>
            <div style="background:#ffffff;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
              <div style="font-size:15px;line-height:1.7;color:#374151;">${htmlBody}</div>
              <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">This email was sent by ${companyName} via AI Chatbot Widget.</p>
            </div>
          </div>
        `
      });
      sent++;
    } catch(e) {
      failed++;
      failedEmails.push(to);
      console.error(`Broadcast failed for ${to}:`, e.message);
    }
  }

  res.json({ success: true, total: emails.length, sent, failed, failedEmails });
});

// ---- Start Server ------------------------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  AI Chatbot Server running on http://localhost:${PORT}`);
  console.log(`  Widget URL:  http://localhost:${PORT}/widget/chatbot.js`);
  console.log(`  Admin Panel: http://localhost:${PORT}/admin\n`);
});
