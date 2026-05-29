
const token = sessionStorage.getItem('saas_token');
const role  = sessionStorage.getItem('saas_role');

if (!token || role !== 'super') {
  window.location.href = 'login.html';
}

// Dynamic plans loaded from server
let PLANS = [];
const PLAN_BADGES = { 1: 'badge-basic', 2: 'badge-standard', 3: 'badge-premium' };
function planBadgeClass(planId) {
  return PLAN_BADGES[planId] || 'badge-basic';
}

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
  const activeToken = sessionStorage.getItem('saas_token');
  if (!activeToken) {
    window.location.href = 'login.html';
    return;
  }
  if (!options.headers) options.headers = {};
  options.headers['Authorization'] = `Bearer ${activeToken}`;
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    clearSaasSession();
    window.location.href = 'login.html';
  }
  return res;
}

// Tab Management
function switchTab(pageName) {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const activeItem = document.querySelector(`.sidebar-nav .nav-item[data-page="${pageName}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }

  document.querySelectorAll('.panel').forEach(p => {
    p.classList.remove('active');
  });

  const targetPanel = document.getElementById(`page-${pageName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

  const titleMap = {
    'platform': 'Platform Stats & Clients',
    'packages': 'Plan Packages',
    'dbot-settings': 'Bot Settings',
    'dbot-aichat': 'AI Chatbot',
    'dbot-flow': 'Flow Builder',
    'dbot-chats': 'Chat History'
  };
  document.getElementById('page-title').textContent = titleMap[pageName] || 'Dashboard';
}

function switchDemoSubTab(subName) {
  switchTab('dbot-' + subName);
  if (subName === 'settings') {
    loadDemoBotConfig();
  } else if (subName === 'aichat') {
    loadDemoKnowledge();
  } else if (subName === 'flow') {
    loadDemoFlow();
  } else if (subName === 'chats') {
    loadDemoSessions();
  }
}

// Proxy wrappers for backward compatibility
function switchMainTab(tabName) {
  if (tabName === 'platform') switchTab('platform');
  else switchDemoSubTab('settings');
}

function switchSubTab(subName) {
  switchDemoSubTab(subName);
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
