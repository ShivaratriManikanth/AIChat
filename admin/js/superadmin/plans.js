async function loadPlans() {
  const res = await fetchAuth('/api/super/plans');
  PLANS = await res.json();
  
  const container = document.getElementById('plansContainer');
  if (PLANS.length === 0) {
    container.innerHTML = `<tr><td colspan="4"><div class="empty-state"><span class="icon">📋</span>No subscription plans yet.</div></td></tr>`;
    return;
  }
  
  container.innerHTML = PLANS.map(p => {
    const planBadge = planBadgeClass(p.id);
    const nameEsc = (p.name || '').replace(/'/g, "\\'");
    const durEsc = (p.duration || '').replace(/'/g, "\\'");
    return `
      <tr>
        <td>
          <div class="plan-tag">
            <span class="badge ${planBadge}" style="font-size: 12px; padding: 6px 12px; border-radius: 6px; font-weight:600;">${p.name}</span>
          </div>
        </td>
        <td>
            <strong class="plan-price-val">₹${p.price.toLocaleString()}</strong>
            <span class="plan-price-duration">/mo</span>
        </td>
        <td>
          <span class="badge badge-inactive" style="font-size: 12px; padding: 5px 10px;">⏳ ${p.duration}</span>
        </td>
        <td style="text-align: right; padding-right: 24px;">
          <button class="btn-sm btn-sm-view" onclick="openEditPlanModal(${p.id}, '${nameEsc}', ${p.price}, '${durEsc}')" style="margin-right: 6px;">✏️ Edit</button>
          <button class="btn-sm btn-sm-danger" onclick="deletePlan(${p.id})">🗑️ Delete</button>
        </td>
      </tr>`;
  }).join('');

  // Populate the plan dropdowns
  const planOptions = PLANS.map(p => `<option value="${p.id}">${p.name} — ₹${p.price}/${p.duration}</option>`).join('');
  document.getElementById('planId').innerHTML = planOptions;
  document.getElementById('editPlanId').innerHTML = planOptions;
}

async function deletePlan(id) {
  if (!confirm('Are you sure you want to delete this subscription plan?')) return;
  try {
    const res = await fetchAuth('/api/super/plans/' + id, { method: 'DELETE' });
    if (res.ok) loadPlans();
    else alert('Failed to delete plan.');
  } catch (e) { alert('Network error.'); }
}

function openAddPlanModal() {
  document.getElementById('addPlanName').value = '';
  document.getElementById('addPlanPrice').value = '';
  document.getElementById('addPlanDuration').value = '1 Month';
  document.getElementById('addPlanModal').classList.add('show');
}

function closeAddPlanModal() {
  document.getElementById('addPlanModal').classList.remove('show');
}

async function submitAddPlan() {
  const name = document.getElementById('addPlanName').value.trim();
  const price = document.getElementById('addPlanPrice').value;
  const duration = document.getElementById('addPlanDuration').value;
  if (!name) return alert('Enter a plan name.');
  try {
    const res = await fetchAuth('/api/super/plans', { 
      method: 'POST', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({name, price, duration}) 
    });
    if (res.ok) {
      closeAddPlanModal();
      loadPlans();
    } else {
      alert('Failed to add plan.');
    }
  } catch (err) { alert('Network error.'); }
}

function openEditPlanModal(id, name, price, duration) {
  document.getElementById('editPlanIdField').value = id;
  document.getElementById('editPlanName').value = name;
  document.getElementById('editPlanPrice').value = price;
  document.getElementById('editPlanDuration').value = duration;
  document.getElementById('editPlanModal').classList.add('show');
}

function closeEditPlanModal() {
  document.getElementById('editPlanModal').classList.remove('show');
}

async function submitEditPlan() {
  const id = document.getElementById('editPlanIdField').value;
  const name = document.getElementById('editPlanName').value.trim();
  const price = document.getElementById('editPlanPrice').value;
  const duration = document.getElementById('editPlanDuration').value;
  if (!name) return alert('Plan name cannot be empty.');
  try {
    const res = await fetchAuth('/api/super/plans/' + id, { 
      method: 'PUT', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify({name, price, duration}) 
    });
    if (res.ok) {
      closeEditPlanModal();
      loadPlans(); 
      loadClients();
    } else {
      alert('Failed to save changes.');
    }
  } catch (err) { alert('Network error.'); }
}
