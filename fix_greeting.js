const fs = require('fs');
let code = fs.readFileSync('widget/chatbot.js', 'utf8');

// 1. Remove greeting from init()
const oldInitGreeting =     // If email already verified or email capture disabled, show chat directly
    if (emailVerified || !CONFIG.emailCapture) {
      loadFromLocal();
      const history = JSON.parse(localStorage.getItem('chatbot_history') || '[]');
      if (history.length === 0) {
        const greeting = getTimeGreeting();
        addMessage(\\! \\, 'bot', {
          quickReplies: CONFIG.suggestedQuestions.length ? CONFIG.suggestedQuestions.slice(0, 3) : null
        });
      }
    }
  };

const newInitGreeting =     // If email already verified or email capture disabled, show chat directly
    if (emailVerified || !CONFIG.emailCapture) {
      loadFromLocal();
      const history = JSON.parse(localStorage.getItem('chatbot_history') || '[]');
      if (history.length === 0) {
        const greeting = getTimeGreeting();
        addMessage(\\! \\, 'bot', {
          quickReplies: CONFIG.suggestedQuestions.length ? CONFIG.suggestedQuestions.slice(0, 3) : null
        });
      }
    }
  };
// (Wait, this part is same, I need to find handleEmailSubmit)

// 2. Add greeting to handleEmailSubmit()
const oldSubmitEnd =     try {
      await fetch(\\/api/register\, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY },
        body: JSON.stringify({ email, sessionId: SESSION_ID })
      });
    } catch (e) {
      console.warn('Chatbot: Failed to register email on server');
    }
  };

const newSubmitEnd =     // Transition to chat interface
    document.getElementById('chatbot-email-screen').style.display = 'none';
    document.getElementById('chatbot-messages').style.display = 'block';
    document.getElementById('chatbot-input-area').style.display = 'flex';
    document.getElementById('chatbot-suggestions').style.display = 'block';
    document.getElementById('chatbot-advanced-features').style.display = 'flex';
    if (document.getElementById('chatbot-shortcuts-hint')) {
      document.getElementById('chatbot-shortcuts-hint').style.display = 'block';
    }

    // Show greeting ONLY AFTER email submission for new users
    const history = JSON.parse(localStorage.getItem('chatbot_history') || '[]');
    if (history.length === 0) {
      const greeting = getTimeGreeting();
      addMessage(\\! \\, 'bot', {
        quickReplies: CONFIG.suggestedQuestions.length ? CONFIG.suggestedQuestions.slice(0, 3) : null
      });
    }

    try {
      await fetch(\\/api/register\, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bot-key': API_KEY },
        body: JSON.stringify({ email, sessionId: SESSION_ID })
      });
    } catch (e) {
      console.warn('Chatbot: Failed to register email on server');
    }
  };

code = code.replace(oldSubmitEnd, newSubmitEnd);
fs.writeFileSync('widget/chatbot.js', code);
console.log('Moved greeting to after email submission');
