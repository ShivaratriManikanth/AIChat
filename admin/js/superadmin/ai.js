let demoFaqs = [];
let activeDemoKbTab = 'url';

function switchDemoKbTab(tab) {
  activeDemoKbTab = tab;
  document.querySelectorAll('.kb-tab-btn').forEach(el => {
    el.classList.remove('active');
    el.style.color = '#64748b';
    el.style.fontWeight = '600';
    el.style.borderBottomColor = 'transparent';
  });
  const activeBtn = document.getElementById(`dbot-tab-btn-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.color = '#4f46e5';
    activeBtn.style.fontWeight = '700';
    activeBtn.style.borderBottomColor = '#4f46e5';
  }
  
  document.querySelectorAll('.kb-tab-content').forEach(el => el.style.display = 'none');
  const activeContent = document.getElementById(`dbot-faq-list-${tab}`);
  if (activeContent) activeContent.style.display = 'block';
}

async function loadDemoKnowledge() {
  try {
    const res = await fetchAuth('/api/super/demo-bot/config');
    if (!res.ok) throw new Error('Failed to load demo bot config');
    const config = await res.json();
    
    demoFaqs = config.faqs || [];
    
    const countLabel = document.getElementById('dbot-faq-count');
    countLabel.textContent = `${demoFaqs.length} chunk(s) trained`;
    
    const mapped = demoFaqs.map((faq, originalIndex) => ({ faq, originalIndex }));
    
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

    document.getElementById('dbot-count-url').textContent = urlChunks.length;
    document.getElementById('dbot-count-pdf').textContent = pdfChunks.length;
    document.getElementById('dbot-count-text').textContent = textChunks.length;

    // Render URL chunks
    const listUrl = document.getElementById('dbot-faq-list-url');
    if (urlChunks.length === 0) {
      listUrl.innerHTML = `<div style="padding:24px; text-align:center; color:#94a3b8; font-size:13px; background:#fafafa; border-radius:8px;">🌐 No website URL knowledge trained yet. Enter a URL above to scrape.</div>`;
    } else {
      listUrl.innerHTML = urlChunks.map(item => {
        const faq = item.faq;
        const idx = item.originalIndex;
        return `
          <div style="padding:14px; background:#faf5ff; border:1px solid #f3e8ff; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                <span style="font-size:10px; background:#f3e8ff; color:#6b21a8; font-weight:700; padding:2px 6px; border-radius:4px;">WEBSITE</span>
                <div style="font-weight:700; font-size:12.5px; color:#1e293b;">${escapeHtml(faq.question)}</div>
              </div>
              <div style="font-size:12px; color:#475569; line-height:1.5; white-space:pre-wrap;">${escapeHtml(faq.answer)}</div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button class="btn-sm btn-sm-view" onclick="editDemoKnowledgeChunk(${idx})" style="padding: 4px 8px; font-size: 11px;">✏️ Edit</button>
              <button class="flow-node-btn delete" onclick="deleteDemoKnowledgeChunk(${idx})" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render PDF chunks
    const listPdf = document.getElementById('dbot-faq-list-pdf');
    if (pdfChunks.length === 0) {
      listPdf.innerHTML = `<div style="padding:24px; text-align:center; color:#94a3b8; font-size:13px; background:#fafafa; border-radius:8px;">📄 No PDF document knowledge trained yet. Upload a PDF file above.</div>`;
    } else {
      listPdf.innerHTML = pdfChunks.map(item => {
        const faq = item.faq;
        const idx = item.originalIndex;
        return `
          <div style="padding:14px; background:#f0f9ff; border:1px solid #e0f2fe; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                <span style="font-size:10px; background:#e0f2fe; color:#0369a1; font-weight:700; padding:2px 6px; border-radius:4px;">PDF</span>
                <div style="font-weight:700; font-size:12.5px; color:#1e293b;">${escapeHtml(faq.question)}</div>
              </div>
              <div style="font-size:12px; color:#475569; line-height:1.5; white-space:pre-wrap;">${escapeHtml(faq.answer)}</div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button class="btn-sm btn-sm-view" onclick="editDemoKnowledgeChunk(${idx})" style="padding: 4px 8px; font-size: 11px;">✏️ Edit</button>
              <button class="flow-node-btn delete" onclick="deleteDemoKnowledgeChunk(${idx})" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Paste Text chunks
    const listText = document.getElementById('dbot-faq-list-text');
    if (textChunks.length === 0) {
      listText.innerHTML = `<div style="padding:24px; text-align:center; color:#94a3b8; font-size:13px; background:#fafafa; border-radius:8px;">📝 No pasted text knowledge trained yet. Paste raw text above.</div>`;
    } else {
      listText.innerHTML = textChunks.map(item => {
        const faq = item.faq;
        const idx = item.originalIndex;
        return `
          <div style="padding:14px; background:#f0fdf4; border:1px solid #dcfce7; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                <span style="font-size:10px; background:#dcfce7; color:#15803d; font-weight:700; padding:2px 6px; border-radius:4px;">PASTED TEXT</span>
                <div style="font-weight:700; font-size:12.5px; color:#1e293b;">${escapeHtml((faq.question || '').replace('[Manual Entry] ', '').replace('[Manual Entry]', '').replace('[Text Training] ', '').replace('[Text Training]', ''))}</div>
              </div>
              <div style="font-size:12px; color:#475569; line-height:1.5; white-space:pre-wrap;">${escapeHtml(faq.answer)}</div>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
              <button class="btn-sm btn-sm-view" onclick="editDemoKnowledgeChunk(${idx})" style="padding: 4px 8px; font-size: 11px;">✏️ Edit</button>
              <button class="flow-node-btn delete" onclick="deleteDemoKnowledgeChunk(${idx})" style="padding: 4px 8px; font-size: 11px;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load demo knowledge:', err);
  }
}

let editingFaqIndex = null;

function editDemoKnowledgeChunk(index) {
  const faq = demoFaqs[index];
  if (!faq) return;

  editingFaqIndex = index;
  
  // Load current values
  document.getElementById('dbot-kb-text').value = faq.answer;
  
  // Show title input and load current title
  document.getElementById('dbot-kb-title-group').style.display = 'block';
  document.getElementById('dbot-kb-title').value = faq.question;
  
  // Modify button text
  document.getElementById('dbot-btn-train').textContent = '💾 Save Changes';
  document.getElementById('dbot-btn-cancel-edit').style.display = 'inline-block';
  
  // Scroll to textarea smoothly
  document.getElementById('dbot-kb-text').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.getElementById('dbot-kb-text').focus();
}

function cancelDemoEdit() {
  editingFaqIndex = null;
  document.getElementById('dbot-kb-text').value = '';
  document.getElementById('dbot-kb-title').value = '';
  
  document.getElementById('dbot-kb-title-group').style.display = 'none';
  document.getElementById('dbot-btn-train').textContent = '➕ Train with Text';
  document.getElementById('dbot-btn-cancel-edit').style.display = 'none';
}

async function deleteDemoKnowledgeChunk(index) {
  if (!confirm('Are you sure you want to delete this knowledge chunk?')) return;
  
  if (editingFaqIndex === index) {
    cancelDemoEdit();
  } else if (editingFaqIndex !== null && index < editingFaqIndex) {
    editingFaqIndex--;
  }
  
  demoFaqs.splice(index, 1);
  
  // Re-index remaining manual entry section titles so there are no numbering gaps
  demoFaqs.forEach((faq, i) => {
    if (faq.question && faq.question.includes('Section')) {
      faq.question = `[Manual Entry] Section ${i + 1}`;
    }
  });
  
  await saveDemoFaqsArray();
  loadDemoKnowledge();
}

async function clearAllDemoKnowledge() {
  if (!confirm('Delete ALL trained knowledge chunks? This cannot be undone.')) return;
  cancelDemoEdit();
  demoFaqs = [];
  await saveDemoFaqsArray();
  loadDemoKnowledge();
}

async function saveDemoFaqsArray() {
  try {
    const res = await fetchAuth('/api/super/demo-bot/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        faqs: demoFaqs
      })
    });
    if (!res.ok) alert('Failed to save knowledge base.');
  } catch (err) {
    console.error(err);
    alert('Network error saving knowledge base.');
  }
}

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

