document.addEventListener('DOMContentLoaded', initializeAdminCRM);

let adminClient;
let adminUser;
let crmState = { profiles: [], leads: [], showings: [], saved: [] };

async function initializeAdminCRM() {
  const gate = document.getElementById('adminGate');
  adminClient = window.THHPropertyEngagement?.getClient?.();
  if (!adminClient) {
    gate.innerHTML = '<div><h1>Supabase is not configured</h1><p>Add the project URL and public anon key before opening the CRM.</p><a href="login.html">Return to sign in</a></div>';
    return;
  }

  try {
    const { data: { session }, error } = await adminClient.auth.getSession();
    if (error) throw error;
    if (!session) {
      location.href = `login.html?next=${encodeURIComponent('admin-crm.html')}`;
      return;
    }
    adminUser = session.user;
    const { data: profile, error: profileError } = await adminClient.from('profiles').select('*').eq('id', adminUser.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile || profile.role !== 'admin') {
      gate.innerHTML = '<div><h1>Administrator access required</h1><p>Your account does not have permission to open this workspace.</p><a href="dashboard.html">Open My Dashboard</a></div>';
      return;
    }
    document.getElementById('adminName').textContent = profile.full_name || adminUser.email || 'Administrator';
    gate.hidden = true;
    document.getElementById('adminApp').hidden = false;
    bindAdminEvents();
    await refreshCRM();
  } catch (error) {
    console.error(error);
    gate.innerHTML = '<div><h1>CRM unavailable</h1><p>We could not verify the administrator account or load CRM data.</p><a href="login.html">Sign In Again</a></div>';
  }
}

function bindAdminEvents() {
  document.getElementById('adminSignOut').addEventListener('click', async () => {
    await adminClient.auth.signOut();
    location.href = 'login.html';
  });

  const sidebar = document.getElementById('adminSidebar');
  const menuButton = document.getElementById('adminMenuButton');
  menuButton.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    const panelButton = event.target.closest('[data-admin-panel]');
    if (panelButton) {
      activateAdminPanel(panelButton.dataset.adminPanel);
      sidebar.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }
    const editLead = event.target.closest('[data-edit-lead]');
    if (editLead) openLeadDialog(editLead.dataset.editLead);
    const editShowing = event.target.closest('[data-edit-showing]');
    if (editShowing) openShowingDialog(editShowing.dataset.editShowing);
  });

  ['quickLeadButton', 'addLeadButton'].forEach((id) => document.getElementById(id).addEventListener('click', () => openLeadDialog()));
  document.getElementById('leadForm').addEventListener('submit', saveLead);
  document.getElementById('showingForm').addEventListener('submit', saveShowing);
  ['leadSearch', 'leadStageFilter', 'leadRoleFilter'].forEach((id) => document.getElementById(id).addEventListener('input', renderLeads));
  ['showingSearch', 'showingStatusFilter'].forEach((id) => document.getElementById(id).addEventListener('input', renderShowings));
  ['userSearch', 'userRoleFilter'].forEach((id) => document.getElementById(id).addEventListener('input', renderUsers));
}

