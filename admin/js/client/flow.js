// ---- Flow Builder Logic ---------------------------------
let currentFlowId = null;
let flowNodes = [];
let isFlowActive = false;

async function loadFlow() {
  if (!selectedBotId) return;
  try {
    const url = `${API}/api/flows?botId=${encodeURIComponent(selectedBotId)}`;
    const res = await fetchAuth(url);
    const flows = await res.json();
    if (flows && flows.length > 0) {
      const flow = flows[0];
      currentFlowId = flow.id;
      flowNodes = JSON.parse(flow.flow_data || '[]');
      isFlowActive = flow.is_active === 1;
    } else {
      currentFlowId = null;
      flowNodes = [];
      isFlowActive = false;
    }
    const tFlow = document.getElementById('toggle-flow-active');
    if (tFlow) tFlow.className = 'toggle-switch' + (isFlowActive ? ' on' : '');
    renderFlowNodes();
  } catch (err) {
    console.error('Failed to load flow', err);
  }
}

function toggleFlowActive() {
  isFlowActive = !isFlowActive;
  const tFlow = document.getElementById('toggle-flow-active');
  if (tFlow) tFlow.className = 'toggle-switch' + (isFlowActive ? ' on' : '');
  saveFlow();
}

function addFlowNode(type, label) {
  const id = 'node_' + Math.random().toString(36).substr(2, 9);
  flowNodes.push({
    id,
    type,
    label,
    config: { question: 'Please provide your ' + label.replace(/[^a-zA-Z ]/g, '').trim() + '?', options: [] }
  });
  renderFlowNodes();
}

function deleteFlowNode(index) {
  if (confirm('Delete this component?')) {
    flowNodes.splice(index, 1);
    renderFlowNodes();
  }
}

function duplicateFlowNode(index) {
  const node = flowNodes[index];
  const newNode = JSON.parse(JSON.stringify(node));
  newNode.id = 'node_' + Math.random().toString(36).substr(2, 9);
  flowNodes.splice(index + 1, 0, newNode);
  renderFlowNodes();
}

function moveNodeUp(index) {
  if (index === 0) return;
  const temp = flowNodes[index];
  flowNodes[index] = flowNodes[index - 1];
  flowNodes[index - 1] = temp;
  renderFlowNodes();
}

function moveNodeDown(index) {
  if (index === flowNodes.length - 1) return;
  const temp = flowNodes[index];
  flowNodes[index] = flowNodes[index + 1];
  flowNodes[index + 1] = temp;
  renderFlowNodes();
}

function updateNodeConfig(index, key, value) {
  if (!flowNodes[index].config) flowNodes[index].config = {};
  flowNodes[index].config[key] = value;
}

