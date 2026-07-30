const COMPONENT_PATHS = {
  header: '/components/header.html',
  footer: '/components/footer.html'
};

async function loadComponent(targetId, path) {
  const target = document.getElementById(targetId);
  if (!target) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load ${path}`);
    target.innerHTML = await response.text();
  } catch (error) {
    console.error(error);
    target.innerHTML = '<p class="component-error">Navigation temporarily unavailable.</p>';
  }
}

function initializeMobileNavigation() {
  const button = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!button || !nav) return;

  button.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(isOpen));
  });
}

function markActiveNavigation() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === currentPath) link.classList.add('active');
  });
}

async function initializeLayout() {
  await Promise.all([
    loadComponent('siteHeader', COMPONENT_PATHS.header),
    loadComponent('siteFooter', COMPONENT_PATHS.footer)
  ]);
  initializeMobileNavigation();
  markActiveNavigation();
}

document.addEventListener('DOMContentLoaded', initializeLayout);