async function trainDemoText() {
  const btn = document.getElementById('dbot-btn-train');
  const originalText = btn ? btn.innerHTML : '➕ Train with Text';
  
  const text = document.getElementById('dbot-kb-text').value.trim();
  const status = document.getElementById('dbot-text-status');
  status.textContent = ''; status.style.color = 'inherit';
  
  if (!text) return alert('Please enter some text to train.');
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-radius:50%; border-top-color:transparent; animation:dbotSpin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span> Training...`;
  }
  
  try {
    if (editingFaqIndex !== null) {
      const newTitle = document.getElementById('dbot-kb-title').value.trim() || `[Manual Entry] Section ${editingFaqIndex + 1}`;
      const minimized = minimizeText(text);
      demoFaqs[editingFaqIndex] = { question: newTitle, answer: minimized };
      await saveDemoFaqsArray();
      status.textContent = `✅ Successfully updated knowledge chunk!`;
      status.style.color = '#10b981';
      cancelDemoEdit();
      loadDemoKnowledge();
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
      status.textContent = '❌ Text is too short to train.';
      status.style.color = '#ef4444';
      return;
    }
    
    const newFaqs = usefulChunks.map((chunk, i) => {
      let question = `[Manual Entry] Section ${demoFaqs.length + i + 1}`;
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
    
    demoFaqs = [...demoFaqs, ...newFaqs];
    await saveDemoFaqsArray();
    
    document.getElementById('dbot-kb-text').value = '';
    status.textContent = `✅ Successfully trained with ${newFaqs.length} chunk(s)!`;
    status.style.color = '#10b981';
    loadDemoKnowledge();
  } catch (err) {
    status.textContent = '❌ Training failed.';
    status.style.color = '#ef4444';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

async function trainDemoUrl() {
  const btn = document.getElementById('dbot-btn-train-url');
  const originalText = btn ? btn.innerHTML : 'Train';
  
  const urlInput = document.getElementById('dbot-kb-url');
  const url = urlInput.value.trim();
  const status = document.getElementById('dbot-url-status');
  status.textContent = '⏳ Scraping and training...';
  status.style.color = '#4f46e5';
  
  if (!url) return alert('Please enter a valid URL.');
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner" style="display:inline-block; width:12px; height:12px; border:2px solid #fff; border-radius:50%; border-top-color:transparent; animation:dbotSpin 0.6s linear infinite; margin-right:6px; vertical-align:middle;"></span> Scraping...`;
  }
  
  try {
    const res = await fetchAuth('/api/super/demo-bot/knowledge/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (res.ok) {
      status.textContent = `✅ Successfully trained! Added ${data.added} chunk(s) from website.`;
      status.style.color = '#10b981';
      urlInput.value = '';
      loadDemoKnowledge();
    } else {
      status.textContent = `❌ ${data.error || 'Failed to scrape URL'}`;
      status.style.color = '#ef4444';
    }
  } catch (err) {
    status.textContent = '❌ Network error.';
    status.style.color = '#ef4444';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }
}

