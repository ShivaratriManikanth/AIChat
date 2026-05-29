// ---- Bots (Multi-tenant) --------------------------------
// ---- Embed Page Logic ---------------------------------
let allBotsForEmbed = [];

async function initEmbedPage() {
  if (!checkBotSelection('page-embed')) return;

  try {
    const res = await fetchAuth(`${API}/api/bots`);
    const bots = await res.json();

    const emptyState = document.getElementById('embed-empty-state');
    const scriptsContainer = document.getElementById('embed-scripts-container');
    if (bots.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      if (scriptsContainer) scriptsContainer.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (scriptsContainer) scriptsContainer.style.display = 'block';
      updateEmbedScripts();
    }
  } catch (e) {
    console.error('Error initializing embed page:', e);
  }
}

function updateEmbedScripts() {
  if (!selectedBotId) return;
  const bot = allBots.find(b => b.bot_id === selectedBotId);
  if (!bot) return;

  const serverUrl = API;
  const apiKey = bot.api_key;
  const botId = bot.bot_id;

  // Universal Script
  const universal = `<script\n  src="${serverUrl}/widget/chatbot.js"\n  data-server="${serverUrl}"\n  data-bot-id="${botId}"\n  data-api-key="${apiKey}"\n><\/script>`;
  const uScript = document.getElementById('script-universal');
  if (uScript) uScript.textContent = universal;

  // WordPress
  const wordpress = `function add_chatbot_widget() {\n    echo '<script src="${serverUrl}/widget/chatbot.js" data-server="${serverUrl}" data-bot-id="${botId}" data-api-key="${apiKey}"><\/script>';\n}\nadd_action('wp_footer', 'add_chatbot_widget');`;
  const wpScript = document.getElementById('script-wordpress');
  if (wpScript) wpScript.textContent = wordpress;

  // Laravel
  const laravel = `{{-- Add before </body> in your layout file --}}\n<script\n  src="${serverUrl}/widget/chatbot.js"\n  data-server="${serverUrl}"\n  data-bot-id="${botId}"\n  data-api-key="${apiKey}"\n><\/script>`;
  const lvScript = document.getElementById('script-laravel');
  if (lvScript) lvScript.textContent = laravel;
}

function copyPreText(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Code copied to clipboard!');
  });
}

