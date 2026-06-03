const listings = [
  {
    title: 'Harbor View Villa',
    type: 'Villa',
    price: 1450000,
    bedrooms: 4,
    area: '3,200 sq ft',
    location: 'Seabrook',
    image: 'Harbor View Villa',
    tag: 'Oceanfront'
  },
  {
    title: 'Skyline Loft',
    type: 'Apartment',
    price: 720000,
    bedrooms: 2,
    area: '1,450 sq ft',
    location: 'Downtown',
    image: 'Skyline Loft',
    tag: 'New Listing'
  },
  {
    title: 'Maple Grove House',
    type: 'House',
    price: 980000,
    bedrooms: 3,
    area: '2,180 sq ft',
    location: 'Maple Grove',
    image: 'Maple Grove House',
    tag: 'Family Friendly'
  },
  {
    title: 'Cedar Point Residence',
    type: 'House',
    price: 1250000,
    bedrooms: 4,
    area: '2,850 sq ft',
    location: 'Cedar Point',
    image: 'Cedar Point Residence',
    tag: 'Open House'
  },
  {
    title: 'City Light Penthouse',
    type: 'Apartment',
    price: 860000,
    bedrooms: 2,
    area: '1,700 sq ft',
    location: 'Midtown',
    image: 'City Light Penthouse',
    tag: 'Luxury'
  },
  {
    title: 'Willow Creek Estate',
    type: 'Villa',
    price: 1540000,
    bedrooms: 5,
    area: '4,100 sq ft',
    location: 'Willow Creek',
    image: 'Willow Creek Estate',
    tag: 'Private Pool'
  }
];

function createPlaceholderSvg(label, accent) {
  const text = label.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#0f1b2c" />
          <stop offset="100%" stop-color="#17304d" />
        </linearGradient>
      </defs>
      <rect width="900" height="560" fill="url(#g)" rx="32" />
      <rect x="70" y="70" width="760" height="420" rx="28" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.12)" />
      <rect x="120" y="140" width="220" height="120" rx="18" fill="${accent}" fill-opacity="0.35" />
      <rect x="370" y="140" width="390" height="18" rx="9" fill="rgba(255,255,255,0.16)" />
      <rect x="370" y="180" width="320" height="18" rx="9" fill="rgba(255,255,255,0.12)" />
      <rect x="370" y="220" width="260" height="18" rx="9" fill="rgba(255,255,255,0.12)" />
      <rect x="120" y="290" width="640" height="120" rx="18" fill="rgba(255,255,255,0.09)" />
      <circle cx="740" cy="350" r="52" fill="${accent}" fill-opacity="0.3" />
      <text x="120" y="460" fill="#eff6ff" font-size="44" font-family="Arial, Helvetica, sans-serif" font-weight="700">${text}</text>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

const grid = document.getElementById('propertyGrid');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const minPriceFilter = document.getElementById('minPriceFilter');
const bedroomFilter = document.getElementById('bedroomFilter');

function formatPrice(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function renderListings() {
  const query = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;
  const minPrice = Number(minPriceFilter.value || 0);
  const bedrooms = bedroomFilter.value === 'all' ? null : Number(bedroomFilter.value);

  const filtered = listings.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query);
    const matchesType = type === 'all' || item.type === type;
    const matchesPrice = item.price >= minPrice;
    const matchesBedrooms = bedrooms === null || item.bedrooms >= bedrooms;
    return matchesQuery && matchesType && matchesPrice && matchesBedrooms;
  });

  if (!filtered.length) {
    grid.innerHTML = '<article class="property-card"><div class="card-body"><h3>No matching properties</h3><p class="muted">Try adjusting your search or filters to see more homes.</p></div></article>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (item) => `
        <article class="property-card">
          <img src="${createPlaceholderSvg(item.title, '#57d9b5')}" alt="${item.title}" />
          <div class="card-body">
            <div class="property-title">
              <h3>${item.title}</h3>
              <span class="price">${formatPrice(item.price)}</span>
            </div>
            <div class="meta">
              <span class="badge">${item.type}</span>
              <span>${item.location}</span>
              <span>${item.bedrooms} bed</span>
              <span>${item.area}</span>
            </div>
            <p class="muted">${item.tag}</p>
          </div>
        </article>
      `
    )
    .join('');
}

[searchInput, typeFilter, minPriceFilter, bedroomFilter].forEach((el) => {
  el.addEventListener('input', renderListings);
  el.addEventListener('change', renderListings);
});

renderListings();

const agentImages = document.querySelectorAll('.agent-card img');
agentImages.forEach((img, index) => {
  const names = ['Maya Chen', 'Jordan Miles', 'Sofia Rivera'];
  const accents = ['#57d9b5', '#7da6ff', '#ffe27a'];
  img.src = createPlaceholderSvg(names[index], accents[index]);
  img.alt = names[index];
});
