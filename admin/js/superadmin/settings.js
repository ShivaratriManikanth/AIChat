// Logo Upload handler
document.getElementById('dbot-logo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('Logo file size is too large. Max 2MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    try {
      const res = await fetchAuth('/api/super/demo-bot/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: dataUrl })
      });
      if (res.ok) {
        document.getElementById('dbot-logo-preview').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        alert('Logo uploaded successfully!');
      } else {
        alert('Failed to upload logo.');
      }
    } catch (err) {
      alert('Network error uploading logo.');
    }
  };
  reader.readAsDataURL(file);
});

async function removeDemoLogo() {
  if (!confirm('Are you sure you want to remove the bot logo?')) return;
  try {
    const res = await fetchAuth('/api/super/demo-bot/logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo: '' })
    });
    if (res.ok) {
      document.getElementById('dbot-logo-preview').innerHTML = '🤖';
      alert('Logo removed successfully.');
    } else {
      alert('Failed to remove logo.');
    }
  } catch (err) {
    alert('Network error removing logo.');
  }
}

async function loadDemoBotConfig() {
  try {
    const res = await fetchAuth('/api/super/demo-bot/config');
    if (!res.ok) throw new Error('Failed to load demo bot config');
    const config = await res.json();
    
    document.getElementById('dbot-botName').value = config.botName || '';
    document.getElementById('dbot-companyName').value = config.companyName || '';
    document.getElementById('dbot-welcomeMessage').value = config.welcomeMessage || '';
    document.getElementById('dbot-themeColor').value = config.themeColor || '#4F46E5';
    document.getElementById('dbot-aiModel').value = config.aiModel || 'gpt-3.5-turbo';
    document.getElementById('dbot-systemPrompt').value = config.systemPrompt || '';
    isDemoAiActive = config.enableAiChatbot !== false;
    const t1 = document.getElementById('dbot-toggle-ai-active');
    if (t1) t1.className = 'toggle-switch' + (isDemoAiActive ? ' on' : '');
    const t2 = document.getElementById('dbot-toggle-ai-kb-active');
    if (t2) t2.className = 'toggle-switch' + (isDemoAiActive ? ' on' : '');
    const aiLabel = document.getElementById('dbot-ai-status-label');
    if (aiLabel) aiLabel.textContent = isDemoAiActive ? 'Active' : 'Inactive';

    document.getElementById('dbot-enableFaq').value = config.enableFaq !== false ? 'true' : 'false';

    // Chatbot Mode Selection
    const mode = config.chatbotMode || 'aichat';
    const radios = document.getElementsByName('dbot-primary-mode');
    radios.forEach(r => {
      r.checked = r.value === mode;
    });
    updateSuperChatbotModeUI(mode);
    
    // Custom keys
    document.getElementById('dbot-fallbackMessage').value = config.fallbackMessage || '';
    document.getElementById('dbot-offlineMessage').value = config.offlineMessage || '';
    document.getElementById('dbot-rateLimit').value = config.rateLimitPerMinute || 20;

    // Logo preview
    const preview = document.getElementById('dbot-logo-preview');
    if (config.logo) {
      preview.innerHTML = `<img src="${config.logo}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
      preview.innerHTML = '🤖';
    }
    
    if (config.suggestedQuestions) {
      document.getElementById('dbot-suggestedQuestions').value = Array.isArray(config.suggestedQuestions) 
        ? config.suggestedQuestions.join('\n') 
        : config.suggestedQuestions;
    } else {
      document.getElementById('dbot-suggestedQuestions').value = '';
    }
  } catch (err) {
    console.error('Error loading demo bot config:', err);
  }
}

function updateSuperChatbotModeSelection(mode) {
  updateSuperChatbotModeUI(mode);
}

function updateSuperChatbotModeUI(mode) {
  const aiOpt = document.getElementById('super-mode-opt-ai');
  const flowOpt = document.getElementById('super-mode-opt-flow');
  if (!aiOpt || !flowOpt) return;
  if (mode === 'aichat') {
    aiOpt.style.borderColor = '#4f46e5';
    aiOpt.style.background = 'rgba(79, 70, 229, 0.08)';
    flowOpt.style.borderColor = '#e2e8f0';
    flowOpt.style.background = 'transparent';
  } else {
    flowOpt.style.borderColor = '#4f46e5';
    flowOpt.style.background = 'rgba(79, 70, 229, 0.08)';
    aiOpt.style.borderColor = '#e2e8f0';
    aiOpt.style.background = 'transparent';
  }
}

async function saveDemoBotConfig() {
  const saveBtn = document.getElementById('dbot-save-btn');
  const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '💾 Save Demo Bot Settings';
  
  // Inject spin keyframes style if not present
  if (!document.getElementById('dbot-spin-keyframes')) {
    const style = document.createElement('style');
    style.id = 'dbot-spin-keyframes';
    style.textContent = `
      @keyframes dbotSpin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-radius:50%; border-top-color:transparent; animation:dbotSpin 0.6s linear infinite; margin-right:8px; vertical-align:middle;"></span> Saving Settings...`;
  }

  const chatbotMode = document.querySelector('input[name="dbot-primary-mode"]:checked')?.value || 'aichat';
  const botName = document.getElementById('dbot-botName').value.trim();
  const companyName = document.getElementById('dbot-companyName').value.trim();
  const welcomeMessage = document.getElementById('dbot-welcomeMessage').value.trim();
  const themeColor = document.getElementById('dbot-themeColor').value;
  const aiModel = document.getElementById('dbot-aiModel').value;
  const systemPrompt = document.getElementById('dbot-systemPrompt').value.trim();
  const suggestedQuestionsText = document.getElementById('dbot-suggestedQuestions').value.trim();
  const enableAiChatbot = isDemoAiActive;
  const enableFaq = document.getElementById('dbot-enableFaq').value === 'true';
  
  const fallbackMessage = document.getElementById('dbot-fallbackMessage').value.trim();
  const offlineMessage = document.getElementById('dbot-offlineMessage').value.trim();
  const rateLimitPerMinute = parseInt(document.getElementById('dbot-rateLimit').value) || 20;

  const suggestedQuestions = suggestedQuestionsText 
    ? suggestedQuestionsText.split('\n').map(q => q.trim()).filter(Boolean) 
    : [];
    
  const msg = document.getElementById('demoBotStatusMsg');
  msg.className = ''; msg.style.display = 'none';
  
  try {
    const res = await fetchAuth('/api/super/demo-bot/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatbotMode,
        botName,
        companyName,
        welcomeMessage,
        themeColor,
        aiModel,
        systemPrompt,
        suggestedQuestions,
        enableAiChatbot,
        enableFaq,
        fallbackMessage,
        offlineMessage,
        rateLimitPerMinute
      })
    });
    
    if (res.ok) {
      msg.textContent = '✅ Landing Page Demo Chatbot settings updated successfully!';
      msg.className = 'success';
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 4000);
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = '❌ ' + (err.error || 'Failed to update settings.');
      msg.className = 'error';
      msg.style.display = 'block';
    }
  } catch (err) {
    msg.textContent = '❌ Network error. Please try again.';
    msg.className = 'error';
    msg.style.display = 'block';
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnHtml;
    }
  }
}

// ---- Demo Bot AI Active State ----
let isDemoAiActive = true;
function toggleDemoAiActive() {
  isDemoAiActive = !isDemoAiActive;
  const t1 = document.getElementById('dbot-toggle-ai-active');
  if (t1) t1.className = 'toggle-switch' + (isDemoAiActive ? ' on' : '');
  const t2 = document.getElementById('dbot-toggle-ai-kb-active');
  if (t2) t2.className = 'toggle-switch' + (isDemoAiActive ? ' on' : '');
  const label = document.getElementById('dbot-ai-status-label');
  if (label) label.textContent = isDemoAiActive ? 'Active' : 'Inactive';
  saveDemoBotConfig();
}
