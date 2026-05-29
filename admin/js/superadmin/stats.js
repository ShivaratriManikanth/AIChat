async function loadClients() {
  try {
    const res = await fetchAuth('/api/super/clients');
    if (!res.ok) throw new Error('Failed');
    const clients = await res.json();

    document.getElementById('statTotal').textContent = clients.length;
    const active = clients.filter(c => c.payment_status === 'active' || c.payment_status === 'COD_PENDING' || c.payment_status === 'PAID').length;
    document.getElementById('statActive').textContent = active;
    const planMap = {}; PLANS.forEach(p => planMap[p.id] = p);
    const rev = clients.filter(c => c.payment_status === 'active' || c.payment_status === 'COD_PENDING' || c.payment_status === 'PAID')
      .reduce((sum, c) => sum + ((planMap[c.plan_id] || {}).price || 0), 0);
    document.getElementById('statRevenue').textContent = '₹' + rev.toLocaleString();

    if (clients.length === 0) {
      document.getElementById('clientTable').innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="icon">🏢</span>No clients yet.</div></td></tr>`;
      return;
    }

    const planMap2 = {}; PLANS.forEach(p => planMap2[p.id] = p);
    document.getElementById('clientTable').innerHTML = clients.map(c => {
      const plan = planMap2[c.plan_id] || planMap2[1] || { name: 'Basic', duration: '1 Month' };
      const planName = plan.name || 'Basic';
      const planBadge = planBadgeClass(c.plan_id);
      const statusBadge = (c.payment_status === 'active' || c.payment_status === 'COD_PENDING' || c.payment_status === 'PAID') ? 'badge-active' : 'badge-inactive';
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : '–';
      
      let remainingText = '';
      const isActiveStatus = (c.payment_status === 'active' || c.payment_status === 'COD_PENDING' || c.payment_status === 'PAID');
      if (c.created_at && plan.duration && isActiveStatus) {
        const createdDate = new Date(c.created_at);
        const expiryDate = new Date(createdDate);
        if (plan.duration.includes('Month')) {
          const months = parseInt(plan.duration) || 1;
          expiryDate.setMonth(expiryDate.getMonth() + months);
        } else if (plan.duration.includes('Year')) {
          const years = parseInt(plan.duration) || 1;
          expiryDate.setFullYear(expiryDate.getFullYear() + years);
        }
        
        const diffTime = expiryDate - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          remainingText = `<span style="font-size:11px;color:#666;margin-left:6px;font-weight:500;white-space:nowrap;">(${diffDays} days left)</span>`;
        } else {
          remainingText = `<span style="font-size:11px;color:#DC2626;margin-left:6px;font-weight:500;white-space:nowrap;">(Expired)</span>`;
        }
      }

      const isHashed = c.password && c.password.startsWith('$2');
      const pwId = 'pw_' + c.id;
      const safePw = (c.password || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const company = (c.company_name || '').replace(/'/g, "&#39;");
      const email = (c.email || '').replace(/'/g, "&#39;");
      return `<tr>
        <td><span class="client-company">${c.company_name || '–'}</span></td>
        <td><span class="client-email">${c.email}</span></td>
        <td><span class="badge ${planBadge}">${planName}</span>${remainingText}</td>
        <td><span class="badge ${statusBadge}">${c.payment_status || 'inactive'}</span></td>
        <td style="color:#888;font-size:13px;">${date}</td>
        <td>
          <span class="mono-pw" id="${pwId}" data-plain="${isHashed ? '' : safePw}" data-hashed="${isHashed}" data-visible="false">••••••••</span>
          <button onclick="togglePw('${pwId}')" style="background:none;border:none;cursor:pointer;font-size:13px;padding:0 4px;" title="Show/hide password">👁️</button>
        </td>
        <td style="display:flex;gap:6px;">
          <button class="btn-sm" style="background:#F3F4F6;color:#333;" onclick="editClient('${c.id}','${email}','${company}', '${c.plan_id}')">Edit</button>
          <button class="btn-sm btn-sm-view" onclick="viewClientDashboard('${c.id}')">View</button>
          <button class="btn-sm btn-sm-danger" onclick="deleteClient('${c.id}')">Delete</button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) {
    document.getElementById('clientTable').innerHTML = `<tr><td colspan="7"><div class="empty-state"><span class="icon">⚠️</span>Failed to load clients.</div></td></tr>`;
  }
}

function togglePw(pwId) {
  const el = document.getElementById(pwId);
  const isVisible = el.dataset.visible === 'true';
  if (isVisible) {
    el.textContent = '••••••••';
    el.dataset.visible = 'false';
  } else {
    if (el.dataset.hashed === 'true') {
      el.textContent = '[hashed — not reversible]';
    } else {
      el.textContent = el.dataset.plain || '(empty)';
    }
    el.dataset.visible = 'true';
  }
}

// Password Strength Real-time Validation for Super Admin
const createReqElements = {
  len: document.getElementById('create-req-len'),
  upper: document.getElementById('create-req-upper'),
  lower: document.getElementById('create-req-lower'),
  number: document.getElementById('create-req-number'),
  special: document.getElementById('create-req-special')
};

const editReqElements = {
  len: document.getElementById('edit-req-len'),
  upper: document.getElementById('edit-req-upper'),
  lower: document.getElementById('edit-req-lower'),
  number: document.getElementById('edit-req-number'),
  special: document.getElementById('edit-req-special')
};

function checkPasswordStrength(password, reqElements) {
  const criteria = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password)
  };

  for (const [key, met] of Object.entries(criteria)) {
    const el = reqElements[key];
    if (el) {
      if (met) {
        el.className = 'valid';
        el.querySelector('.indicator').textContent = '✓';
      } else {
        el.className = 'invalid';
        el.querySelector('.indicator').textContent = '✗';
      }
    }
  }

  return Object.values(criteria).every(Boolean);
}

