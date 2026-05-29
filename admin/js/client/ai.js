// ---- FAQ Management -------------------------------------
let activeClientKbTab = 'url';

function switchClientKbTab(tab) {
  activeClientKbTab = tab;
  document.querySelectorAll('.kb-tab-btn-client').forEach(el => {
    el.classList.remove('active');
    el.style.color = '#64748b';
    el.style.fontWeight = '600';
    el.style.borderBottomColor = 'transparent';
  });
  const activeBtn = document.getElementById(`tab-btn-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.color = '#6366f1';
    activeBtn.style.fontWeight = '700';
    activeBtn.style.borderBottomColor = '#6366f1';
  }

  document.querySelectorAll('.client-kb-tab-content').forEach(el => el.style.display = 'none');
  const activeContent = document.getElementById(`faq-list-${tab}`);
  if (activeContent) activeContent.style.display = 'block';
}

function renderFaqs() {
  const countLabel = document.getElementById('faq-count-label');
  if (countLabel) countLabel.textContent = (config.faqs ? config.faqs.length : 0) + ' entries trained';
  
  const mapped = (config.faqs || []).map((faq, originalIndex) => ({ faq, originalIndex }));
  
  const urlChunks = mapped.filter(item => {
    const q = item.faq.question || '';
    return q.startsWith('[From ') && !q.toLowerCase().includes('.pdf') && !q.toLowerCase().includes('pdf]');
  });
  
  const pdfChunks = mapped.filter(item => {
    const q = item.faq.question || '';
    return q.startsWith('[From ') && (q.toLowerCase().includes('.pdf') || q.toLowerCase().includes('pdf]'));
  });
  
  const textChunks = mapped.filter(item => {
    const q = item.faq.question || '';
    return !q.startsWith('[From ');
  });

  const uCount = document.getElementById('client-count-url');
  const pCount = document.getElementById('client-count-pdf');
  const tCount = document.getElementById('client-count-text');
  if (uCount) uCount.textContent = urlChunks.length;
  if (pCount) pCount.textContent = pdfChunks.length;
  if (tCount) tCount.textContent = textChunks.length;

  // Render URL chunks
  const listUrl = document.getElementById('faq-list-url');
  if (listUrl) {
    if (urlChunks.length === 0) {
      listUrl.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;background:#fafafa;border-radius:8px;">🌐 No website URL knowledge trained yet. Enter a URL above to scrape.</div>';
    } else {
      listUrl.innerHTML = urlChunks.map(item => {
        const f = item.faq;
        const i = item.originalIndex;
        return `
          <div style="border-bottom:1px solid #f1f5f9; background:#faf5ff;">
            <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none;" onclick="toggleFaqItem(${i})">
              <div style="flex:1;min-width:0;">
                <span style="font-size:10px; background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 6px; border-radius:4px; margin-right:6px; vertical-align:middle;">WEBSITE</span>
                <span style="font-size:13px;font-weight:600;color:#1e293b;vertical-align:middle;">${escapeHtml(f.question)}</span>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;align-items:center;">
                <button class="btn-sm btn-sm-view" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;" onclick="event.stopPropagation();editKnowledgeChunk(${i})">✏️ Edit</button>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:11px;border-radius:6px;" onclick="event.stopPropagation();deleteFaq(${i})">Delete</button>
                <span id="faq-chevron-${i}" style="color:#94a3b8;font-size:12px;transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="faq-body-${i}" style="display:none;padding:0 16px 14px 16px;">
              <div style="font-size:13px;color:#475569;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(f.answer)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render PDF chunks
  const listPdf = document.getElementById('faq-list-pdf');
  if (listPdf) {
    if (pdfChunks.length === 0) {
      listPdf.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;background:#fafafa;border-radius:8px;">📄 No PDF document knowledge trained yet. Upload a PDF file above.</div>';
    } else {
      listPdf.innerHTML = pdfChunks.map(item => {
        const f = item.faq;
        const i = item.originalIndex;
        return `
          <div style="border-bottom:1px solid #f1f5f9; background:#f0f9ff;">
            <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none;" onclick="toggleFaqItem(${i})">
              <div style="flex:1;min-width:0;">
                <span style="font-size:10px; background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 6px; border-radius:4px; margin-right:6px; vertical-align:middle;">PDF</span>
                <span style="font-size:13px;font-weight:600;color:#1e293b;vertical-align:middle;">${escapeHtml(f.question)}</span>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;align-items:center;">
                <button class="btn-sm btn-sm-view" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;" onclick="event.stopPropagation();editKnowledgeChunk(${i})">✏️ Edit</button>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:11px;border-radius:6px;" onclick="event.stopPropagation();deleteFaq(${i})">Delete</button>
                <span id="faq-chevron-${i}" style="color:#94a3b8;font-size:12px;transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="faq-body-${i}" style="display:none;padding:0 16px 14px 16px;">
              <div style="font-size:13px;color:#475569;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(f.answer)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Paste Text chunks
  const listText = document.getElementById('faq-list-text');
  if (listText) {
    if (textChunks.length === 0) {
      listText.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;background:#fafafa;border-radius:8px;">📝 No pasted text knowledge trained yet. Paste raw text above.</div>';
    } else {
      listText.innerHTML = textChunks.map(item => {
        const f = item.faq;
        const i = item.originalIndex;
        return `
          <div style="border-bottom:1px solid #f1f5f9; background:#f0fdf4;">
            <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;cursor:pointer;user-select:none;" onclick="toggleFaqItem(${i})">
              <div style="flex:1;min-width:0;">
                <span style="font-size:10px; background:#dcfce7; color:#15803d; font-weight:700; padding:2px 6px; border-radius:4px; margin-right:6px; vertical-align:middle;">PASTED TEXT</span>
                <span style="font-size:13px;font-weight:600;color:#1e293b;vertical-align:middle;">${escapeHtml((f.question || '').replace('[Manual Entry] ', '').replace('[Manual Entry]', '').replace('[Text Training] ', '').replace('[Text Training]', ''))}</span>
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;align-items:center;">
                <button class="btn-sm btn-sm-view" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;" onclick="event.stopPropagation();editKnowledgeChunk(${i})">✏️ Edit</button>
                <button class="btn btn-danger" style="padding:4px 10px;font-size:11px;border-radius:6px;" onclick="event.stopPropagation();deleteFaq(${i})">Delete</button>
                <span id="faq-chevron-${i}" style="color:#94a3b8;font-size:12px;transition:transform 0.2s;">▼</span>
              </div>
            </div>
            <div id="faq-body-${i}" style="display:none;padding:0 16px 14px 16px;">
              <div style="font-size:13px;color:#475569;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px;white-space:pre-wrap;">${escapeHtml(f.answer)}</div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function toggleFaqItem(i) {
  const body = document.getElementById('faq-body-' + i);
  const chevron = document.getElementById('faq-chevron-' + i);
  if (!body) return;
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  if (chevron) chevron.style.transform = open ? '' : 'rotate(180deg)';
}

function editKnowledgeChunk(index) {
  const faq = config.faqs[index];
  if (!faq) return;

  editingKbIndex = index;

  // Load current values
  document.getElementById('knowledge-text').value = faq.answer;

  // Show title input and load current title
  document.getElementById('kb-title-group').style.display = 'block';
  document.getElementById('kb-title').value = faq.question;

  // Modify button text
  document.getElementById('btn-train-kb').textContent = '💾 Save Changes';
  document.getElementById('btn-cancel-edit-kb').style.display = 'inline-block';

  // Scroll to textarea smoothly
  document.getElementById('knowledge-text').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('knowledge-text').focus();
}

function cancelKnowledgeEdit() {
  editingKbIndex = null;
  document.getElementById('knowledge-text').value = '';
  document.getElementById('kb-title').value = '';

  document.getElementById('kb-title-group').style.display = 'none';
  document.getElementById('btn-train-kb').textContent = '➕ Train with Text';
  document.getElementById('btn-cancel-edit-kb').style.display = 'none';
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function clearAllKnowledge() {
  if (!confirm('Delete ALL trained knowledge? This cannot be undone.')) return;
  cancelKnowledgeEdit();
  config.faqs = [];
  await fetchAuth(`${API}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faqs: [], botId: selectedBotId })
  });
  showToast('All knowledge cleared');
  loadConfig();
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
    body: JSON.stringify({ faqs: config.faqs, botId: selectedBotId })
  });

  document.getElementById('newFaqQ').value = '';
  document.getElementById('newFaqA').value = '';
  showToast('FAQ added!');
  loadConfig();
}

async function deleteFaq(index) {
  if (!confirm('Are you sure you want to delete this knowledge chunk?')) return;

  if (editingKbIndex === index) {
    cancelKnowledgeEdit();
  } else if (editingKbIndex !== null && index < editingKbIndex) {
    editingKbIndex--;
  }

  config.faqs.splice(index, 1);
  await fetchAuth(`${API}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ faqs: config.faqs, botId: selectedBotId })
  });
  showToast('FAQ deleted');
  loadConfig();
}

// ---- PDF Upload (Dashboard settings) ---------------------
document.getElementById('pdf-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('PDF too large. Max 10 MB.'); return; }

  const status = document.getElementById('pdf-status');
  if (status) status.textContent = '⏳ Parsing PDF...';

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await fetchAuth(`${API}/api/knowledge/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileData: reader.result, botId: selectedBotId })
      });
      const data = await res.json();
      if (res.ok) {
        if (status) {
          status.innerHTML = `✅ Added ${data.added} knowledge chunks (${data.totalChars} characters) to FAQs.`;
          status.style.color = '#10B981';
        }
        showToast('PDF added to knowledge base!');
        loadConfig();
      } else {
        if (status) {
          status.textContent = '❌ ' + (data.error || 'Failed');
          status.style.color = '#EF4444';
        }
      }
    } catch (err) {
      if (status) {
        status.textContent = '❌ Upload failed: ' + err.message;
        status.style.color = '#EF4444';
      }
    }
  };
  reader.readAsDataURL(file);
});

// ---- URL Scraping ---------------------------------------
async function scrapeUrlToKnowledge() {
  const url = document.getElementById('knowledge-url').value.trim();
  if (!url) { alert('Enter a URL'); return; }
  const status = document.getElementById('url-scrape-status');
  if (status) {
    status.textContent = '⏳ Scraping website...';
    status.style.color = '#666';
  }
  try {
    const res = await fetchAuth(`${API}/api/knowledge/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, botId: selectedBotId })
    });
    const data = await res.json();
    if (res.ok) {
      if (status) {
        status.innerHTML = `✅ Added ${data.added} knowledge chunks (${data.totalChars} chars) from ${data.url}`;
        status.style.color = '#10B981';
      }
      document.getElementById('knowledge-url').value = '';
      showToast('Knowledge added!');
      loadConfig();
    } else {
      if (status) {
        status.textContent = '❌ ' + (data.error || 'Failed');
        status.style.color = '#EF4444';
      }
    }
  } catch (err) {
    if (status) {
      status.textContent = '❌ ' + err.message;
      status.style.color = '#EF4444';
    }
  }
}