function activateAdminPanel(name) {
  document.querySelectorAll('[data-admin-content]').forEach((panel) => panel.classList.toggle('active', panel.dataset.adminContent === name));
  document.querySelectorAll('.admin-sidebar [data-admin-panel]').forEach((button) => button.classList.toggle('active', button.dataset.adminPanel === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function refreshCRM() {
  const [profiles, leads, showings, saved] = await Promise.all([
    adminClient.from('profiles').select('*').order('created_at', { ascending: false }),
    adminClient.from('crm_leads').select('*').order('updated_at', { ascending: false }),
    adminClient.from('showing_requests').select('*').order('created_at', { ascending: false }),
    adminClient.from('saved_properties').select('*')
  ]);
  [profiles, leads, showings, saved].forEach((result) => { if (result.error) throw result.error; });
  crmState = { profiles: profiles.data || [], leads: leads.data || [], showings: showings.data || [], saved: saved.data || [] };
  renderEverything();
}

function renderEverything() {
  renderMetrics();
  renderPipeline();
  renderFollowUps();
  renderRecentShowings();
  renderLeads();
  renderShowings();
  renderUsers();
}

function renderMetrics() {
  const now = new Date();
  const active = crmState.leads.filter((lead) => !['closed', 'lost'].includes(lead.stage));
  const overdue = active.filter((lead) => lead.next_follow_up_at && new Date(lead.next_follow_up_at) < now);
  document.getElementById('metricUsers').textContent = crmState.profiles.length;
  document.getElementById('metricLeads').textContent = active.length;
  document.getElementById('metricShowings').textContent = crmState.showings.filter((item) => item.status === 'new').length;
  document.getElementById('metricOverdue').textContent = overdue.length;
}

function renderPipeline() {
  const stages = ['new', 'contacted', 'qualified', 'touring', 'offer', 'under_contract', 'closed', 'lost'];
  document.getElementById('pipelineSummary').innerHTML = stages.map((stage) => `<div class="pipeline-item"><span>${labelize(stage)}</span><strong>${crmState.leads.filter((lead) => lead.stage === stage).length}</strong></div>`).join('');
}

function renderFollowUps() {
  const upcoming = crmState.leads.filter((lead) => lead.next_follow_up_at).sort((a, b) => new Date(a.next_follow_up_at) - new Date(b.next_follow_up_at)).slice(0, 6);
  document.getElementById('followUpList').innerHTML = upcoming.length ? upcoming.map((lead) => `<div class="compact-item"><div><strong>${escapeHTML(lead.full_name)}</strong><div>${labelize(lead.stage)}</div></div><span>${formatDateTime(lead.next_follow_up_at)}</span></div>`).join('') : '<div class="empty-admin">No follow-ups scheduled.</div>';
}

function renderRecentShowings() {
  const rows = crmState.showings.slice(0, 5);
  document.getElementById('recentShowings').innerHTML = rows.length ? rows.map(showingRow).join('') : '<div class="empty-admin">No showing requests yet.</div>';
}

function renderLeads() {
  const search = document.getElementById('leadSearch').value.trim().toLowerCase();
  const stage = document.getElementById('leadStageFilter').value;
  const role = document.getElementById('leadRoleFilter').value;
  const leads = crmState.leads.filter((lead) => {
    const haystack = `${lead.full_name} ${lead.email || ''} ${lead.phone || ''}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!stage || lead.stage === stage) && (!role || lead.role === role);
  });
  document.getElementById('leadTable').innerHTML = `<div class="crm-row header"><span>Lead</span><span>Journey</span><span>Stage</span><span>Follow-up</span><span>Action</span></div>${leads.length ? leads.map(leadRow).join('') : '<div class="empty-admin">No leads match these filters.</div>'}`;
}

function leadRow(lead) {
  const overdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date() && !['closed', 'lost'].includes(lead.stage);
  return `<div class="crm-row"><div class="crm-person"><strong>${escapeHTML(lead.full_name)}</strong><span>${escapeHTML(lead.email || lead.phone || 'No contact details')}</span></div><span>${labelize(lead.role)}</span><span class="status-chip">${labelize(lead.stage)}</span><span class="${overdue ? 'status-chip overdue' : ''}">${lead.next_follow_up_at ? formatDateTime(lead.next_follow_up_at) : 'Not scheduled'}</span><button class="row-action" data-edit-lead="${lead.id}">Open</button></div>`;
}

function renderShowings() {
  const search = document.getElementById('showingSearch').value.trim().toLowerCase();
  const status = document.getElementById('showingStatusFilter').value;
  const rows = crmState.showings.filter((item) => {
    const haystack = `${item.property_title || ''} ${item.full_name || ''} ${item.email || ''}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!status || item.status === status);
  });
  document.getElementById('showingTable').innerHTML = `<div class="crm-row header"><span>Customer / Property</span><span>Date</span><span>Status</span><span>Follow-up</span><span>Action</span></div>${rows.length ? rows.map(showingRow).join('') : '<div class="empty-admin">No showing requests match these filters.</div>'}`;
}

function showingRow(item) {
  return `<div class="crm-row"><div class="crm-person"><strong>${escapeHTML(item.full_name || 'Website visitor')}</strong><span>${escapeHTML(item.property_title || `Property #${item.property_id}`)}</span></div><span>${formatDate(item.preferred_date)} · ${escapeHTML(item.preferred_time || '')}</span><span class="status-chip">${labelize(item.status || 'new')}</span><span>${item.next_follow_up_at ? formatDateTime(item.next_follow_up_at) : 'Not scheduled'}</span><button class="row-action" data-edit-showing="${item.id}">Manage</button></div>`;
}

function renderUsers() {
  const search = document.getElementById('userSearch').value.trim().toLowerCase();
  const role = document.getElementById('userRoleFilter').value;
  const users = crmState.profiles.filter((profile) => {
    const haystack = `${profile.full_name || ''} ${profile.email || ''} ${profile.phone || ''}`.toLowerCase();
    return (!search || haystack.includes(search)) && (!role || profile.role === role);
  });
  document.getElementById('userTable').innerHTML = `<div class="crm-row header"><span>User</span><span>Role</span><span>Saved homes</span><span>Joined</span><span></span></div>${users.length ? users.map((profile) => `<div class="crm-row"><div class="crm-person"><strong>${escapeHTML(profile.full_name || 'Unnamed user')}</strong><span>${escapeHTML(profile.email || profile.phone || '')}</span></div><span class="status-chip">${labelize(profile.role)}</span><span>${crmState.saved.filter((item) => item.user_id === profile.id).length}</span><span>${formatDate(profile.created_at)}</span><span></span></div>`).join('') : '<div class="empty-admin">No users match these filters.</div>'}`;
}

function openLeadDialog(id = '') {
  const dialog = document.getElementById('leadDialog');
  const form = document.getElementById('leadForm');
  form.reset();
  document.getElementById('leadFormStatus').textContent = '';
  const lead = crmState.leads.find((item) => item.id === id);
  document.getElementById('leadDialogTitle').textContent = lead ? 'Edit lead' : 'Add lead';
  if (lead) {
    form.elements.id.value = lead.id;
    form.elements.full_name.value = lead.full_name || '';
    form.elements.email.value = lead.email || '';
    form.elements.phone.value = lead.phone || '';
    form.elements.role.value = lead.role || 'buyer';
    form.elements.stage.value = lead.stage || 'new';
    form.elements.next_follow_up_at.value = toLocalInput(lead.next_follow_up_at);
  }
  dialog.showModal();
}

async function saveLead(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('leadFormStatus');
  const data = Object.fromEntries(new FormData(form));
  const payload = { full_name: data.full_name.trim(), email: data.email.trim() || null, phone: data.phone.trim() || null, role: data.role, stage: data.stage, next_follow_up_at: data.next_follow_up_at ? new Date(data.next_follow_up_at).toISOString() : null };
  status.textContent = 'Saving...';
  const result = data.id ? await adminClient.from('crm_leads').update(payload).eq('id', data.id).select().single() : await adminClient.from('crm_leads').insert(payload).select().single();
  if (result.error) { status.textContent = result.error.message; return; }
  if (data.note.trim()) await adminClient.from('crm_notes').insert({ lead_id: result.data.id, author_id: adminUser.id, body: data.note.trim() });
  status.className = 'form-status success';
  status.textContent = 'Lead saved.';
  await refreshCRM();
  setTimeout(() => document.getElementById('leadDialog').close(), 350);
}

function openShowingDialog(id) {
  const item = crmState.showings.find((row) => row.id === id);
  if (!item) return;
  const form = document.getElementById('showingForm');
  form.reset();
  form.elements.id.value = item.id;
  form.elements.status.value = item.status || 'new';
  form.elements.next_follow_up_at.value = toLocalInput(item.next_follow_up_at);
  form.elements.internal_notes.value = item.internal_notes || '';
  document.getElementById('showingDialogTitle').textContent = item.property_title || 'Manage showing';
  document.getElementById('showingDetails').innerHTML = `<strong>${escapeHTML(item.full_name)}</strong><br>${escapeHTML(item.email)} · ${escapeHTML(item.phone)}<br>${formatDate(item.preferred_date)} · ${escapeHTML(item.preferred_time)}${item.message ? `<br><br>${escapeHTML(item.message)}` : ''}`;
  document.getElementById('showingFormStatus').textContent = '';
  document.getElementById('showingDialog').showModal();
}

async function saveShowing(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = document.getElementById('showingFormStatus');
  const data = Object.fromEntries(new FormData(form));
  status.textContent = 'Updating...';
  const { error } = await adminClient.from('showing_requests').update({ status: data.status, next_follow_up_at: data.next_follow_up_at ? new Date(data.next_follow_up_at).toISOString() : null, internal_notes: data.internal_notes.trim() || null, assigned_to: adminUser.id }).eq('id', data.id);
  if (error) { status.textContent = error.message; return; }
  status.className = 'form-status success';
  status.textContent = 'Showing request updated.';
  await refreshCRM();
  setTimeout(() => document.getElementById('showingDialog').close(), 350);
}

function labelize(value = '') { return String(value).replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()); }
function formatDate(value) { if (!value) return 'Not scheduled'; const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function formatDateTime(value) { if (!value) return 'Not scheduled'; return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function toLocalInput(value) { if (!value) return ''; const date = new Date(value); const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16); }
function escapeHTML(value = '') { const div = document.createElement('div'); div.textContent = String(value); return div.innerHTML; }
