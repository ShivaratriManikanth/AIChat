const fs = require('fs');
let code = fs.readFileSync('widget/chatbot.js', 'utf8');

// Replace fetch calls to /api/register
code = code.replace(
  /fetch\(\$\{SERVER_URL\}\/api\/register, \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \}/g,
  "fetch(${SERVER_URL}/api/register, {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY }"
);

// Replace fetch calls to /api/lead
code = code.replace(
  /fetch\(\$\{SERVER_URL\}\/api\/lead, \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \}/g,
  "fetch(${SERVER_URL}/api/lead, {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY }"
);

// Replace fetch calls to /api/complaint
code = code.replace(
  /fetch\(\$\{SERVER_URL\}\/api\/complaint, \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \}/g,
  "fetch(${SERVER_URL}/api/complaint, {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY }"
);

// Replace fetch calls to /api/chat for ratings
code = code.replace(
  /fetch\(\$\{SERVER_URL\}\/api\/chat, \{\n\s*method: 'POST',\n\s*headers: \{ 'Content-Type': 'application\/json' \}/g,
  "fetch(${SERVER_URL}/api/chat, {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY }"
);

fs.writeFileSync('widget/chatbot.js', code);
console.log('Updated widget fetch headers');
