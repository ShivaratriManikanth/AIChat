let demoFlowNodes = [];
let demoCurrentFlowId = null;
let isDemoFlowActive = false;

async function loadDemoFlow() {
  try {
    const res = await fetchAuth('/api/super/demo-bot/flows');
    const flows = await res.json();
    if (flows && flows.length > 0) {
      const flow = flows[0];
      demoCurrentFlowId = flow.id;
      demoFlowNodes = JSON.parse(flow.flow_data || '[]');
      isDemoFlowActive = flow.is_active === 1;
    } else {
      demoCurrentFlowId = null;
      demoFlowNodes = [];
      isDemoFlowActive = false;
    }
    const tFlow = document.getElementById('dbot-sidebar-toggle-flow');
    if (tFlow) tFlow.className = 'toggle-switch' + (isDemoFlowActive ? ' on' : '');
    renderDemoFlowNodes();
    setTimeout(openDemoFlowPreview, 200);
  } catch (err) {
    console.error('Failed to load demo flow', err);
  }
}

function toggleDemoFlowActive() {
  isDemoFlowActive = !isDemoFlowActive;
  const tFlow = document.getElementById('dbot-sidebar-toggle-flow');
  if (tFlow) tFlow.className = 'toggle-switch' + (isDemoFlowActive ? ' on' : '');
  saveDemoFlow();
}

function addDemoFlowNode(type, label) {
  const id = 'node_' + Math.random().toString(36).substr(2, 9);
  demoFlowNodes.push({
    id,
    type,
    label,
    config: { question: 'Please provide your ' + label.replace(/[^a-zA-Z ]/g, '').trim() + '?', options: [] }
  });
  renderDemoFlowNodes();
  saveDemoFlow(false).then(() => { openDemoFlowPreview(); });
}

function deleteDemoFlowNode(index) {
  if (confirm('Delete this component?')) {
    demoFlowNodes.splice(index, 1);
    renderDemoFlowNodes();
    saveDemoFlow(false).then(() => { openDemoFlowPreview(); });
  }
}

function duplicateDemoFlowNode(index) {
  const node = demoFlowNodes[index];
  const newNode = JSON.parse(JSON.stringify(node));
  newNode.id = 'node_' + Math.random().toString(36).substr(2, 9);
  demoFlowNodes.splice(index + 1, 0, newNode);
  renderDemoFlowNodes();
  saveDemoFlow(false).then(() => { openDemoFlowPreview(); });
}

function moveDemoNodeUp(index) {
  if (index === 0) return;
  const temp = demoFlowNodes[index];
  demoFlowNodes[index] = demoFlowNodes[index - 1];
  demoFlowNodes[index - 1] = temp;
  renderDemoFlowNodes();
  saveDemoFlow(false).then(() => { openDemoFlowPreview(); });
}

function moveDemoNodeDown(index) {
  if (index === demoFlowNodes.length - 1) return;
  const temp = demoFlowNodes[index];
  demoFlowNodes[index] = demoFlowNodes[index + 1];
  demoFlowNodes[index + 1] = temp;
  renderDemoFlowNodes();
  saveDemoFlow(false).then(() => { openDemoFlowPreview(); });
}

function updateDemoNodeConfig(index, key, value) {
  if (!demoFlowNodes[index].config) demoFlowNodes[index].config = {};
  demoFlowNodes[index].config[key] = value;
  saveDemoFlow(false).then(() => { openDemoFlowPreview(); });
}

