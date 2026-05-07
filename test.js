
        const API = window.location.origin;
    const token = localStorage.getItem('saas_token');
    if (!token) {
      window.location.href = '/admin/login.html';
    }

    async function fetchAuth(url, options = {}) {
      if (!options.headers) options.headers = {};
      options.headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(url, options);
      if (res.status === 401) {
        localStorage.removeItem('saas_token');
        window.location.href = '/admin/login.html';
      }
      return res;
    }
    let config = {};
    let allUsers = [];
    let allSessions = [];

    // ---- Navigation -----------------------------------------
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        switchPage(page);
      });
    });

    function switchPage(page) {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
      document.getElementById('page-' + page).classList.add('active');

      const titles = {
        dashboard: 'Dashboard', users: 'User Management',
        chats: 'Chat Management', settings: 'Settings',
        faqs: 'FAQ Management', embed: 'Embed Code',
        leads: 'Lead Management', analytics: 'Advanced Analytics',
        bots: 'Bot Management (Multi-tenant)', knowledge: 'Knowledge Base',
        complaints: 'Customer Complaints'
      };
      document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

      if (page === 'leads') loadLeads();
      if (page === 'analytics') { loadAnalytics(); loadDropoff(); }
      if (page === 'bots') loadBots();
      if (page === 'complaints') loadComplaints();
    }

    // ---- Load Stats -----------------------------------------
    async function loadStats() {
      try {
        const res = await fetchAuth(`${API}/api/stats`);
        const stats = await res.json();
        document.getElementById('stat-users').textContent = stats.totalUsers;
        document.getElementById('stat-chats').textContent = stats.totalChats;
        document.getElementById('stat-sessions').textContent = stats.totalSessions;
        document.getElementById('stat-active').textContent = stats.activeSessions;
        document.getElementById('nav-user-count').textContent = stats.totalUsers;
        document.getElementById('nav-chat-count').textContent = stats.totalSessions;

        // Recent users table
        const tbody = document.getElementById('recent-users-body');
        if (stats.recentUsers && stats.recentUsers.length > 0) {
          tbody.innerHTML = stats.recentUsers.map(u => `
            <tr>
              <td class="email-cell">${u.email}</td>
              <td><span class="badge-count">${u.message_count}</span></td>
              <td style="font-size:12px;color:#888;">${formatDate(u.created_at)}</td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No users yet</td></tr>';
        }
      } catch (e) {
        console.error('Failed to load stats:', e);
      }
    }

    // ---- Load Users -----------------------------------------
    async function loadUsers() {
      try {
        const res = await fetchAuth(`${API}/api/users`);
        allUsers = await res.json();
        renderUsers(allUsers);
      } catch (e) { console.error(e); }
    }

    function renderUsers(users) {
      const tbody = document.getElementById('users-table-body');
      if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👥</div>No users registered yet</div></td></tr>';
        return;
      }
      tbody.innerHTML = users.map(u => `
        <tr>
          <td class="email-cell">${u.email}</td>
          <td class="session-cell">${u.session_id.substring(0, 20)}...</td>
          <td><span class="badge-count">${u.message_count}</span></td>
          <td style="font-size:12px;color:#888;">${formatDate(u.last_message || u.created_at)}</td>
          <td><button class="btn-view" onclick="viewUserChat('${u.session_id}', '${u.email}')">View Chat</button></td>
        </tr>
      `).join('');
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

    // ---- Load Sessions/Chats --------------------------------
    async function loadSessions() {
      try {
        const res = await fetchAuth(`${API}/api/sessions`);
        allSessions = await res.json();
        renderSessions(allSessions);
      } catch (e) { console.error(e); }
    }

    function renderSessions(sessions) {
      const tbody = document.getElementById('chats-table-body');
      if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💬</div>No chats yet</div></td></tr>';
        return;
      }
      tbody.innerHTML = sessions.map(s => `
        <tr>
          <td class="email-cell">${s.email || 'Anonymous'}</td>
          <td class="session-cell">${s.session_id.substring(0, 20)}...</td>
          <td><span class="badge-count">${s.message_count}</span></td>
          <td style="font-size:12px;color:#888;">${formatDate(s.updated_at)}</td>
          <td><button class="btn-view" onclick="viewSession('${s.session_id}', '${s.email || 'Anonymous'}')">View</button></td>
        </tr>
      `).join('');
    }

    async function viewSession(sessionId, email) {
      const res = await fetchAuth(`${API}/api/session/${sessionId}`);
      const messages = await res.json();

      document.getElementById('chat-viewer-card').style.display = 'block';
      document.getElementById('viewer-info').textContent = `${email} — ${sessionId.substring(0, 20)}...`;

      const viewer = document.getElementById('chat-viewer');
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

    // ---- Load Config ----------------------------------------
    async function loadConfig() {
      const res = await fetchAuth(`${API}/api/config/full`);
      config = await res.json();

      document.getElementById('cfg-botName').value = config.botName || '';
      document.getElementById('cfg-companyName').value = config.companyName || '';
      document.getElementById('cfg-welcomeMessage').value = config.welcomeMessage || '';
      document.getElementById('cfg-themeColor').value = config.themeColor || '#4F46E5';
      document.getElementById('cfg-aiModel').value = config.aiModel || 'gpt-3.5-turbo';
      document.getElementById('cfg-systemPrompt').value = config.systemPrompt || '';
      document.getElementById('cfg-placeholder').value = config.placeholder || '';
      document.getElementById('cfg-suggestedQuestions').value = (config.suggestedQuestions || []).join('\n');

      // Email & intro fields
      document.getElementById('cfg-emailCaptureTitle').value = config.emailCaptureTitle || '';
      document.getElementById('cfg-emailCaptureSubtitle').value = config.emailCaptureSubtitle || '';
      document.getElementById('cfg-introMessage').value = config.introMessage || '';
      document.getElementById('toggle-emailCapture').classList.toggle('on', !!config.emailCapture);

      // Lead capture
      const lc = config.leadCapture || {};
      document.getElementById('toggle-leadCapture').classList.toggle('on', !!lc.enabled);
      document.getElementById('cfg-leadTriggerAfter').value = lc.triggerAfter || 3;
      document.getElementById('cfg-leadTitle').value = lc.title || '';
      document.getElementById('cfg-leadSubtitle').value = lc.subtitle || '';

      // Handoff
      const ho = config.handoff || {};
      document.getElementById('toggle-handoff').classList.toggle('on', !!ho.enabled);
      document.getElementById('cfg-handoffWhatsapp').value = ho.whatsapp || '';
      document.getElementById('cfg-handoffPhone').value = ho.phone || '';
      document.getElementById('cfg-handoffEmail').value = ho.email || '';

      // Fallback & offline
      document.getElementById('cfg-fallbackMessage').value = config.fallbackMessage || '';
      document.getElementById('cfg-offlineMessage').value = config.offlineMessage || '';
      document.getElementById('cfg-rateLimit').value = config.rateLimitPerMinute || 20;

      // Logo preview
      const preview = document.getElementById('logo-preview');
      if (config.logo) {
        preview.innerHTML = `<img src="${config.logo}" style="width:100%;height:100%;object-fit:cover;">`;
      } else {
        preview.innerHTML = '🤖';
      }

      // Domain restriction
      document.getElementById('cfg-allowedDomains').value = (config.allowedDomains || []).join('\n');

      // API key
      document.getElementById('cfg-apiKey').value = config.apiKey || '';
      document.getElementById('toggle-enforceApiKey').classList.toggle('on', !!config.enforceApiKey);

      // Semantic search
      const semToggle = document.getElementById('toggle-semanticSearch');
      if (semToggle) semToggle.classList.toggle('on', config.semanticSearch !== false);

      // Email notifications
      const em = config.emailNotifications || {};
      document.getElementById('toggle-emailNotif').classList.toggle('on', !!em.enabled);
      document.getElementById('cfg-adminEmail').value = em.adminEmail || '';
      document.getElementById('cfg-smtpHost').value = em.smtpHost || '';
      document.getElementById('cfg-smtpPort').value = em.smtpPort || 587;
      document.getElementById('cfg-smtpUser').value = em.smtpUser || '';
      document.getElementById('cfg-smtpPass').value = em.smtpPass || '';

      renderFaqs();
    }

    function toggleEmailCapture() {
      const toggle = document.getElementById('toggle-emailCapture');
      toggle.classList.toggle('on');
    }

    // ---- Save Settings --------------------------------------
    async function saveSettings() {
      const updated = {
        botName: document.getElementById('cfg-botName').value,
        companyName: document.getElementById('cfg-companyName').value,
        welcomeMessage: document.getElementById('cfg-welcomeMessage').value,
        themeColor: document.getElementById('cfg-themeColor').value,
        aiModel: document.getElementById('cfg-aiModel').value,
        systemPrompt: document.getElementById('cfg-systemPrompt').value,
        placeholder: document.getElementById('cfg-placeholder').value,
        suggestedQuestions: document.getElementById('cfg-suggestedQuestions').value.split('\n').map(s => s.trim()).filter(Boolean),
        emailCapture: document.getElementById('toggle-emailCapture').classList.contains('on'),
        emailCaptureTitle: document.getElementById('cfg-emailCaptureTitle').value,
        emailCaptureSubtitle: document.getElementById('cfg-emailCaptureSubtitle').value,
        introMessage: document.getElementById('cfg-introMessage').value,
        leadCapture: {
          enabled: document.getElementById('toggle-leadCapture').classList.contains('on'),
          triggerAfter: parseInt(document.getElementById('cfg-leadTriggerAfter').value) || 3,
          title: document.getElementById('cfg-leadTitle').value,
          subtitle: document.getElementById('cfg-leadSubtitle').value,
          fields: ['name', 'phone']
        },
        handoff: {
          enabled: document.getElementById('toggle-handoff').classList.contains('on'),
          buttonText: 'Talk to Agent',
          whatsapp: document.getElementById('cfg-handoffWhatsapp').value,
          phone: document.getElementById('cfg-handoffPhone').value,
          email: document.getElementById('cfg-handoffEmail').value
        },
        fallbackMessage: document.getElementById('cfg-fallbackMessage').value,
        offlineMessage: document.getElementById('cfg-offlineMessage').value,
        rateLimitPerMinute: parseInt(document.getElementById('cfg-rateLimit').value) || 20,
        allowedDomains: document.getElementById('cfg-allowedDomains').value.split('\n').map(s => s.trim()).filter(Boolean),
        enforceApiKey: document.getElementById('toggle-enforceApiKey').classList.contains('on'),
        emailNotifications: {
          enabled: document.getElementById('toggle-emailNotif').classList.contains('on'),
          adminEmail: document.getElementById('cfg-adminEmail').value,
          smtpHost: document.getElementById('cfg-smtpHost').value,
          smtpPort: parseInt(document.getElementById('cfg-smtpPort').value) || 587,
          smtpUser: document.getElementById('cfg-smtpUser').value,
          smtpPass: document.getElementById('cfg-smtpPass').value
        }
      };

      const res = await fetchAuth(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });

      if (res.ok) {
        showToast('Settings saved successfully!');
        loadConfig();
      }
    }

    // ---- FAQ Management -------------------------------------
    function renderFaqs() {
      const list = document.getElementById('faq-list');
      if (!config.faqs || config.faqs.length === 0) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">❓</div>No FAQs added yet</div>';
        return;
      }
      list.innerHTML = config.faqs.map((f, i) => `
        <div class="faq-item">
          <div style="flex:1">
            <div class="faq-q">Q: ${f.question}</div>
            <div class="faq-a">A: ${f.answer}</div>
          </div>
          <button class="btn btn-danger" style="padding:6px 14px;font-size:12px;" onclick="deleteFaq(${i})">Delete</button>
        </div>
      `).join('');
    }

    async function addFaq() {
      const q = document.getElementById('newFaqQ').value.trim();
      const a = document.getElementById('newFaqA').value.trim();
      if (!q || !a) return alert('Both question and answer are required');

      config.faqs = config.faqs || [];
      config.faqs.push({ question: q, answer: a });

      await fetchAuth(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs: config.faqs })
      });

      document.getElementById('newFaqQ').value = '';
      document.getElementById('newFaqA').value = '';
      showToast('FAQ added!');
      loadConfig();
    }

    async function deleteFaq(index) {
      config.faqs.splice(index, 1);
      await fetchAuth(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs: config.faqs })
      });
      showToast('FAQ deleted');
      loadConfig();
    }

    // ---- Embed Code -----------------------------------------
    function setupEmbedUrls() {
      const url = API;
      document.getElementById('embed-url-1').textContent = url;
      document.getElementById('embed-url-2').textContent = url;
      document.querySelectorAll('.embed-url').forEach(el => el.textContent = url);
    }

    function copyEmbed() {
      const code = `<script src="${API}/widget/chatbot.js" data-server="${API}"><\/script>`;
      navigator.clipboard.writeText(code);
      showToast('Embed code copied!');
    }

    function copyCode(btn) {
      const block = btn.parentElement;
      const text = block.textContent.replace('Copy', '').trim();
      navigator.clipboard.writeText(text);
      showToast('Code copied!');
    }

    // ---- Utilities ------------------------------------------
    function formatDate(dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function showToast(msg) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `✅ ${msg}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    function refreshAll() {
      loadStats();
      loadUsers();
      loadSessions();
      loadConfig();
      showToast('Data refreshed!');
    }

    // ---- Leads ----------------------------------------------
    async function loadLeads() {
      try {
        const res = await fetchAuth(`${API}/api/leads`);
        const leads = await res.json();
        document.getElementById('nav-lead-count').textContent = leads.length;

        const tbody = document.getElementById('leads-table-body');
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
      window.location.href = `${API}/api/leads/csv`;
      showToast('Downloading CSV...');
    }

    // ---- Analytics ------------------------------------------
    async function loadAnalytics() {
      try {
        const res = await fetchAuth(`${API}/api/analytics`);
        const data = await res.json();
        document.getElementById('stat-avg-response').innerHTML = `${data.avgResponseMs}<span style="font-size:14px;opacity:0.6;">ms</span>`;
        document.getElementById('stat-leads').textContent = data.totalLeads || 0;
        document.getElementById('stat-conversion').innerHTML = `${data.conversionRate || 0}<span style="font-size:14px;opacity:0.6;">%</span>`;

        const faqHit = (data.sourceBreakdown || []).find(s => s.source === 'faq');
        document.getElementById('stat-faq-hits').textContent = faqHit ? faqHit.count : 0;

        // Source breakdown bars
        const total = (data.sourceBreakdown || []).reduce((a, s) => a + s.count, 0);
        const content = (data.sourceBreakdown || []).map(s => {
          const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : 0;
          const colors = { faq: '#10B981', ai: '#4F46E5', fallback: '#F59E0B', error: '#EF4444' };
          const labels = { faq: '📚 FAQ Match', ai: '🤖 AI Response', fallback: '💬 Keyword Fallback', error: '⚠️ Error' };
          return `
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span style="font-weight:500;">${labels[s.source] || s.source}</span>
                <span style="color:#888;">${s.count} (${pct}%)</span>
              </div>
              <div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${colors[s.source] || '#888'};transition:width 0.5s;"></div>
              </div>
            </div>
          `;
        }).join('');
        document.getElementById('source-breakdown-content').innerHTML = content || '<div class="empty-state">No data yet</div>';
      } catch (e) { console.error(e); }
    }

    // ---- Logo Upload ----------------------------------------
    document.getElementById('logo-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { alert('Logo too large. Max 2 MB.'); return; }
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result;
        const res = await fetchAuth(`${API}/api/logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logo: dataUrl })
        });
        if (res.ok) {
          document.getElementById('logo-preview').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
          showToast('Logo uploaded!');
          loadConfig();
        }
      };
      reader.readAsDataURL(file);
    });

    async function removeLogo() {
      await fetchAuth(`${API}/api/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: '' })
      });
      document.getElementById('logo-preview').innerHTML = '🤖';
      showToast('Logo removed');
    }

    // ---- PDF Upload -----------------------------------------
    document.getElementById('pdf-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { alert('PDF too large. Max 10 MB.'); return; }

      const status = document.getElementById('pdf-status');
      status.textContent = '⏳ Parsing PDF...';

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetchAuth(`${API}/api/knowledge/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileData: reader.result })
          });
          const data = await res.json();
          if (res.ok) {
            status.innerHTML = `✅ Added ${data.added} knowledge chunks (${data.totalChars} characters) to FAQs.`;
            status.style.color = '#10B981';
            showToast('PDF added to knowledge base!');
            loadConfig();
          } else {
            status.textContent = '❌ ' + (data.error || 'Failed');
            status.style.color = '#EF4444';
          }
        } catch (err) {
          status.textContent = '❌ Upload failed: ' + err.message;
          status.style.color = '#EF4444';
        }
      };
      reader.readAsDataURL(file);
    });

    // ---- Test Email -----------------------------------------
    async function testEmail() {
      // Save current settings first so the server uses the fresh SMTP values
      await saveSettings();
      const res = await fetchAuth(`${API}/api/test-email`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('Test email sent! Check inbox.');
      } else {
        alert('Email failed: ' + (data.error || 'Unknown error'));
      }
    }

    // ---- URL Scraping ---------------------------------------
    async function scrapeUrlToKnowledge() {
      const url = document.getElementById('knowledge-url').value.trim();
      if (!url) { alert('Enter a URL'); return; }
      const status = document.getElementById('url-scrape-status');
      status.textContent = '⏳ Scraping website...';
      status.style.color = '#666';
      try {
        const res = await fetchAuth(`${API}/api/knowledge/url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (res.ok) {
          status.innerHTML = `✅ Added ${data.added} knowledge chunks (${data.totalChars} chars) from ${data.url}`;
          status.style.color = '#10B981';
          document.getElementById('knowledge-url').value = '';
          showToast('Knowledge added!');
          loadConfig();
        } else {
          status.textContent = '❌ ' + (data.error || 'Failed');
          status.style.color = '#EF4444';
        }
      } catch (err) {
        status.textContent = '❌ ' + err.message;
        status.style.color = '#EF4444';
      }
    }

    // ---- PDF upload in Knowledge tab ------------------------
    document.getElementById('pdf-input-kb').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { alert('PDF too large (max 10 MB)'); return; }
      const status = document.getElementById('pdf-status-kb');
      status.textContent = '⏳ Parsing...';
      status.style.color = '#666';
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetchAuth(`${API}/api/knowledge/pdf`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileData: reader.result })
          });
          const data = await res.json();
          if (res.ok) {
            status.innerHTML = `✅ Added ${data.added} chunks from ${file.name}`;
            status.style.color = '#10B981';
            showToast('PDF added!');
            loadConfig();
          } else {
            status.textContent = '❌ ' + (data.error || 'Failed');
            status.style.color = '#EF4444';
          }
        } catch (err) {
          status.textContent = '❌ ' + err.message;
          status.style.color = '#EF4444';
        }
      };
      reader.readAsDataURL(file);
    });

    // ---- Semantic toggle save -------------------------------
    async function saveSemanticToggle() {
      const enabled = document.getElementById('toggle-semanticSearch').classList.contains('on');
      await fetchAuth(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semanticSearch: enabled })
      });
      showToast('Semantic search ' + (enabled ? 'enabled' : 'disabled'));
    }

    // ---- Bots (Multi-tenant) --------------------------------
    async function loadBots() {
      const res = await fetchAuth(`${API}/api/bots`);
      const bots = await res.json();
      const tbody = document.getElementById('bots-table-body');
      if (bots.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🤖</div>No bots registered yet</div></td></tr>';
        return;
      }
      tbody.innerHTML = bots.map(b => `
        <tr>
          <td style="font-weight:600;">${b.name}</td>
          <td class="session-cell">${b.bot_id}</td>
          <td class="session-cell" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;">${b.api_key.substring(0, 30)}...</td>
          <td style="font-size:12px;color:#888;">${formatDate(b.created_at)}</td>
          <td>
            <button class="btn-view" onclick="showBotEmbed('${b.bot_id}', '${b.api_key}')">Embed</button>
            <button class="btn btn-danger" style="padding:6px 12px;font-size:11px;margin-left:4px;" onclick="deleteBot('${b.bot_id}')">Delete</button>
          </td>
        </tr>
      `).join('');
    }

    async function createBot() {
      const name = document.getElementById('new-bot-name').value.trim();
      if (!name) { alert('Enter a bot name'); return; }
      try {
        const res = await fetchAuth(`${API}/api/bots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (res.ok) {
          document.getElementById('new-bot-name').value = '';
          showToast('Bot created!');
          loadBots();
        } else {
          const data = await res.json();
          alert('Failed to create bot: ' + (data.error || res.statusText));
        }
      } catch (err) {
        alert('Network error: ' + err.message);
      }
    }

    async function deleteBot(botId) {
      if (!confirm('Delete this bot?')) return;
      await fetchAuth(`${API}/api/bots/${botId}`, { method: 'DELETE' });
      showToast('Bot deleted');
      loadBots();
    }

    function showBotEmbed(botId, apiKey) {
      const code = `<script src="${API}/widget/chatbot.js" data-server="${API}" data-bot-id="${botId}" data-api-key="${apiKey}"><\/script>`;
      navigator.clipboard.writeText(code);
      alert('Embed code copied to clipboard!\n\n' + code);
    }

    // ---- API Key Management ---------------------------------
    function copyApiKey() {
      const key = document.getElementById('cfg-apiKey').value;
      navigator.clipboard.writeText(key);
      showToast('API key copied!');
    }

    async function regenerateApiKey() {
      if (!confirm('Regenerate API key? Old key will stop working.')) return;
      const res = await fetchAuth(`${API}/api/apikey/regenerate`, { method: 'POST' });
      const data = await res.json();
      document.getElementById('cfg-apiKey').value = data.apiKey;
      showToast('New API key generated!');
    }

    // ---- Drop-off Analytics ---------------------------------
    async function loadDropoff() {
      try {
        const res = await fetchAuth(`${API}/api/dropoff`);
        const data = await res.json();
        document.getElementById('stat-abandoned').textContent = data.abandonedCount || 0;
        document.getElementById('stat-abandon-rate').textContent = (data.abandonRate || 0) + '%';

        // Buckets
        const total = (data.buckets || []).reduce((a, b) => a + b.count, 0);
        const bucketsHTML = (data.buckets || []).map(b => {
          const pct = total > 0 ? ((b.count / total) * 100).toFixed(1) : 0;
          return `
            <div style="margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span>${b.bucket}</span>
                <span style="color:#888;">${b.count} (${pct}%)</span>
              </div>
              <div style="height:8px;background:#f0f0f0;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:#4F46E5;"></div>
              </div>
            </div>
          `;
        }).join('');
        document.getElementById('dropoff-buckets').innerHTML = bucketsHTML || '<div class="empty-state" style="padding:16px;">No data yet</div>';

        // Versions
        const versHTML = (data.versions || []).map(v => `
          <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#f7f8fc;border-radius:8px;margin-bottom:6px;font-size:13px;">
            <span><b>v${v.version}</b></span>
            <span style="color:#888;">${v.count} sessions</span>
          </div>
        `).join('');
        document.getElementById('version-distribution').innerHTML = versHTML || '<div class="empty-state" style="padding:16px;">No version data</div>';
      } catch (e) { console.error(e); }
    }

    // ---- Complaints -----------------------------------------
    let allComplaints = [];
    async function loadComplaints() {
      try {
        const res = await fetchAuth(`${API}/api/complaints`);
        allComplaints = await res.json();
        document.getElementById('nav-complaint-count').textContent = allComplaints.length;
        renderComplaints(allComplaints);
      } catch (e) { console.error(e); }
    }

    function filterComplaints() {
      const val = document.getElementById('complaint-filter').value;
      renderComplaints(val ? allComplaints.filter(c => c.status === val) : allComplaints);
    }

    function renderComplaints(list) {
      const tbody = document.getElementById('complaints-table-body');
      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">⚠️</div>No complaints yet</div></td></tr>';
        return;
      }
      const statusColors = {
        open:        { bg: '#FEE2E2', text: '#991B1B' },
        in_progress: { bg: '#FEF3C7', text: '#92400E' },
        resolved:    { bg: '#D1FAE5', text: '#065F46' }
      };
      tbody.innerHTML = list.map(c => {
        const sc = statusColors[c.status] || statusColors.open;
        return `
          <tr>
            <td style="font-weight:500;">${c.name || '-'}</td>
            <td>${c.phone || '-'}</td>
            <td class="email-cell">${c.email || '-'}</td>
            <td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:#666;" title="${(c.message||'').replace(/"/g,'&quot;')}">${c.message}</td>
            <td><span style="background:${sc.bg};color:${sc.text};padding:4px 10px;border-radius:10px;font-size:11px;font-weight:600;text-transform:capitalize;">${c.status.replace('_', ' ')}</span></td>
            <td style="font-size:12px;color:#888;">${formatDate(c.created_at)}</td>
            <td>
              <select onchange="updateComplaintStatus(${c.id}, this.value)" style="padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;">
                <option value="open"        ${c.status === 'open' ? 'selected' : ''}>Open</option>
                <option value="in_progress" ${c.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="resolved"    ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              </select>
            </td>
          </tr>
        `;
      }).join('');
    }

    async function updateComplaintStatus(id, status) {
      await fetchAuth(`${API}/api/complaint/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      showToast('Status updated');
      loadComplaints();
    }

    // ---- Init -----------------------------------------------
    loadStats();
    loadUsers();
    loadSessions();
    loadLeads();
    loadComplaints();
    loadConfig();
    setupEmbedUrls();
  
