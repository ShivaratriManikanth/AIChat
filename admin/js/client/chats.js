let searchDebounceTimeout = null;

function handleChatSearch() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(() => {
    const q = document.getElementById('chat-search-input').value.trim();
    loadSessions(q);
  }, 300);
}

// ---- Load Sessions/Chats --------------------------------
async function loadSessions(search = '') {
  try {
    let url = selectedBotId
      ? `${API}/api/sessions?botId=${encodeURIComponent(selectedBotId)}`
      : `${API}/api/sessions`;
    if (search) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}search=${encodeURIComponent(search)}`;
    }
    const res = await fetchAuth(url);
    allSessions = await res.json();
    renderSessions(allSessions);
    if (!search) {
      document.getElementById('nav-chat-count').textContent = allSessions.length;
    }
  } catch (e) { console.error(e); }
}

function renderSessions(sessions) {
  const tbody = document.getElementById('chats-table-body');
  if (!tbody) return;
  if (sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💬</div>No chats yet</div></td></tr>';
    return;
  }
  tbody.innerHTML = sessions.map(s => `
    <tr>
      <td class="email-cell">${s.email || 'Anonymous'}</td>
      <td><span class="badge-count">${s.message_count}</span></td>
      <td style="font-size:12px;color:#888;">${formatDate(s.updated_at)}</td>
      <td><button class="btn-view" onclick="viewSession('${s.session_id}', '${s.email || 'Anonymous'}')">View</button></td>
    </tr>
  `).join('');
}

async function viewSession(sessionId, email) {
  const res = await fetchAuth(`${API}/api/session/${sessionId}`);
  const messages = await res.json();

  document.getElementById('chat-modal-overlay').style.display = 'flex';
  document.getElementById('viewer-info').textContent = `— ${email}`;

  const viewer = document.getElementById('chat-viewer');
  if (!viewer) return;
  if (messages.length === 0) {
    viewer.innerHTML = '<div class="empty-state">No messages in this session</div>';
  } else {
    viewer.innerHTML = messages.map(m => {
      let fileHTML = '';
      let contentText = m.content || '';
      if (m.file_data) {
        // Hide auto-generated placeholder text when file is present
        if (contentText.startsWith('📎') || contentText.startsWith('[File:')) contentText = '';
        if (m.file_type && m.file_type.startsWith('image/')) {
          fileHTML = `<div style="margin-top:${contentText ? '6px' : '0'};"><img src="${m.file_data}" style="max-width:240px;max-height:180px;border-radius:8px;display:block;cursor:pointer;" onclick="window.open('${m.file_data}','_blank')"></div>`;
        } else {
          fileHTML = `<a href="${m.file_data}" download="${m.file_name || 'file'}" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;font-size:12px;background:rgba(255,255,255,0.12);padding:8px 12px;border-radius:8px;margin-top:${contentText ? '6px' : '0'};"><span style="font-size:18px;">📄</span><span style="text-decoration:underline;">${m.file_name || 'Download file'}</span></a>`;
        }
      }
      return `<div class="viewer-msg ${m.role}">${contentText}${fileHTML}</div>`;
    }).join('');
  }
  viewer.scrollTop = viewer.scrollHeight;
}
