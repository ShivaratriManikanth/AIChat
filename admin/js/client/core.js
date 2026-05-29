
const API = window.location.origin;
const token = sessionStorage.getItem('saas_token');
const role  = sessionStorage.getItem('saas_role');

if (!token) {
  window.location.href = '/admin/login.html';
}

// Impersonation helper variable for super admins
let impersonateClientId = sessionStorage.getItem('impersonate_client_id') || 'system_demo_client';

function clearSaasSession() {
  sessionStorage.clear();
  localStorage.removeItem('saas_token');
  localStorage.removeItem('saas_role');
  localStorage.removeItem('saas_client_id');
  localStorage.removeItem('dashboard_domain_filter');
  localStorage.removeItem('current_working_bot_id');
  localStorage.removeItem('token');
  localStorage.removeItem('impersonate_client_id');
}

function logout() {
  clearSaasSession();
  window.location.href = 'login.html';
}

async function fetchAuth(url, options = {}) {
  if (!options.headers) options.headers = {};
  options.headers['Authorization'] = `Bearer ${token}`;
  if (role === 'super') {
    options.headers['X-Impersonate-Client'] = impersonateClientId;
  }
  const res = await fetch(url, options);
  if (res.status === 401) {
    clearSaasSession();
    window.location.href = 'login.html';
  }
  return res;
}

let config = {};
let allUsers = [];
let allSessions = [];
let currentWorkingBotId = localStorage.getItem('current_working_bot_id') || '';
let allBots = [];

// ---- Global Domain/Bot filter ----------------------------
// selectedBotId: '' = All domains, otherwise a specific bot_id
let selectedBotId = '';
let editingKbIndex = null;

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
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');
  const panel = document.getElementById('page-' + page);
  if (panel) panel.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', users: 'User Management',
    chats: 'Chat Management', settings: 'Settings',
    embed: 'Embed Code',
    leads: 'Lead Management', analytics: 'Advanced Analytics',
    bots: 'Bot Management (Multi-tenant)', knowledge: 'Knowledge Base',
    broadcast: 'Email Broadcast'
  };
  document.getElementById('page-title').textContent = titles[page] || 'Dashboard';

  if (page === 'leads') loadLeads();
  if (page === 'analytics') loadAnalytics();
  if (page === 'bots') loadBots();
  if (page === 'broadcast') initBroadcastPage();
  if (page === 'embed') initEmbedPage();

  if (page === 'flows') {
    if (checkBotSelection('page-flows')) loadFlow();
  }
  if (page === 'settings' || page === 'knowledge') {
    if (checkBotSelection('page-' + page)) loadConfig();
  }
  if (page === 'embed') {
    if (checkBotSelection('page-embed')) initEmbedPage();
  }
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
