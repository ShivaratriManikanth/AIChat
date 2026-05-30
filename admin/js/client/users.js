// ---- Load Users -----------------------------------------
async function loadUsers() {
  try {
    // Build URL: prefer global domain filter (botId), fallback to domain name filter
    const localDomainFilter = document.getElementById('user-domain-filter').value;
    let url;
    if (selectedBotId) {
      // Derive the domain from the selected bot for the users query
      const bot = allBots.find(b => b.bot_id === selectedBotId);
      if (bot && bot.domain) {
        url = `${API}/api/users?domain=${encodeURIComponent(bot.domain)}`;
      } else {
        url = `${API}/api/users`;
      }
    } else if (localDomainFilter) {
      url = `${API}/api/users?domain=${encodeURIComponent(localDomainFilter)}`;
    } else {
      url = `${API}/api/users`;
    }
    const res = await fetchAuth(url);
    allUsers = await res.json();
    renderUsers(allUsers);
    document.getElementById('nav-user-count').textContent = allUsers.length;

    // Populate domain filter dropdown if empty
    const filter = document.getElementById('user-domain-filter');
    if (filter && filter.options.length === 1) {
      allBots.forEach(b => {
        if (b.domain) {
          const opt = document.createElement('option');
          opt.value = b.domain;
          opt.textContent = b.domain;
          filter.appendChild(opt);
        }
      });
    }
  } catch (e) { console.error(e); }
}

function renderUsers(users) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;
  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div>No users registered yet</div></td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    let fileHtml = '';
    if (u.file_name && u.file_data) {
      const isImg = u.file_type && u.file_type.startsWith('image/');
      fileHtml = `
        <div style="display:inline-flex; align-items:center; gap:6px; margin-left:12px; background:rgba(79, 70, 229, 0.08); padding:4px 8px; border-radius:6px; font-size:11.5px; border:1px solid rgba(79, 70, 229, 0.2); vertical-align:middle;">
          <span style="font-size:14px;">${isImg ? '🖼️' : '📄'}</span>
          <a href="${u.file_data}" download="${u.file_name}" style="color:#4f46e5; text-decoration:none; font-weight:600; text-overflow:ellipsis; max-width:140px; overflow:hidden; white-space:nowrap; display:inline-block;" title="${u.file_name}">
            ${u.file_name}
          </a>
        </div>
      `;
    }

    const viewFullChatHtml = `
      <a href="#" onclick="event.preventDefault(); viewUserChat('${u.session_id}', '${u.email}')" style="margin-left:12px; color:#4f46e5; font-size:12px; font-weight:600; text-decoration:underline; vertical-align:middle;">
        View Full Chat
      </a>
    `;

    return `
      <tr>
        <td class="email-cell">
          <div style="display:flex; align-items:center; flex-wrap:wrap; gap:4px; min-height:30px;">
            <span style="font-weight:600; color:#1e293b;">${u.email}</span>
            ${fileHtml}
            ${viewFullChatHtml}
          </div>
        </td>
        <td><span class="badge-count">${u.message_count}</span></td>
        <td style="font-size:12px;color:#888;">${formatDate(u.last_message || u.created_at)}</td>
        <td><button class="btn-view" onclick="viewUserChat('${u.session_id}', '${u.email}')">View Chat</button></td>
      </tr>
    `;
  }).join('');
}

// User search
document.getElementById('user-search').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  renderUsers(allUsers.filter(u => u.email.toLowerCase().includes(q)));
});

function viewUserChat(sessionId, email) {
  switchPage('chats');
  viewSession(sessionId, email);
}

// ---- Leads ----------------------------------------------
async function loadLeads() {
  try {
    const url = selectedBotId
      ? `${API}/api/leads?botId=${encodeURIComponent(selectedBotId)}`
      : `${API}/api/leads`;
    const res = await fetchAuth(url);
    const leads = await res.json();
    document.getElementById('nav-lead-count').textContent = leads.length;

    const tbody = document.getElementById('leads-table-body');
    if (!tbody) return;
    if (leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🎯</div>No leads captured yet</div></td></tr>';
      return;
    }
    tbody.innerHTML = leads.map(l => `
      <tr>
        <td style="font-weight:500;">${l.name || '-'}</td>
        <td class="email-cell">${l.email || '-'}</td>
        <td>${l.phone || '-'}</td>
        <td style="font-size:11px;color:#888;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${l.page_url || '-'}</td>
        <td style="font-size:12px;color:#888;">${formatDate(l.created_at)}</td>
      </tr>
    `).join('');
  } catch (e) { console.error(e); }
}

function downloadLeadsCSV() {
  const tokenVal = localStorage.getItem('token') || '';
  window.location.href = `${API}/api/leads/csv?token=${encodeURIComponent(tokenVal)}`;
  showToast('Downloading CSV...');
}
