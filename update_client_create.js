const fs = require('fs');
let code = fs.readFileSync('server/server.js', 'utf8');

const oldLogic =     db.prepare('INSERT INTO clients (id, email, password, company_name, plan_id, payment_status) VALUES (?, ?, ?, ?, ?, ?)').run(
      clientId, email, finalPassword, company_name, plan_id || 1, 'COD_PENDING'
    );
    db.prepare('INSERT INTO bot_configs (client_id, bot_name) VALUES (?, ?)').run(
      clientId, company_name + ' Bot'
    );;

const newLogic =     db.prepare('INSERT INTO clients (id, email, password, company_name, plan_id, payment_status) VALUES (?, ?, ?, ?, ?, ?)').run(
      clientId, email, finalPassword, company_name, plan_id || 1, 'COD_PENDING'
    );
    
    // Automatically generate a unique bot for this new client
    const botId = 'bot_' + require('crypto').randomBytes(6).toString('hex');
    const apiKey = 'key_' + require('crypto').randomBytes(20).toString('hex');
    const defaultConfig = JSON.stringify({ botName: company_name + ' Bot', themeColor: '#4F46E5', apiKey });
    
    db.prepare('INSERT INTO bots (bot_id, name, client_id, config) VALUES (?, ?, ?, ?)').run(
      botId, company_name + ' Bot', clientId, defaultConfig
    );;

code = code.replace(oldLogic, newLogic);

const oldScript = &lt;script src="https://yourdomain.com/widget/chatbot.js" data-client-id="\"&gt;&lt;/script&gt;;
const newScript = &lt;script src="https://aichat-production-e0ec.up.railway.app/widget/chatbot.js" data-server="https://aichat-production-e0ec.up.railway.app" data-bot-id="\" data-api-key="\"&gt;&lt;/script&gt;;

code = code.replace(oldScript, newScript);

fs.writeFileSync('server/server.js', code);
console.log('Fixed client creation script');
