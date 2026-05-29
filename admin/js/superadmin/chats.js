async function loadDemoSessions() {
  try {
    const res = await fetchAuth('/api/super/demo-bot/sessions');
    const sessions = await res.json();
    
    const list = document.getElementById('dbot-sessions-list');
    if (sessions.length === 0) {
      list.innerHTML = `<div style="padding:20px; text-align:center; color:#888; font-size:13px;">No chat sessions found.</div>`;
      return;
    }
    
    list.innerHTML = sessions.map(s => {
      const email = s.email || 'Anonymous User';
      const msgCount = s.message_count;
      const dateStr = new Date(s.updated_at).toLocaleString();
      return `
        <div class="session-item" id="dbot-session-${s.session_id}" onclick="viewDemoSession('${s.session_id}', '${email}')">
          <div style="font-weight: 700; font-size: 13.5px; color: #1a1a2e; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${email}
          </div>
          <div style="display:flex; justify-content:space-between; font-size:11.5px; color:#666;">
            <span>💬 ${msgCount} msgs</span>
            <span>${dateStr.split(',')[0]}</span>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Error loading demo sessions:', err);
  }
}

async function viewDemoSession(sessionId, email) {
  document.querySelectorAll('.session-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById('dbot-session-' + sessionId);
  if (activeItem) activeItem.classList.add('active');
  
  document.getElementById('dbot-chat-title').textContent = email;
  document.getElementById('dbot-chat-subtitle').textContent = 'Session ID: ' + sessionId;
  
  const log = document.getElementById('dbot-chat-log');
  log.innerHTML = `<div style="margin:auto; text-align:center; color:#888; font-size:13px;">Loading conversation...</div>`;
  
  try {
    const res = await fetchAuth('/api/session/' + sessionId);
    const history = await res.json();
    
    if (history.length === 0) {
      log.innerHTML = `<div style="margin:auto; text-align:center; color:#888; font-size:13px;">No messages in this session.</div>`;
      return;
    }
    
    log.innerHTML = history.map(msg => {
      const isBot = msg.role === 'bot' || msg.role === 'assistant';
      const bubbleClass = isBot ? 'bot' : 'user';
      let bodyText = msg.content || '';
      if (msg.file_data) {
        bodyText += `<div style="margin-top:8px; font-weight:600;">📁 Sent file: <a href="${msg.file_data}" download="${msg.file_name || 'file'}" style="color: inherit; text-decoration:underline;">${msg.file_name || 'Download File'}</a></div>`;
      }
      return `<div class="chat-bubble ${bubbleClass}">${bodyText}</div>`;
    }).join('');
    
    log.scrollTop = log.scrollHeight;
  } catch (err) {
    log.innerHTML = `<div style="margin:auto; text-align:center; color:#ef4444; font-size:13px;">Failed to load messages.</div>`;
  }
}

function jumpToDemoChat(sessionId, email) {
  switchMainTab('chatbot');
  switchSubTab('chats');
  loadDemoSessions().then(() => {
    viewDemoSession(sessionId, email);
  });
}