function renderDemoFlowNodes() {
  const container = document.getElementById('dbot-flow-nodes-list');
  if (demoFlowNodes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🖱️</div>
        <p>Click a component on the left to add it to your flow.</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  demoFlowNodes.forEach((node, i) => {
    let configHtml = '';
    if (node.type === 'single_choice' || node.type === 'multiple_choice') {
      configHtml = `<input type="text" class="flow-node-input" placeholder="Options (comma separated)" value="${(node.config.options||[]).join(', ')}" onchange="updateDemoNodeConfig(${i}, 'options', this.value.split(',').map(s=>s.trim()))">`;
    } else if (node.type === 'website' || node.type === 'link') {
      configHtml = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Button Label</label>
            <input type="text" class="flow-node-input" placeholder="e.g. Visit Page" value="${node.config.buttonLabel || ''}" onchange="updateDemoNodeConfig(${i}, 'buttonLabel', this.value)" style="margin-top:2px;">
          </div>
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Redirect URL</label>
            <input type="url" class="flow-node-input" placeholder="e.g. https://yoursite.com" value="${node.config.url || ''}" onchange="updateDemoNodeConfig(${i}, 'url', this.value)" style="margin-top:2px;">
          </div>
        </div>
      `;
    } else if (node.type === 'appointment') {
      configHtml = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Available Time Slots</label>
            <input type="text" class="flow-node-input" placeholder="e.g. 09:00, 10:00, 11:00, 14:00" value="${(node.config.timeSlots||[]).join(', ')}" onchange="updateDemoNodeConfig(${i}, 'timeSlots', this.value.split(',').map(s=>s.trim()))" style="margin-top:2px;">
          </div>
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Min Days Ahead</label>
            <input type="number" class="flow-node-input" placeholder="e.g. 1" min="0" max="90" value="${node.config.minDaysAhead || 1}" onchange="updateDemoNodeConfig(${i}, 'minDaysAhead', parseInt(this.value)||1)" style="margin-top:2px;">
          </div>
        </div>
        <div style="margin-top:8px;">
          <label style="font-size:10px; font-weight:600; color:#888;">Blocked Weekdays (comma separated, e.g. Sunday, Saturday)</label>
          <input type="text" class="flow-node-input" placeholder="e.g. Sunday, Saturday" value="${(node.config.blockedDays||[]).join(', ')}" onchange="updateDemoNodeConfig(${i}, 'blockedDays', this.value.split(',').map(s=>s.trim()))" style="margin-top:2px;">
        </div>
      `;
    }
    
    html += `
      <div class="flow-node-item">
        <div class="flow-node-header">
          <div class="flow-node-title" style="font-weight: 700;">${node.label}</div>
          <div class="flow-node-actions">
            <button class="flow-node-btn" onclick="moveDemoNodeUp(${i})">↑</button>
            <button class="flow-node-btn" onclick="moveDemoNodeDown(${i})">↓</button>
            <button class="flow-node-btn" onclick="duplicateDemoFlowNode(${i})">📄</button>
            <button class="flow-node-btn delete" onclick="deleteDemoFlowNode(${i})">🗑️</button>
          </div>
        </div>
        <div class="flow-node-body">
          <label style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Bot Asks:</label>
          <input type="text" class="flow-node-input" placeholder="Enter bot prompt..." value="${node.config.question || ''}" onchange="updateDemoNodeConfig(${i}, 'question', this.value)">
          ${configHtml}
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function saveDemoFlow(showNotification = true) {
  // Flow nodes validations
  for (let i = 0; i < demoFlowNodes.length; i++) {
    const node = demoFlowNodes[i];
    const label = node.label || node.type;
    
    // 1. Bot Asks prompt validation
    if (!node.config.question || !node.config.question.trim()) {
      if (showNotification) alert(`⚠️ Validation Error: "Bot Asks" prompt is required for component #${i + 1} (${label}).`);
      return false;
    }

    // 2. Choice components options validation
    if (node.type === 'single_choice' || node.type === 'multiple_choice') {
      const options = node.config.options || [];
      const validOptions = options.filter(opt => opt && opt.trim());
      if (validOptions.length === 0) {
        if (showNotification) alert(`⚠️ Validation Error: At least one option/choice is required for component #${i + 1} (${label}).`);
        return false;
      }
    }

    // 3. Website / Redirect URL components validation
    if (node.type === 'website' || node.type === 'link') {
      const buttonLabel = node.config.buttonLabel ? node.config.buttonLabel.trim() : '';
      const url = node.config.url ? node.config.url.trim() : '';
      
      if (!buttonLabel) {
        if (showNotification) alert(`⚠️ Validation Error: Button Label is required for component #${i + 1} (${label}).`);
        return false;
      }
      if (!url) {
        if (showNotification) alert(`⚠️ Validation Error: Redirect URL is required for component #${i + 1} (${label}).`);
        return false;
      }
      // Validate Redirect URL format
      const urlRegex = /^(https?:\/\/)[^\s$.?#].[^\s]*$/i;
      if (!urlRegex.test(url)) {
        if (showNotification) alert(`⚠️ Validation Error: Redirect URL for component #${i + 1} (${label}) must be a valid URL starting with http:// or https://.`);
        return false;
      }
    }

    // 4. Appointment components validation
    if (node.type === 'appointment') {
      const timeSlots = node.config.timeSlots || [];
      const validSlots = timeSlots.filter(t => t && t.trim());
      if (validSlots.length === 0) {
        if (showNotification) alert(`⚠️ Validation Error: At least one Available Time Slot is required for component #${i + 1} (${label}).`);
        return false;
      }
    }
  }

  try {
    const payload = {
      id: demoCurrentFlowId,
      name: 'Demo Chatbot Main Flow',
      flow_data: demoFlowNodes,
      is_active: isDemoFlowActive
    };
    const res = await fetchAuth('/api/super/demo-bot/flows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      demoCurrentFlowId = data.id;
      if (showNotification) {
        alert('Flow saved successfully!');
      }
      return true;
    } else {
      if (showNotification) {
        alert('Failed to save flow.');
      }
      return false;
    }
  } catch (err) {
    console.error('Failed to save flow', err);
    if (showNotification) {
      alert('Error saving flow.');
    }
    return false;
  }
}

async function openDemoFlowPreview() {
  const saved = await saveDemoFlow(false);
  if (saved === false) return;

  const iframe = document.getElementById('dbot-flow-side-preview');
  if (iframe) {
    iframe.src = `preview-test.html?bot_id=bot_demo_landing&api_key=key_gadigital_demo_bot&server=${encodeURIComponent(window.location.origin)}&preview=true`;
  }
}

function closeDemoFlowPreview(e) {
  // Keeping for backward compatibility
}

function closeDemoFlowPreviewBtn() {
  // Keeping for backward compatibility
}
