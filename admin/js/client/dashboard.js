// ---- Load Stats -----------------------------------------
async function loadStats() {
  try {
    const url = selectedBotId
      ? `${API}/api/stats?botId=${encodeURIComponent(selectedBotId)}`
      : `${API}/api/stats`;
    const res = await fetchAuth(url);
    const data = await res.json();
    document.getElementById('stat-users').textContent = data.totalUsers || 0;
    document.getElementById('stat-chats').textContent = data.totalChats || 0;
    document.getElementById('stat-sessions').textContent = data.totalSessions || 0;
    document.getElementById('stat-active').textContent = data.activeSessions || 0;
    document.getElementById('stat-plan-name').textContent = data.planName || 'Free';
    document.getElementById('stat-plan-days').textContent = `${data.daysRemaining || 0} days remaining`;
    // Update nav badge
    document.getElementById('nav-user-count').textContent = data.totalUsers || 0;
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

function refreshAll() {
  loadStats();
  loadUsers();
  loadSessions();
  loadLeads();
  loadConfig();
  const domainLabel = selectedBotId
    ? (allBots.find(b => b.bot_id === selectedBotId)?.domain || 'selected domain')
    : 'all domains';
  showToast(`🔄 Refreshed data for ${domainLabel}`);
}

// ---- Email Broadcast -----------------------------------
let broadcastAudience = 'all';

function selectAudience(type) {
  broadcastAudience = type;
  ['all', 'users', 'leads'].forEach(t => {
    const el = document.getElementById('aud-' + t);
    if (el) {
      if (t === type) {
        el.style.borderColor = '#4f46e5';
        el.style.background = '#f5f3ff';
        el.querySelector('div:nth-child(2)').style.color = '#4f46e5';
      } else {
        el.style.borderColor = '#e2e8f0';
        el.style.background = 'white';
        el.querySelector('div:nth-child(2)').style.color = '#0f172a';
      }
    }
  });
}

function updateBroadcastPreview() {
  const subject = document.getElementById('bc-subject').value || 'Your email subject...';
  const body = document.getElementById('bc-body').value || 'Your message will appear here...';
  document.getElementById('preview-subject').textContent = subject;
  document.getElementById('preview-body').textContent = body;
}

async function initBroadcastPage() {
  // Load company name for preview
  try {
    const res = await fetchAuth(`${API}/api/config/full`);
    const cfg = await res.json();
    const company = cfg.companyName || cfg.botName || 'Your Company';
    document.getElementById('preview-company').textContent = company;
    // Check email config
    const emailCfg = cfg.emailNotifications || {};
    const statusEl = document.getElementById('broadcast-smtp-status');
    if (statusEl) {
      if (emailCfg.fromEmail) {
        statusEl.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:#10b981;"></div><span style="font-size:13px;font-weight:600;color:#10b981;">Email Ready (' + emailCfg.fromEmail + ')</span>';
      } else {
        statusEl.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div><span style="font-size:13px;font-weight:600;color:#f59e0b;">Set your email in Settings</span>';
      }
    }
  } catch (e) { console.error(e); }
}

async function sendBroadcast() {
  const subject = document.getElementById('bc-subject').value.trim();
  const body = document.getElementById('bc-body').value.trim();
  const resultEl = document.getElementById('bc-result');
  const btn = document.getElementById('bc-send-btn');

  if (!subject || !body) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:14px 18px;border-radius:10px;font-size:13.5px;font-weight:600;">⚠️ Please fill in both the subject and message.</div>';
    return;
  }

  if (!confirm(`Send this email to all ${broadcastAudience === 'all' ? 'users & leads' : broadcastAudience}? This cannot be undone.`)) return;

  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  resultEl.style.display = 'none';

  try {
    const res = await fetchAuth(`${API}/api/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body, audience: broadcastAudience })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
          <div style="font-size:15px;font-weight:700;color:#16a34a;margin-bottom:8px;">✅ Broadcast Sent Successfully!</div>
          <div style="display:flex;gap:20px;">
            <div style="text-align:center;">
              <div style="font-size:24px;font-weight:800;color:#16a34a;">${data.sent}</div>
              <div style="font-size:12px;color:#64748b;">Emails Sent</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:24px;font-weight:800;color:#ef4444;">${data.failed}</div>
              <div style="font-size:12px;color:#64748b;">Failed</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:24px;font-weight:800;color:#6366f1;">${data.total}</div>
              <div style="font-size:12px;color:#64748b;">Total</div>
            </div>
          </div>
        </div>`;
      document.getElementById('bc-subject').value = '';
      document.getElementById('bc-body').value = '';
      updateBroadcastPreview();
    } else {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:14px 18px;border-radius:10px;font-size:13.5px;font-weight:600;">❌ ${data.error || 'Failed to send broadcast.'}</div>`;
    }
  } catch (e) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `<div style="background:#fef2f2;border:1px solid #fecaca;color:#ef4444;padding:14px 18px;border-radius:10px;font-size:13.5px;">❌ Network error: ${e.message}</div>`;
  }

  btn.disabled = false;
  btn.textContent = '📣 Send Broadcast';
}

// ---- Analytics ------------------------------------------
async function loadAnalytics() {
  try {
    const url = selectedBotId ? `${API}/api/analytics?botId=${encodeURIComponent(selectedBotId)}` : `${API}/api/analytics`;
    const res = await fetchAuth(url);
    const data = await res.json();
    document.getElementById('stat-avg-response').innerHTML = `${data.avgResponseMs}<span style="font-size:14px;opacity:0.8;margin-left:2px;">ms</span>`;
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
      const bgColors = { faq: '#D1FAE5', ai: '#E0E7FF', fallback: '#FEF3C7', error: '#FEE2E2' };
      return `
        <div style="margin-bottom:20px; background: #fafbfc; padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:${colors[s.source] || '#888'}; box-shadow: 0 0 8px ${colors[s.source] || '#888'}88;"></div>
              <span style="font-weight:600;color:#1E293B;font-size:14px;">${labels[s.source] || s.source}</span>
            </div>
            <div style="text-align:right;">
              <span style="font-weight:700;font-size:16px;color:#0F172A;">${pct}%</span>
              <span style="color:#64748b;font-size:12px;margin-left:6px;">(${s.count} queries)</span>
            </div>
          </div>
          <div style="height:8px;background:${bgColors[s.source] || '#f0f0f0'};border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${colors[s.source] || '#888'};transition:width 1s cubic-bezier(0.4, 0, 0.2, 1); border-radius:4px;"></div>
          </div>
        </div>
      `;
    }).join('');
    document.getElementById('source-breakdown-content').innerHTML = content || '<div class="empty-state">No analytical data available yet.</div>';
  } catch (e) { console.error(e); }
}