// ---- PDF upload in Knowledge tab ------------------------
document.getElementById('pdf-input-kb').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { alert('PDF too large (max 10 MB)'); return; }
  const status = document.getElementById('pdf-status-kb');
  if (status) {
    status.textContent = '⏳ Parsing...';
    status.style.color = '#666';
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const res = await fetchAuth(`${API}/api/knowledge/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileData: reader.result, botId: selectedBotId })
      });
      const data = await res.json();
      if (res.ok) {
        if (status) {
          status.innerHTML = `✅ Added ${data.added} chunks from ${file.name}`;
          status.style.color = '#10B981';
        }
        showToast('PDF added!');
        loadConfig();
      } else {
        if (status) {
          status.textContent = '❌ ' + (data.error || 'Failed');
          status.style.color = '#EF4444';
        }
      }
    } catch (err) {
      if (status) {
        status.textContent = '❌ ' + err.message;
        status.style.color = '#EF4444';
      }
    }
  };
  reader.readAsDataURL(file);
});

// ---- Text Training --------------------------------------
function minimizeText(text) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];

  const cleanSentences = sentences.map(s => {
    let clean = s.trim();
    clean = clean.replace(/^(it is important to note that|we are proud to let you know that|we would like to inform you that|as a matter of fact|please note that|you will be happy to know that|we are dedicated to providing you with|we are a leading technology company dedicated to providing)\s+/i, '');
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    return clean;
  }).filter(s => s.length > 5);

  return cleanSentences.slice(0, 2).join(' ');
}

async function addTextToKnowledge() {
  const text = document.getElementById('knowledge-text').value.trim();
  if (!text) { alert('Enter some text to train the bot.'); return; }

  const status = document.getElementById('text-status-kb');
  if (status) {
    status.textContent = '⏳ Processing text...';
    status.style.color = '#666';
  }

  try {
    if (editingKbIndex !== null) {
      const newTitle = document.getElementById('kb-title').value.trim() || `[Text Training] Part ${editingKbIndex + 1}`;
      const minimized = minimizeText(text);

      const url = selectedBotId ? `${API}/api/config/full?botId=${encodeURIComponent(selectedBotId)}` : `${API}/api/config/full`;
      const resConf = await fetchAuth(url);
      const currentConfig = await resConf.json();
      currentConfig.faqs = currentConfig.faqs || [];

      if (editingKbIndex < currentConfig.faqs.length) {
        currentConfig.faqs[editingKbIndex] = { question: newTitle, answer: minimized };
      }

      const resPut = await fetchAuth(`${API}/api/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faqs: currentConfig.faqs, botId: selectedBotId })
      });

      if (resPut.ok) {
        if (status) {
          status.innerHTML = `✅ Successfully updated knowledge chunk!`;
          status.style.color = '#10B981';
        }
        cancelKnowledgeEdit();
        showToast('Knowledge chunk updated!');
        loadConfig();
      } else {
        if (status) {
          status.textContent = '❌ Failed to update knowledge.';
          status.style.color = '#EF4444';
        }
      }
      return;
    }

    const paragraphs = text.split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
    const usefulChunks = [];
    let currentChunk = "";

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (currentChunk === "") {
        currentChunk = p;
      } else {
        if (currentChunk.length < 120 || p.length < 120 || p.startsWith('-') || p.startsWith('•') || p.startsWith('*') || /^\d+\./.test(p)) {
          currentChunk += "\n\n" + p;
        } else {
          usefulChunks.push(currentChunk);
          currentChunk = p;
        }
      }
    }
    if (currentChunk !== "") {
      usefulChunks.push(currentChunk);
    }

    if (usefulChunks.length === 0) {
      if (status) {
        status.textContent = '❌ Text is too short to extract knowledge.';
        status.style.color = '#EF4444';
      }
      return;
    }

    const url = selectedBotId ? `${API}/api/config/full?botId=${encodeURIComponent(selectedBotId)}` : `${API}/api/config/full`;
    const resConf = await fetchAuth(url);
    const currentConfig = await resConf.json();
    const currentFaqs = currentConfig.faqs || [];

    const newFaqs = usefulChunks.map((chunk, i) => {
      let question = `[Text Training] Part ${currentFaqs.length + i + 1}`;
      let answer = chunk.trim();

      const qaMatch = chunk.match(/Question:\s*([\s\S]*?)\s*\n+\s*Answer:\s*([\s\S]*)/i);
      const shortQaMatch = !qaMatch ? chunk.match(/Q:\s*([\s\S]*?)\s*\n+\s*A:\s*([\s\S]*)/i) : null;

      if (qaMatch) {
        question = qaMatch[1].trim();
        answer = qaMatch[2].trim();
      } else if (shortQaMatch) {
        question = shortQaMatch[1].trim();
        answer = shortQaMatch[2].trim();
      }

      const minimized = minimizeText(answer);
      return {
        question: question,
        answer: minimized
      };
    });

    const updatedFaqs = [...currentFaqs, ...newFaqs];

    const resPut = await fetchAuth(`${API}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ faqs: updatedFaqs, botId: selectedBotId })
    });

    if (resPut.ok) {
      if (status) {
        status.innerHTML = `✅ Added ${newFaqs.length} chunks of knowledge.`;
        status.style.color = '#10B981';
      }
      document.getElementById('knowledge-text').value = '';
      showToast('Text training added!');
      loadConfig();
    } else {
      if (status) {
        status.textContent = '❌ Failed to save knowledge.';
        status.style.color = '#EF4444';
      }
    }
  } catch (err) {
    if (status) {
      status.textContent = '❌ ' + err.message;
      status.style.color = '#EF4444';
    }
  }
}

// ---- Semantic toggle save -------------------------------
async function saveSemanticToggle() {
  const enabled = document.getElementById('toggle-semanticSearch').classList.contains('on');
  await fetchAuth(`${API}/api/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ semanticSearch: enabled, botId: selectedBotId })
  });
  showToast('Semantic search ' + (enabled ? 'enabled' : 'disabled'));
}

// ---- AI Features toggle save ----------------------------
async function toggleAiFeatures() {
  const toggle = document.getElementById('toggle-enableAi');
  if (!toggle) return;
  const isEnabled = !toggle.classList.contains('on');
  toggle.classList.toggle('on', isEnabled);

  try {
    const res = await fetchAuth(`${API}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enableAiChatbot: isEnabled, botId: selectedBotId })
    });
    if (!res.ok) {
      toggle.classList.toggle('on', !isEnabled);
      alert('Failed to save settings.');
    } else {
      showToast(isEnabled ? 'AI Features Enabled!' : 'AI Features Disabled!');
    }
  } catch (err) {
    toggle.classList.toggle('on', !isEnabled);
    alert('Error saving settings.');
  }
}