document.getElementById('clientPassword').addEventListener('input', (e) => {
  const val = e.target.value.trim();
  const reqBox = document.getElementById('createPwRequirements');
  const statusMsg = document.getElementById('createPwStatusMsg');
  if (val) {
    reqBox.style.display = 'block';
    statusMsg.style.display = 'block';
    const isStrong = checkPasswordStrength(val, createReqElements);
    if (isStrong) {
      statusMsg.textContent = '✓ Password meets all strength requirements.';
      statusMsg.style.color = '#16A34A';
    } else {
      statusMsg.textContent = '✗ Password must meet all requirements.';
      statusMsg.style.color = '#DC2626';
    }
  } else {
    reqBox.style.display = 'none';
    statusMsg.style.display = 'none';
  }
});

document.getElementById('editPassword').addEventListener('input', (e) => {
  const val = e.target.value.trim();
  const reqBox = document.getElementById('editPwRequirements');
  const statusMsg = document.getElementById('editPwStatusMsg');
  if (val) {
    reqBox.style.display = 'block';
    statusMsg.style.display = 'block';
    const isStrong = checkPasswordStrength(val, editReqElements);
    if (isStrong) {
      statusMsg.textContent = '✓ Password meets all strength requirements.';
      statusMsg.style.color = '#16A34A';
    } else {
      statusMsg.textContent = '✗ Password must meet all requirements.';
      statusMsg.style.color = '#DC2626';
    }
  } else {
    reqBox.style.display = 'none';
    statusMsg.style.display = 'none';
  }
});

function openOnboardModal() {
  document.getElementById('companyName').value = '';
  document.getElementById('clientEmail').value = '';
  document.getElementById('clientPassword').value = '';
  document.getElementById('clientPassword').type = 'password';
  document.getElementById('createPwRequirements').style.display = 'none';
  document.getElementById('createPwStatusMsg').style.display = 'none';
  const statusMsg = document.getElementById('statusMsg');
  statusMsg.className = ''; statusMsg.style.display = 'none';
  
  // Populate the select dropdown for subscription plans
  const planOptions = PLANS.map(p => `<option value="${p.id}">${p.name} — ₹${p.price}/${p.duration}</option>`).join('');
  document.getElementById('planId').innerHTML = planOptions;
  
  document.getElementById('onboardModal').classList.add('show');
}

function closeOnboardModal() {
  document.getElementById('onboardModal').classList.remove('show');
  document.getElementById('createPwRequirements').style.display = 'none';
  document.getElementById('createPwStatusMsg').style.display = 'none';
}

