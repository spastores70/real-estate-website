const listings = window.TEXAS_HOME_LISTINGS || [];
const grid = document.getElementById('listingsGrid');
const resultsCount = document.getElementById('resultsCount');
const emptyState = document.getElementById('emptyState');
const form = document.getElementById('listingFilters');
const sortSelect = document.getElementById('sortBy');

const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0
});

function propertyCard(item) {
  return `<article class="listing-card">
    <div class="listing-image-wrap">
      <img src="${item.image}" alt="${item.title} in ${item.city}, Texas" loading="lazy">
      <span class="listing-status">${item.status}</span>
      <button class="save-button" type="button" aria-label="Save ${item.title}" data-save-id="${item.id}">♡</button>
    </div>
    <div class="listing-body">
      <p class="listing-price">${money.format(item.price)}</p>
      <h2>${item.title}</h2>
      <p class="listing-location">${item.city}, TX ${item.zip}</p>
      <div class="listing-facts"><span>${item.beds} beds</span><span>${item.baths} baths</span><span>${item.sqft.toLocaleString('en-US')} sq. ft.</span></div>
      <div class="listing-card-footer"><span>${item.type}</span><a href="listing-details.html?id=${item.id}">View Details →</a></div>
    </div>
  </article>`;
}

function getFilteredListings() {
  const data = new FormData(form);
  const query = String(data.get('location') || '').trim().toLowerCase();
  const minPrice = Number(data.get('minPrice') || 0);
  const maxPrice = Number(data.get('maxPrice') || Infinity);
  const beds = Number(data.get('beds') || 0);
  const type = String(data.get('type') || '');

  const filtered = listings.filter((item) => {
    const locationMatch = !query || `${item.title} ${item.city} ${item.zip}`.toLowerCase().includes(query);
    return locationMatch && item.price >= minPrice && item.price <= maxPrice && item.beds >= beds && (!type || item.type === type);
  });

  const sort = sortSelect.value;
  if (sort === 'price-low') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-high') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'beds') filtered.sort((a, b) => b.beds - a.beds);
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

grid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-save-id]');
  if (!button) return;
  button.classList.toggle('saved');
  button.textContent = button.classList.contains('saved') ? '♥' : '♡';
  button.setAttribute('aria-label', button.classList.contains('saved') ? 'Remove saved home' : 'Save home');
});

renderListings();