// PDF listener
document.getElementById('dbot-pdf-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const status = document.getElementById('dbot-pdf-status');
  if (!file) return;
  
  if (file.size > 10 * 1024 * 1024) {
    alert('PDF size is too large. Max 10MB.');
    return;
  }
  
  const dropzone = document.getElementById('dbot-pdf-dropzone');
  const originalDropzoneHtml = dropzone ? dropzone.innerHTML : '';
  if (dropzone) {
    dropzone.style.pointerEvents = 'none';
    dropzone.innerHTML = `
      <div class="spinner" style="display:inline-block; width:28px; height:28px; border:3px solid #0ea5e9; border-radius:50%; border-top-color:transparent; animation:dbotSpin 0.6s linear infinite; margin-bottom:8px;"></div>
      <div style="font-size:13px; font-weight:600; color:#0ea5e9;">Processing PDF...</div>
    `;
  }
  
  status.textContent = '⏳ Processing PDF...';
  status.style.color = '#4f46e5';
  
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result;
    try {
      const res = await fetchAuth('/api/super/demo-bot/knowledge/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64
        })
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = `✅ Successfully trained! Added ${data.added} chunk(s) from PDF.`;
        status.style.color = '#10b981';
        loadDemoKnowledge();
      } else {
        status.textContent = `❌ ${data.error || 'Failed to parse PDF'}`;
        status.style.color = '#ef4444';
      }
    } catch (err) {
      status.textContent = '❌ Network error.';
      status.style.color = '#ef4444';
    } finally {
      if (dropzone) {
        dropzone.style.pointerEvents = 'auto';
        dropzone.innerHTML = originalDropzoneHtml;
      }
    }
  };
  reader.readAsDataURL(file);
});
