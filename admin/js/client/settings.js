// ---- Load Config ----------------------------------------
async function loadConfig() {
  if (!selectedBotId) return;
  const url = `${API}/api/config/full?botId=${encodeURIComponent(selectedBotId)}`;
  const res = await fetchAuth(url);
  config = await res.json();

  document.getElementById('cfg-botName').value = config.botName || '';
  document.getElementById('cfg-companyName').value = config.companyName || '';
  document.getElementById('cfg-welcomeMessage').value = config.welcomeMessage || '';
  document.getElementById('cfg-themeColor').value = config.themeColor || '#4F46E5';
  document.getElementById('cfg-aiModel').value = config.aiModel || 'gpt-3.5-turbo';
  document.getElementById('cfg-systemPrompt').value = config.systemPrompt || '';
  document.getElementById('cfg-placeholder').value = config.placeholder || '';
  document.getElementById('cfg-suggestedQuestions').value = (config.suggestedQuestions || []).join('\n');

  // Chatbot Mode Selection
  const mode = config.chatbotMode || 'aichat';
  const radios = document.getElementsByName('cfg-primary-mode');
  radios.forEach(r => {
    r.checked = r.value === mode;
  });
  updateClientChatbotModeUI(mode);

  // Email & intro fields
  document.getElementById('cfg-emailCaptureTitle').value = config.emailCaptureTitle || '';
  document.getElementById('cfg-emailCaptureSubtitle').value = config.emailCaptureSubtitle || '';
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
  if (preview) {
    if (config.logo) {
      preview.innerHTML = `<img src="${config.logo}" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
      preview.innerHTML = '🤖';
    }
  }

  // Domain restriction
  document.getElementById('cfg-allowedDomains').value = (config.allowedDomains || []).join('\n');

  // API key
  document.getElementById('cfg-apiKey').value = config.apiKey || '';
  document.getElementById('toggle-enforceApiKey').classList.toggle('on', !!config.enforceApiKey);

  // Semantic search
  const semToggle = document.getElementById('toggle-semanticSearch');
  if (semToggle) semToggle.classList.toggle('on', config.semanticSearch !== false);

  // AI Features toggle
  const aiToggle = document.getElementById('toggle-enableAi');
  if (aiToggle) aiToggle.classList.toggle('on', config.enableAiChatbot !== false);

  // Email notifications
  const em = config.emailNotifications || {};
  document.getElementById('toggle-emailNotif').classList.toggle('on', !!em.enabled);
  document.getElementById('cfg-fromEmail').value = em.fromEmail || '';
  document.getElementById('cfg-adminEmail').value = em.adminEmail || '';

  renderFaqs();
}

function updateClientChatbotModeSelection(mode) {
  updateClientChatbotModeUI(mode);
}

function updateClientChatbotModeUI(mode) {
  const aiOpt = document.getElementById('client-mode-opt-ai');
  const flowOpt = document.getElementById('client-mode-opt-flow');
  if (!aiOpt || !flowOpt) return;
  if (mode === 'aichat') {
    aiOpt.style.borderColor = 'var(--primary)';
    aiOpt.style.background = 'rgba(79, 70, 229, 0.08)';
    flowOpt.style.borderColor = '#e2e8f0';
    flowOpt.style.background = 'transparent';
  } else {
    flowOpt.style.borderColor = 'var(--primary)';
    flowOpt.style.background = 'rgba(79, 70, 229, 0.08)';
    aiOpt.style.borderColor = '#e2e8f0';
    aiOpt.style.background = 'transparent';
  }
}

function toggleEmailCapture() {
  const toggle = document.getElementById('toggle-emailCapture');
  if (toggle) toggle.classList.toggle('on');
}

// ---- Save Settings --------------------------------------
async function saveSettings() {
  if (!selectedBotId) {
    showToast('❌ Please select a bot first');
    return;
  }

  try {
    const updated = {
      chatbotMode: document.querySelector('input[name="cfg-primary-mode"]:checked')?.value || 'aichat',
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
        fromEmail: document.getElementById('cfg-fromEmail').value,
        adminEmail: document.getElementById('cfg-adminEmail').value
      },
      botId: selectedBotId
    };

    const res = await fetchAuth(`${API}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });

    if (res.ok) {
      showToast('✅ Settings saved successfully!');
      loadConfig();
    } else {
      const err = await res.json();
      showToast('❌ Error: ' + (err.error || 'Failed to save'));
    }
  } catch (e) {
    console.error('Save settings error', e);
    showToast('❌ Network error saving settings');
  }
}

function toggleFaqActive() {
  // document.getElementById('toggle-faq-active').classList.toggle('on');
  // saveSettings();
}

// ---- Logo Upload ----------------------------------------
document.getElementById('logo-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('Logo too large. Max 2 MB.'); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    try {
      const res = await fetchAuth(`${API}/api/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: dataUrl, botId: selectedBotId })
      });
      if (res.ok) {
        document.getElementById('logo-preview').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        showToast('✅ Logo uploaded successfully!');
        loadConfig();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('❌ Failed to upload logo: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      showToast('❌ Network error uploading logo.');
    }
  };
  reader.readAsDataURL(file);
});

async function removeLogo() {
  if (!confirm('Are you sure you want to remove the bot logo?')) return;
  try {
    const res = await fetchAuth(`${API}/api/logo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo: '', botId: selectedBotId })
    });
    if (res.ok) {
      document.getElementById('logo-preview').innerHTML = '🤖';
      showToast('✅ Logo removed successfully');
      loadConfig();
    } else {
      const err = await res.json().catch(() => ({}));
      showToast('❌ Failed to remove logo: ' + (err.error || 'Unknown error'));
    }
  } catch (err) {
    console.error(err);
    showToast('❌ Network error removing logo.');
  }
}

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
