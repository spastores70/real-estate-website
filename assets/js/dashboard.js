document.addEventListener('DOMContentLoaded', initializeDashboard);

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

const roleJourneys = {
  buyer: {
    title: 'Your buyer roadmap',
    message: 'Keep your favorite homes organized and move from discovery to a confident offer.',
    steps: ['Build a focused shortlist', 'Schedule private property tours', 'Review financing and affordability', 'Prepare a competitive offer strategy']
  },
  seller: {
    title: 'Your seller roadmap',
    message: 'Prepare your property, understand its position, and plan a strong market launch.',
    steps: ['Request a personalized home-value review', 'Complete the seller preparation checklist', 'Build the marketing and showing plan', 'Review offers and closing milestones']
  },
  investor: {
    title: 'Your investor roadmap',
    message: 'Compare opportunities with a disciplined acquisition and return-analysis process.',
    steps: ['Define target markets and property types', 'Save promising investment properties', 'Review cash flow and financing assumptions', 'Schedule due-diligence tours']
  },
  homeowner: {
    title: 'Your homeowner roadmap',
    message: 'Protect your property, track long-term goals, and stay ready for your next move.',
    steps: ['Organize important home documents', 'Plan seasonal maintenance', 'Review estimated value and equity', 'Update insurance and future-move goals']
  }
};

async function initializeDashboard() {
  const gate = document.getElementById('dashboardGate');
  const app = document.getElementById('dashboardApp');
  const client = window.THHPropertyEngagement?.getClient?.();

  if (!client) {
    gate.innerHTML = '<div class="protected-message"><h1>Supabase is not configured</h1><p>Add your project URL and public anon key before using protected accounts.</p><a class="btn btn-primary" href="login.html">Return to sign in</a></div>';
    return;
  }

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    if (!session) {
      window.location.href = `login.html?next=${encodeURIComponent('dashboard.html')}`;
      return;
    }

    gate.hidden = true;
    app.hidden = false;
    setupNavigation();
    setupSignOut(client);
    await loadDashboard(client, session.user);
  } catch (error) {
    console.error(error);
    gate.innerHTML = '<div class="protected-message"><h1>Dashboard unavailable</h1><p>We could not load your account. Please sign in again.</p><a class="btn btn-primary" href="login.html">Sign In</a></div>';
  }
}

function setupNavigation() {
  const nav = document.getElementById('dashboardNav');
  const mobileButton = document.getElementById('dashboardMenuButton');

  mobileButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    mobileButton.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-panel]');
    if (!button) return;
    activatePanel(button.dataset.panel);
    if (window.innerWidth <= 760) {
      nav.classList.remove('open');
      mobileButton.setAttribute('aria-expanded', 'false');
    }
  });
}