function renderFlowNodes() {
  const container = document.getElementById('flow-nodes-list');
  if (!container) return;

  if (flowNodes.length === 0) {
    container.innerHTML = `
      <div class="empty-state" id="flow-empty-state">
        <div class="empty-icon">🖱️</div>
        <p>Click a component on the left to add it to your flow.</p>
      </div>
    `;
    return;
  }

  let html = '';
  flowNodes.forEach((node, i) => {
    let configHtml = '';
    if (node.type === 'single_choice' || node.type === 'multiple_choice') {
      configHtml = `<input type="text" class="flow-node-input" placeholder="Options (comma separated)" value="${(node.config.options || []).join(', ')}" onchange="updateNodeConfig(${i}, 'options', this.value.split(',').map(s=>s.trim()))">`;
    } else if (node.type === 'website' || node.type === 'link') {
      configHtml = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Button Label</label>
            <input type="text" class="flow-node-input" placeholder="e.g. Visit Page" value="${node.config.buttonLabel || ''}" onchange="updateNodeConfig(${i}, 'buttonLabel', this.value)" style="margin-top:2px;">
          </div>
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Redirect URL</label>
            <input type="url" class="flow-node-input" placeholder="e.g. https://yoursite.com" value="${node.config.url || ''}" onchange="updateNodeConfig(${i}, 'url', this.value)" style="margin-top:2px;">
          </div>
        </div>
      `;
    } else if (node.type === 'appointment') {
      configHtml = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Available Time Slots</label>
            <input type="text" class="flow-node-input" placeholder="e.g. 09:00, 10:00, 11:00, 14:00" value="${(node.config.timeSlots || []).join(', ')}" onchange="updateNodeConfig(${i}, 'timeSlots', this.value.split(',').map(s=>s.trim()))" style="margin-top:2px;">
          </div>
          <div>
            <label style="font-size:10px; font-weight:600; color:#888;">Min Days Ahead</label>
            <input type="number" class="flow-node-input" placeholder="e.g. 1" min="0" max="90" value="${node.config.minDaysAhead || 1}" onchange="updateNodeConfig(${i}, 'minDaysAhead', parseInt(this.value)||1)" style="margin-top:2px;">
          </div>
        </div>
        <div style="margin-top:8px;">
          <label style="font-size:10px; font-weight:600; color:#888;">Blocked Weekdays (comma separated, e.g. Sunday, Saturday)</label>
          <input type="text" class="flow-node-input" placeholder="e.g. Sunday, Saturday" value="${(node.config.blockedDays || []).join(', ')}" onchange="updateNodeConfig(${i}, 'blockedDays', this.value.split(',').map(s=>s.trim()))" style="margin-top:2px;">
        </div>
      `;
    }

    html += `
      <div class="flow-node-item">
        <div class="flow-node-header">
          <div class="flow-node-title">${node.label}</div>
          <div class="flow-node-actions">
            <button class="flow-node-btn" onclick="moveNodeUp(${i})">↑</button>
            <button class="flow-node-btn" onclick="moveNodeDown(${i})">↓</button>
            <button class="flow-node-btn" onclick="duplicateFlowNode(${i})">📄</button>
            <button class="flow-node-btn delete" onclick="deleteFlowNode(${i})">🗑️</button>
          </div>
        </div>
        <div class="flow-node-body">
          <label style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;">Bot Asks:</label>
          <input type="text" class="flow-node-input" placeholder="Enter bot prompt..." value="${node.config.question || ''}" onchange="updateNodeConfig(${i}, 'question', this.value)">
          ${configHtml}
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function openFlowPreview() {
  // Auto-save flow before previewing to ensure it's up to date
  await saveFlow();

  const overlay = document.getElementById('flow-preview-overlay');
  const iframe = document.getElementById('flow-preview-iframe');

  const botsRes = await fetchAuth(`${API}/api/bots`);
  const bots = await botsRes.json();

  if (!bots || bots.length === 0) {
    alert('Please create at least one bot in the "Bots" section first.');
    return;
  }

  let testBot = null;
  if (selectedBotId) {
    testBot = bots.find(b => b.bot_id === selectedBotId);
  }
  if (!testBot) {
    testBot = bots[0];
  }

  // Load a special preview URL that has the chatbot script
  iframe.src = `preview-test.html?bot_id=${testBot.bot_id}&api_key=${testBot.api_key}&server=${encodeURIComponent(API)}`;
  overlay.style.display = 'flex';
}

function closeFlowPreview(e) {
  if (e.target.id === 'flow-preview-overlay') {
    document.getElementById('flow-preview-overlay').style.display = 'none';
    document.getElementById('flow-preview-iframe').src = 'about:blank';
  }
}

async function saveFlow() {
  try {
    const payload = {
      id: currentFlowId,
      name: 'Main Flow',
      flow_data: flowNodes,
      is_active: isFlowActive,
      botId: selectedBotId
    };
    const res = await fetchAuth(`${API}/api/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      currentFlowId = data.id;
      showToast('Flow saved successfully!');
    }
  } catch (err) {
    console.error('Failed to save flow', err);
    showToast('Error saving flow');
  }
}