async function loadBots() {
  const res = await fetchAuth(`${API}/api/bots`);
  const bots = await res.json();
  const tbody = document.getElementById('bots-table-body');
  if (!tbody) return;
  if (bots.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">🤖</div>No bots registered yet</div></td></tr>';
    return;
  }
  tbody.innerHTML = bots.map(b => `
    <tr>
      <td style="font-weight:600;">${b.name}</td>
      <td style="color:#6366F1;font-weight:500;">${b.domain || '-'}</td>
      <td class="session-cell">${b.bot_id}</td>
      <td style="font-size:12px;color:#888;">${formatDate(b.created_at)}</td>
      <td>
        <button class="btn-view" onclick="showBotEmbed('${b.bot_id}', '${b.api_key}')">Script</button>
        <button class="btn btn-danger" style="padding:6px 12px;font-size:11px;margin-left:4px;" onclick="deleteBot('${b.bot_id}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

async function createBot() {
  const name = document.getElementById('new-bot-name').value.trim();
  const domain = document.getElementById('new-bot-domain').value.trim();

  if (!name) { alert('Enter a bot name'); return; }
  if (!domain) { alert('Enter a domain name'); return; }

  try {
    const res = await fetchAuth(`${API}/api/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, domain })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('new-bot-name').value = '';
      document.getElementById('new-bot-domain').value = '';
      showToast('Bot created!');
      await populateDomainDropdown();
      loadBots();

      // Show embed script
      const scriptText = `<script\n  src="${API}/widget/chatbot.js"\n  data-server="${API}"\n  data-bot-id="${data.bot_id}"\n  data-api-key="${data.api_key}"\n><\/script>`;
      const container = document.getElementById('new-bot-script-container');
      const textVal = document.getElementById('new-bot-script-text');
      if (textVal) textVal.value = scriptText;
      if (container) container.style.display = 'block';
    } else {
      alert('Failed to create bot: ' + (data.error || res.statusText));
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

function copyNewBotScript() {
  const text = document.getElementById('new-bot-script-text');
  if (!text) return;
  text.select();
  document.execCommand('copy');
  showToast('Script copied to clipboard!');
}

async function deleteBot(botId) {
  if (!confirm('Delete this bot?')) return;
  await fetchAuth(`${API}/api/bots/${botId}`, { method: 'DELETE' });
  showToast('Bot deleted');
  if (selectedBotId === botId) {
    selectedBotId = '';
    localStorage.removeItem('dashboard_domain_filter');
    const sel = document.getElementById('global-domain-selector');
    if (sel) sel.value = '';
  }
  await populateDomainDropdown();
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
  const url = selectedBotId
    ? `${API}/api/apikey/regenerate?botId=${encodeURIComponent(selectedBotId)}`
    : `${API}/api/apikey/regenerate`;
  const res = await fetchAuth(url, { method: 'POST' });
  const data = await res.json();
  document.getElementById('cfg-apiKey').value = data.apiKey;
  showToast('New API key generated!');
}

// ---- Global Domain Selector helpers ---------------------
async function populateDomainDropdown() {
  try {
    const res = await fetchAuth(`${API}/api/bots`);
    allBots = await res.json();
    const sel = document.getElementById('global-domain-selector');
    if (!sel) return;
    sel.innerHTML = '<option value="">🌐 All Domains</option>';
    allBots.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.bot_id;
      opt.textContent = (b.domain || b.name) + (b.domain ? '' : ' (no domain)');
      sel.appendChild(opt);
    });
    // Restore last selection from localStorage
    const saved = localStorage.getItem('dashboard_domain_filter') || '';
    if (saved && allBots.some(b => b.bot_id === saved)) {
      sel.value = saved;
      selectedBotId = saved;
    }
    // Update bot count badge
    const botCountBadge = document.getElementById('dbb-bot-count');
    if (botCountBadge) botCountBadge.textContent = allBots.length;
    updateDomainBanner();
  } catch (e) { console.error('populateDomainDropdown error', e); }
}

function onDomainChange() {
  const sel = document.getElementById('global-domain-selector');
  if (!sel) return;
  selectedBotId = sel.value;
  localStorage.setItem('dashboard_domain_filter', selectedBotId);

  // Keep working bot ID in sync for setup pages
  if (selectedBotId) {
    currentWorkingBotId = selectedBotId;
    localStorage.setItem('current_working_bot_id', currentWorkingBotId);
  }

  updateDomainBanner();

  // Reload data for all sections
  loadStats();
  loadUsers();
  loadSessions();
  loadLeads();

  // If on a setup page, refresh its validation and reload data
  const activePanel = document.querySelector('.panel.active')?.id;
  if (['page-knowledge', 'page-settings', 'page-flows', 'page-embed'].includes(activePanel)) {
    if (checkBotSelection(activePanel)) {
      if (activePanel === 'page-flows') loadFlow();
      else if (activePanel === 'page-embed') initEmbedPage();
      else loadConfig();
    }
  }

  showToast(selectedBotId
    ? '🌐 Filtered to: ' + sel.options[sel.selectedIndex].text
    : '🌐 Showing all domains');
}

