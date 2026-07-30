const listings = window.TEXAS_HOME_LISTINGS || [];
const params = new URLSearchParams(window.location.search);
const requestedId = Number(params.get('id'));
const property = listings.find((item) => item.id === requestedId) || listings[0];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const savedKey = 'texasHomeHubSavedHomes';

function getSavedHomes() {
  try { return JSON.parse(localStorage.getItem(savedKey) || '[]').map(Number); }
  catch { return []; }
}

function saveHomes(ids) { localStorage.setItem(savedKey, JSON.stringify(ids)); }

function imageSet(item) {
  const options = [
    item.image,
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=82',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=82'
  ];
  return [...new Set(options)];
}

function propertyCopy(item) {
  return `Welcome to ${item.title}, a thoughtfully presented ${item.type.toLowerCase()} in ${item.city}, Texas. The home offers ${item.beds} bedrooms, ${item.baths} bathrooms, and approximately ${item.sqft.toLocaleString('en-US')} square feet of comfortable living space. Its flexible layout, inviting gathering areas, and convenient location make it a strong starting point for buyers exploring the area.`;
}

function renderProperty() {
  if (!property) {
    document.getElementById('propertyPage').innerHTML = '<section class="container section"><h1>Property unavailable</h1><p>This property could not be found.</p><a href="listings.html">Return to listings</a></section>';
    return;
  }

  document.title = `${property.title} | Texas Home Hub Pro`;
  document.getElementById('breadcrumbTitle').textContent = property.title;
  document.getElementById('propertyStatus').textContent = property.status;
  document.getElementById('propertyTitle').textContent = property.title;
  document.getElementById('propertyAddress').textContent = `${property.city}, TX ${property.zip}`;
  document.getElementById('propertyPrice').textContent = money.format(property.price);
  document.getElementById('propertyType').textContent = property.type;
  document.getElementById('factBeds').textContent = property.beds;
  document.getElementById('factBaths').textContent = property.baths;
  document.getElementById('factSqft').textContent = property.sqft.toLocaleString('en-US');
  document.getElementById('factYear').textContent = 2018 + (property.id % 7);
  document.getElementById('propertyDescription').textContent = propertyCopy(property);

  document.getElementById('featureList').innerHTML = ['Open-concept living', 'Modern kitchen', 'Primary suite', 'Energy-efficient features', 'Convenient Texas location'].map((feature) => `<span>${feature}</span>`).join('');

  const facts = {
    'Property type': property.type,
    'Status': property.status,
    'Bedrooms': property.beds,
    'Bathrooms': property.baths,
    'Living area': `${property.sqft.toLocaleString('en-US')} sq. ft.`,
    'Year built': 2018 + (property.id % 7),
    'County': property.city === 'Fort Worth' ? 'Tarrant' : property.city === 'Arlington' ? 'Tarrant' : 'Collin / Dallas area',
    'Listing ID': `THH-${String(property.id).padStart(5, '0')}`
  };
  document.getElementById('propertyFacts').innerHTML = Object.entries(facts).map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');

  const images = imageSet(property);
  const mainPhoto = document.getElementById('mainPhoto');
  mainPhoto.src = images[0];
  mainPhoto.alt = `${property.title} exterior`;
  document.getElementById('gallerySide').innerHTML = images.slice(1, 5).map((src, index) => `<button type="button" data-photo="${src}"><img src="${src}" alt="${property.title} interior view ${index + 1}"></button>`).join('');

  document.getElementById('downPayment').value = Math.round(property.price * 0.2 / 1000) * 1000;
  renderSimilarHomes();
  syncSavedButton();
  calculateMortgage();
}

function syncSavedButton() {
  const button = document.getElementById('saveProperty');
  const saved = getSavedHomes().includes(property.id);
  button.classList.toggle('saved', saved);
  button.setAttribute('aria-pressed', String(saved));
  button.textContent = saved ? '♥ Saved Home' : '♡ Save Home';
}

function toggleSavedHome() {
  const ids = getSavedHomes();
  const index = ids.indexOf(property.id);
  if (index >= 0) ids.splice(index, 1); else ids.push(property.id);
  saveHomes(ids);
  syncSavedButton();
}

function calculateMortgage() {
  const down = Math.max(0, Number(document.getElementById('downPayment').value || 0));
  const rate = Math.max(0, Number(document.getElementById('interestRate').value || 0));
  const years = Number(document.getElementById('loanTerm').value || 30);
  const principal = Math.max(0, property.price - down);
  const months = years * 12;
  const monthlyRate = rate / 100 / 12;
  const payment = monthlyRate === 0 ? principal / months : principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  document.getElementById('monthlyPayment').textContent = money.format(Math.round(payment));
  document.getElementById('loanSummary').textContent = `${money.format(principal)} estimated loan · ${rate.toFixed(2)}% · ${years} years`;
}

function renderSimilarHomes() {
  const similar = listings.filter((item) => item.id !== property.id).sort((a, b) => Math.abs(a.price - property.price) - Math.abs(b.price - property.price)).slice(0, 3);
  document.getElementById('similarHomes').innerHTML = similar.map((item) => `<article class="similar-card"><img src="${item.image}" alt="${item.title}" loading="lazy"><div><p>${money.format(item.price)}</p><h3>${item.title}</h3><p>${item.city}, TX · ${item.beds} beds</p><a href="listing-details.html?id=${item.id}">View details →</a></div></article>`).join('');
}

function openPhoto(src) {
  const dialog = document.getElementById('photoDialog');
  document.getElementById('dialogPhoto').src = src;
  if (typeof dialog.showModal === 'function') dialog.showModal();
}

document.getElementById('saveProperty').addEventListener('click', toggleSavedHome);
document.getElementById('mortgageForm').addEventListener('input', calculateMortgage);
document.getElementById('mortgageForm').addEventListener('change', calculateMortgage);
document.getElementById('mainPhotoButton').addEventListener('click', () => openPhoto(document.getElementById('mainPhoto').src));
document.getElementById('gallerySide').addEventListener('click', (event) => { const button = event.target.closest('[data-photo]'); if (button) openPhoto(button.dataset.photo); });
document.getElementById('closeDialog').addEventListener('click', () => document.getElementById('photoDialog').close());
document.getElementById('shareProperty').addEventListener('click', async () => {
  const data = { title: property.title, text: `${property.title} in ${property.city}, Texas`, url: window.location.href };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(window.location.href); alert('Property link copied.'); } } catch (error) { if (error.name !== 'AbortError') console.error(error); }
});

document.getElementById('showingDate').min = new Date().toISOString().split('T')[0];
document.getElementById('showingForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  localStorage.setItem('texasHomeHubLatestShowingRequest', JSON.stringify({ ...data, propertyId: property.id, propertyTitle: property.title, createdAt: new Date().toISOString() }));
  document.getElementById('showingStatus').textContent = 'Your showing request has been recorded. A confirmation workflow will be connected through Supabase.';
  event.currentTarget.reset();
});

renderProperty();