const listings = window.TEXAS_HOME_LISTINGS || [];
const engagement = window.THHPropertyEngagement;
const grid = document.getElementById('listingsGrid');
const resultsCount = document.getElementById('resultsCount');
const emptyState = document.getElementById('emptyState');
const form = document.getElementById('listingFilters');
const sortSelect = document.getElementById('sortBy');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
let savedIds = [];

function propertyCard(item) {
  const saved = savedIds.includes(item.id);
  return `<article class="listing-card"><div class="listing-image-wrap"><img src="${item.image}" alt="${item.title} in ${item.city}, Texas" loading="lazy"><span class="listing-status">${item.status}</span><button class="save-button${saved ? ' saved' : ''}" type="button" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${item.title}" data-save-id="${item.id}">${saved ? '♥' : '♡'}</button></div><div class="listing-body"><p class="listing-price">${money.format(item.price)}</p><h2>${item.title}</h2><p class="listing-location">${item.city}, TX ${item.zip}</p><div class="listing-facts"><span>${item.beds} beds</span><span>${item.baths} baths</span><span>${item.sqft.toLocaleString('en-US')} sq. ft.</span></div><div class="listing-card-footer"><span>${item.type}</span><a href="listing-details.html?id=${item.id}">View Details →</a></div></div></article>`;
}

function getFilteredListings() {
  const data = new FormData(form);
  const query = String(data.get('location') || '').trim().toLowerCase();
  const minPrice = Number(data.get('minPrice') || 0);
  const maxPrice = Number(data.get('maxPrice') || Infinity);
  const beds = Number(data.get('beds') || 0);
  const type = String(data.get('type') || '');
  const filtered = listings.filter((item) => (!query || `${item.title} ${item.city} ${item.zip}`.toLowerCase().includes(query)) && item.price >= minPrice && item.price <= maxPrice && item.beds >= beds && (!type || item.type === type));
  if (sortSelect.value === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (sortSelect.value === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (sortSelect.value === 'beds') filtered.sort((a, b) => b.beds - a.beds);
  return filtered;
}

function renderListings() {
  const filtered = getFilteredListings();
  resultsCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'home' : 'homes'} found`;
  grid.innerHTML = filtered.map(propertyCard).join('');
  emptyState.hidden = filtered.length > 0;
}

form.addEventListener('input', renderListings);
form.addEventListener('change', renderListings);
sortSelect.addEventListener('change', renderListings);
form.addEventListener('reset', () => setTimeout(renderListings));
grid.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-save-id]');
  if (!button) return;
  button.disabled = true;
  try {
    const isSaved = await engagement.toggleSaved(Number(button.dataset.saveId));
    savedIds = isSaved ? [...new Set([...savedIds, Number(button.dataset.saveId)])] : savedIds.filter((id) => id !== Number(button.dataset.saveId));
    renderListings();
  } catch (error) {
    console.error(error);
    button.disabled = false;
  }
});

(async function initializeListings() {
  try { savedIds = await engagement.getSavedIds(); } catch (error) { console.error(error); }
  renderListings();
})();