function checkBotSelection(pageId) {
  const panel = document.getElementById(pageId);
  if (!panel) return false;
  const overlayId = pageId + '-no-bot-overlay';
  let overlay = document.getElementById(overlayId);

  // Auto-select the first bot if available and none selected
  if (!selectedBotId && allBots.length > 0) {
    selectedBotId = allBots[0].bot_id;
    const sel = document.getElementById('global-domain-selector');
    if (sel) {
      sel.value = selectedBotId;
      localStorage.setItem('dashboard_domain_filter', selectedBotId);
    }
    updateDomainBanner();
    loadStats();
    loadUsers();
    loadSessions();
    loadLeads();
  }

  if (!selectedBotId) {
    const isEmpty = allBots.length === 0;
    const msg = isEmpty
      ? "You haven't created any bots yet. Please go to 'Bot Management' to create your first chatbot for your domain."
      : "Please select a specific domain/bot from the top dropdown to manage its configuration, knowledge base, or flow.";
    const btnAction = isEmpty ? "switchPage('bots')" : "document.getElementById('global-domain-selector').focus(); showToast('Select a bot here 👆');";
    const btnText = isEmpty ? "Create My First Bot" : "Select Bot Now";

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.className = 'no-bot-overlay';
      panel.style.position = 'relative';
      panel.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="nbo-content">
        <div class="nbo-icon">${isEmpty ? '🚀' : '🤖'}</div>
        <h3>${isEmpty ? 'Getting Started' : 'Bot Selection Required'}</h3>
        <p>${msg}</p>
        <button class="btn btn-primary" onclick="${btnAction}" style="width:100%; padding:14px; border-radius:12px;">${btnText}</button>
      </div>
    `;
    overlay.style.display = 'flex';
    return false;
  } else {
    if (overlay) overlay.style.display = 'none';
    return true;
  }
}

function updateDomainBanner() {
  const nameEl = document.getElementById('dbb-domain-name');
  const subEl = document.getElementById('dbb-domain-sub');
  if (!nameEl) return;
  if (selectedBotId) {
    const bot = allBots.find(b => b.bot_id === selectedBotId);
    nameEl.textContent = bot ? (bot.domain || bot.name) : 'Selected Domain';
    if (subEl) subEl.textContent = bot ? `Bot: ${bot.name} • ID: ${bot.bot_id.slice(0, 14)}…` : '';
  } else {
    nameEl.textContent = 'All Domains';
    if (subEl) subEl.textContent = 'Showing aggregated stats across all your registered bots';
  }
}

// ---- Super Admin Impersonation helpers ------------------
async function initSuperAdminImpersonation() {
  if (role !== 'super') return;

  // Show super admin buttons and dropdowns
  const clientSelectWrap = document.getElementById('super-client-selector-wrap');
  const superAdminBtn = document.getElementById('super-admin-btn');
  if (clientSelectWrap) clientSelectWrap.style.display = 'flex';
  if (superAdminBtn) superAdminBtn.style.display = 'flex';

  // Load all clients to populate the dropdown
  try {
    const res = await fetchAuth(`${API}/api/super/clients`);
    if (res && res.ok) {
      const clients = await res.json();
      const select = document.getElementById('super-client-selector');
      if (select && clients.length > 0) {
        let options = `<option value="system_demo_client">GAdigital Demo (Demo)</option>`;
        clients.forEach(c => {
          if (c.id !== 'system_demo_client') {
            options += `<option value="${c.id}">${c.company_name || c.email} (${c.email})</option>`;
          }
        });
        select.innerHTML = options;
        select.value = impersonateClientId;
      }
    }
  } catch (err) {
    console.error('Failed to load clients for impersonation:', err);
  }
}

function onSuperClientChange() {
  const select = document.getElementById('super-client-selector');
  if (!select) return;
  impersonateClientId = select.value;
  localStorage.setItem('impersonate_client_id', impersonateClientId);

  // Reset selected bot
  selectedBotId = '';
  localStorage.removeItem('dashboard_domain_filter');
  const domainSelect = document.getElementById('global-domain-selector');
  if (domainSelect) domainSelect.value = '';

  // Reload config, stats, and lists
  populateDomainDropdown().then(() => {
    loadStats();
    loadUsers();
    loadSessions();
    loadLeads();
  });
  loadConfig();
  loadFlow();
}