function activatePanel(panelName) {
  document.querySelectorAll('[data-panel-content]').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panelContent === panelName);
  });
  document.querySelectorAll('.dashboard-nav-button[data-panel]').forEach((button) => {
    button.classList.toggle('active', button.dataset.panel === panelName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupSignOut(client) {
  document.getElementById('signOutButton').addEventListener('click', async () => {
    await client.auth.signOut();
    window.location.href = 'login.html';
  });
}

async function loadDashboard(client, user) {
  const listings = window.TEXAS_HOME_LISTINGS || [];
  const [profileResult, savedResult, showingResult] = await Promise.all([
    client.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    client.from('saved_properties').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    client.from('showing_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  ]);

  const profile = profileResult.data || {
    full_name: user.user_metadata?.full_name || '',
    phone: user.user_metadata?.phone || '',
    primary_role: user.user_metadata?.role || 'buyer',
    email: user.email
  };

  const savedRows = savedResult.data || [];
  const showingRows = showingResult.data || [];
  const savedListings = savedRows
    .map((row) => listings.find((listing) => Number(listing.id) === Number(row.property_id)))
    .filter(Boolean);

  populateIdentity(profile, user);
  populateStats(savedListings, showingRows);
  renderSavedHomes(savedListings, client, user.id);
  renderShowingHistory(showingRows);
  renderJourney(profile.primary_role || 'buyer');
  setupProfileForm(client, user, profile);
}

function populateIdentity(profile, user) {
  const fullName = profile.full_name || user.email?.split('@')[0] || 'Homeowner';
  const email = user.email || profile.email || '';
  const role = profile.primary_role || 'buyer';
  const initials = fullName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TH';

  document.getElementById('welcomeName').textContent = fullName.split(' ')[0];
  document.getElementById('sidebarName').textContent = fullName;
  document.getElementById('sidebarEmail').textContent = email;
  document.getElementById('dashboardAvatar').textContent = initials;
  document.getElementById('roleBadge').textContent = role;
  document.getElementById('overviewMessage').textContent = roleJourneys[role]?.message || roleJourneys.buyer.message;
}

function populateStats(savedListings, showings) {
  document.getElementById('savedCount').textContent = savedListings.length;
  document.getElementById('showingCount').textContent = showings.length;
  document.getElementById('confirmedCount').textContent = showings.filter((item) => ['confirmed', 'completed'].includes(String(item.status || '').toLowerCase())).length;
}

function savedCard(item) {
  return `<article class="saved-card" data-saved-card="${item.id}">
    <img src="${item.image}" alt="${item.title} in ${item.city}, Texas" loading="lazy">
    <div class="saved-card-body">
      <p class="saved-card-price">${money.format(item.price)}</p>
      <h3>${item.title}</h3>
      <p>${item.city}, TX ${item.zip}</p>
      <p>${item.beds} beds · ${item.baths} baths · ${item.sqft.toLocaleString('en-US')} sq. ft.</p>
      <div class="saved-card-actions">
        <a href="listing-details.html?id=${item.id}">View details →</a>
        <button class="remove-saved" type="button" data-remove-saved="${item.id}">Remove</button>
      </div>
    </div>
  </article>`;
}

function renderSavedHomes(savedListings, client, userId) {
  const fullGrid = document.getElementById('savedHomesGrid');
  const overviewGrid = document.getElementById('overviewSaved');
  const empty = '<div class="dashboard-empty"><h3>No saved homes yet</h3><p>Browse Texas homes and use the heart button to build your shortlist.</p><a class="btn btn-primary" href="listings.html">Search Homes</a></div>';

  fullGrid.innerHTML = savedListings.length ? savedListings.map(savedCard).join('') : empty;
  overviewGrid.innerHTML = savedListings.length ? savedListings.slice(0, 2).map(savedCard).join('') : empty;

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-remove-saved]');
    if (!button || button.disabled) return;
    button.disabled = true;
    const propertyId = Number(button.dataset.removeSaved);
    const { error } = await client.from('saved_properties').delete().eq('user_id', userId).eq('property_id', propertyId);
    if (error) {
      console.error(error);
      button.disabled = false;
      return;
    }
    document.querySelectorAll(`[data-saved-card="${propertyId}"]`).forEach((card) => card.remove());
    const current = Number(document.getElementById('savedCount').textContent || 0);
    document.getElementById('savedCount').textContent = Math.max(0, current - 1);
    if (!document.querySelector('#savedHomesGrid .saved-card')) fullGrid.innerHTML = empty;
    if (!document.querySelector('#overviewSaved .saved-card')) overviewGrid.innerHTML = empty;
  }, { once: false });
}

function renderShowingHistory(showings) {
  const container = document.getElementById('showingHistory');
  if (!showings.length) {
    container.innerHTML = '<div class="dashboard-empty"><h3>No showing requests yet</h3><p>Open any property and request a preferred date and time.</p><a class="btn btn-primary" href="listings.html">Explore Homes</a></div>';
    return;
  }

  container.innerHTML = showings.map((item) => {
    const date = item.preferred_date ? new Date(`${item.preferred_date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date pending';
    const status = String(item.status || 'new').toLowerCase();
    return `<article class="showing-item">
      <div><h3>${item.property_title || `Property #${item.property_id}`}</h3><p>${item.message || 'Private tour request'}</p></div>
      <div><strong>${date}</strong><p>${item.preferred_time || 'Time pending'}</p></div>
      <span class="status-pill ${status}">${status}</span>
    </article>`;
  }).join('');
}

function journeyMarkup(role) {
  const journey = roleJourneys[role] || roleJourneys.buyer;
  return `<p class="eyebrow light">Personalized for your goals</p><h2>${journey.title}</h2><p>${journey.message}</p><div class="journey-steps">${journey.steps.map((step, index) => `<div class="journey-step"><span>${index + 1}</span><div>${step}</div></div>`).join('')}</div>`;
}

function renderJourney(role) {
  document.getElementById('overviewJourney').innerHTML = journeyMarkup(role);
  document.getElementById('journeyPanel').innerHTML = journeyMarkup(role);
}

function setupProfileForm(client, user, profile) {
  const form = document.getElementById('profileForm');
  const status = document.getElementById('profileStatus');
  const saveButton = document.getElementById('saveProfileButton');

  document.getElementById('profileName').value = profile.full_name || '';
  document.getElementById('profilePhone').value = profile.phone || '';
  document.getElementById('profileEmail').value = user.email || '';
  document.getElementById('profileRole').value = profile.primary_role || 'buyer';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveButton.disabled = true;
    status.className = 'dashboard-status';
    status.textContent = 'Saving your profile...';

    const data = Object.fromEntries(new FormData(form));
    const payload = {
      id: user.id,
      email: user.email,
      full_name: String(data.full_name || '').trim(),
      phone: String(data.phone || '').trim(),
      primary_role: data.primary_role,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error(error);
      status.textContent = error.message || 'Unable to save your profile.';
      saveButton.disabled = false;
      return;
    }

    await client.auth.updateUser({ data: { full_name: payload.full_name, phone: payload.phone, role: payload.primary_role } });
    populateIdentity(payload, user);
    renderJourney(payload.primary_role);
    status.className = 'dashboard-status success';
    status.textContent = 'Your profile has been updated.';
    saveButton.disabled = false;
  });
}