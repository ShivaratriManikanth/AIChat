
const fs = require('fs');
let code = fs.readFileSync('widget/chatbot.js', 'utf8');

code = code.replace(
  /headers: \{ 'Content-Type': 'application\/json' \}/g,
  headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY }
);

fs.writeFileSync('widget/chatbot.js', code);
console.log('Replaced all JSON headers');