function toggleOnboardPw() {
  const inp = document.getElementById('clientPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function createClient() {
  const company = document.getElementById('companyName').value.trim();
  const email = document.getElementById('clientEmail').value.trim();
  const planId = document.getElementById('planId').value;
  const password = document.getElementById('clientPassword').value.trim();
  const msg = document.getElementById('statusMsg');
  msg.className = ''; msg.style.display = '';

  if (!company || !email) {
    msg.textContent = '⚠️ Company name and email are required.';
    msg.className = 'error'; return;
  }

  if (password && !checkPasswordStrength(password, createReqElements)) {
    document.getElementById('createPwRequirements').style.display = 'block';
    const createStatus = document.getElementById('createPwStatusMsg');
    createStatus.textContent = '✗ Password must meet all requirements.';
    createStatus.style.color = '#DC2626';
    createStatus.style.display = 'block';
    msg.textContent = '⚠️ Password must meet all requirements.';
    msg.className = 'error'; return;
  }

  const onboardBtn = document.getElementById('onboardSubmitBtn');
  if (onboardBtn) {
    onboardBtn.textContent = 'Creating...';
    onboardBtn.disabled = true;
  }

  try {
    const body = { company_name: company, email, plan_id: planId };
    if (password) body.password = password;

    const res = await fetchAuth('/api/super/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      msg.textContent = `✅ Client "${company}" created! Login email has been dispatched.`;
      msg.className = 'success';
      document.getElementById('companyName').value = '';
      document.getElementById('clientEmail').value = '';
      document.getElementById('clientPassword').value = '';
      document.getElementById('createPwRequirements').style.display = 'none';
      document.getElementById('createPwStatusMsg').style.display = 'none';
      loadClients();
      setTimeout(closeOnboardModal, 2500);
    } else {
      const err = await res.json().catch(() => ({}));
      msg.textContent = '❌ ' + (err.error || 'Failed to create client.');
      msg.className = 'error';
    }
  } catch (e) {
    msg.textContent = '❌ Network error. Please try again.';
    msg.className = 'error';
  } finally {
    if (onboardBtn) {
      onboardBtn.textContent = '🚀 Create Client & Send Email';
      onboardBtn.disabled = false;
    }
  }
}

let currentEditId = null;

function editClient(id, oldEmail, oldCompany, oldPlanId) {
  currentEditId = id;
  document.getElementById('editEmail').value = oldEmail;
  document.getElementById('editCompany').value = oldCompany;
  document.getElementById('editPlanId').value = oldPlanId;
  document.getElementById('editPassword').value = '';
  document.getElementById('editModal').classList.add('show');
}

function viewClientDashboard(clientId) {
  sessionStorage.setItem('impersonate_client_id', clientId);
  localStorage.setItem('impersonate_client_id', clientId);
  window.location.href = '/admin/index.html';
}

function toggleEditPw() {
  const inp = document.getElementById('editPassword');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function closeEditModal() {
  document.getElementById('editModal').classList.remove('show');
  document.getElementById('editPwRequirements').style.display = 'none';
  document.getElementById('editPwStatusMsg').style.display = 'none';
  currentEditId = null;
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
  if (!currentEditId) return;
  const newEmail    = document.getElementById('editEmail').value.trim();
  const newCompany  = document.getElementById('editCompany').value.trim();
  const newPlanId   = document.getElementById('editPlanId').value;
  const newPassword = document.getElementById('editPassword').value.trim();
  const statusMsg   = document.getElementById('editPwStatusMsg');
  
  statusMsg.style.display = 'none';

  if (!newEmail) {
    statusMsg.textContent = '⚠️ Email is required.';
    statusMsg.style.color = '#DC2626';
    statusMsg.style.display = 'block';
    return;
  }

  if (newPassword && !checkPasswordStrength(newPassword, editReqElements)) {
    document.getElementById('editPwRequirements').style.display = 'block';
    statusMsg.textContent = '✗ Password must meet all requirements.';
    statusMsg.style.color = '#DC2626';
    statusMsg.style.display = 'block';
    return;
  }

  const btn = document.getElementById('saveEditBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  try {
    const body = { email: newEmail, company_name: newCompany, plan_id: newPlanId };
    if (newPassword) body.password = newPassword;
    const res = await fetchAuth('/api/super/clients/' + currentEditId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      statusMsg.textContent = '❌ Failed: ' + (err.error || res.statusText);
      statusMsg.style.color = '#DC2626';
      statusMsg.style.display = 'block';
    } else {
      closeEditModal();
      loadClients();
    }
  } catch (err) {
    statusMsg.textContent = '❌ Network error. Please try again.';
    statusMsg.style.color = '#DC2626';
    statusMsg.style.display = 'block';
  } finally {
    btn.textContent = 'Save Changes';
    btn.disabled = false;
  }
});

async function deleteClient(id) {
  if (!confirm('Are you sure you want to delete this client? They will be moved to the Recycle Bin.')) return;
  try {
    const res = await fetchAuth('/api/super/clients/' + id, { method: 'DELETE' });
    if (res.ok) {
      loadClients();
      loadTrashClients();
    } else {
      alert('Failed to delete client.');
    }
  } catch (e) { alert('Network error.'); }
}

async function loadTrashClients() {
  try {
    const res = await fetchAuth('/api/super/trash/clients');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    const clients = data.clients || [];

    if (clients.length === 0) {
      document.getElementById('trashClientTable').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="text-align: center; padding: 30px; color: #888;"><span class="icon" style="font-size: 24px; display: block; margin-bottom: 8px;">🗑️</span>Trash is empty</div></td></tr>`;
      return;
    }

    const planMap2 = {}; PLANS.forEach(p => planMap2[p.id] = p);
    document.getElementById('trashClientTable').innerHTML = clients.map(c => {
      const plan = planMap2[c.plan_id] || planMap2[1] || { name: 'Basic', duration: '1 Month' };
      const planName = plan.name || 'Basic';
      const planBadge = planBadgeClass(c.plan_id);
      const statusBadge = (c.payment_status === 'active' || c.payment_status === 'COD_PENDING' || c.payment_status === 'PAID') ? 'badge-active' : 'badge-inactive';
      const date = c.created_at ? new Date(c.created_at).toLocaleDateString() : '–';
      
      return `<tr>
        <td><span class="client-company" style="font-weight:600; color:#1e293b;">${c.company_name || '–'}</span></td>
        <td><span class="client-email" style="color:#64748b;">${c.email}</span></td>
        <td><span class="badge ${planBadge}">${planName}</span></td>
        <td><span class="badge ${statusBadge}">${c.payment_status || 'inactive'}</span></td>
        <td style="color:#888;font-size:13px;">${date}</td>
        <td style="display:flex;gap:6px;">
          <button class="btn-sm" style="background:#10B981;color:white;cursor:pointer;border:none;border-radius:4px;padding:4px 8px;" onclick="restoreClient('${c.id}')">Restore</button>
          <button class="btn-sm btn-sm-danger" style="background:#EF4444;color:white;cursor:pointer;border:none;border-radius:4px;padding:4px 8px;" onclick="permanentlyDeleteClient('${c.id}')">Permanently Delete</button>
        </td>
      </tr>`;
    }).join('');
  } catch (e) {
    document.getElementById('trashClientTable').innerHTML = `<tr><td colspan="6"><div class="empty-state" style="text-align: center; padding: 30px; color: #DC2626;"><span class="icon" style="font-size: 24px; display: block; margin-bottom: 8px;">⚠️</span>Failed to load trash bin.</div></td></tr>`;
  }
}

async function restoreClient(id) {
  if (!confirm('Are you sure you want to restore this client?')) return;
  try {
    const res = await fetchAuth('/api/super/trash/restore/' + id, { method: 'POST' });
    if (res.ok) {
      alert('Client restored successfully.');
      loadClients();
      loadTrashClients();
    } else {
      alert('Failed to restore client.');
    }
  } catch (err) { alert('Network error.'); }
}

async function permanentlyDeleteClient(id) {
  if (!confirm('WARNING: Are you sure you want to PERMANENTLY delete this client? All of their bots, flows, chats, and leads will be permanently erased. This action CANNOT be undone!')) return;
  try {
    const res = await fetchAuth('/api/super/trash/permanent/' + id, { method: 'DELETE' });
    if (res.ok) {
      alert('Client permanently deleted.');
      loadTrashClients();
    } else {
      alert('Failed to permanently delete client.');
    }
  } catch (err) { alert('Network error.'); }
}
