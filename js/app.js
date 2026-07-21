import { getState, toggleDarkMode, overallProgressPercent, addTimeOnTask } from './state.js';
import { setNarrationEnabled, isNarrationEnabled, el } from './utils.js';

const mainEl = document.getElementById('main-content');
const navEl = document.getElementById('main-nav');
const darkToggle = document.getElementById('dark-toggle');
const narrationToggle = document.getElementById('narration-toggle');
const progressPill = document.getElementById('header-progress');

const MODULE_LOADERS = {
  module1: () => import('./modules/module1.js'),
  module2: () => import('./modules/module2.js'),
  module3: () => import('./modules/module3.js'),
  module4: () => import('./modules/module4.js'),
  module5: () => import('./modules/module5.js'),
  module6: () => import('./modules/module6.js'),
  module7: () => import('./modules/module7.js'),
};

const GAME_LOADERS = {
  'balance-it': () => import('./games/balance-it.js'),
  'atom-tracker': () => import('./games/atom-tracker.js'),
  'plant-builder': () => import('./games/plant-builder.js'),
  'energy-quest': () => import('./games/energy-quest.js'),
  'escape-greenhouse': () => import('./games/escape-greenhouse.js'),
};

const ROUTES = {
  home: () => import('./home.js'),
  modules: () => import('./modules-hub.js'),
  games: () => import('./games-hub.js'),
  'final-assessment': () => import('./final-assessment.js'),
  certificate: () => import('./certificate.js'),
};

function applyTheme() {
  const dark = getState().darkMode;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  darkToggle.setAttribute('aria-pressed', String(dark));
  darkToggle.textContent = dark ? '☀️' : '🌙';
}

function updateProgressPill() {
  progressPill.textContent = `🌱 ${overallProgressPercent()}%`;
}

function highlightNav(hash) {
  [...navEl.querySelectorAll('a')].forEach((a) => {
    const target = a.getAttribute('href').replace('#/', '');
    const current = hash.split('/')[0];
    a.classList.toggle('active', target === current || (target === 'modules' && current.startsWith('module')));
  });
}

function renderError(message) {
  mainEl.innerHTML = '';
  mainEl.appendChild(el('div', { class: 'view card' }, [
    el('h1', {}, 'Page not found'),
    el('p', { class: 'text-muted' }, message),
    el('a', { class: 'btn btn-primary', href: '#/home' }, 'Back to Home'),
  ]));
}

async function router() {
  const raw = location.hash.replace(/^#\//, '') || 'home';
  const [first, second] = raw.split('/');
  highlightNav(raw);
  mainEl.innerHTML = '<div class="view card center"><p>Loading...</p></div>';

  try {
    if (MODULE_LOADERS[first]) {
      const mod = await MODULE_LOADERS[first]();
      renderView(mod);
      return;
    }
    if (first === 'game' && GAME_LOADERS[second]) {
      const mod = await GAME_LOADERS[second]();
      renderView(mod);
      return;
    }
    if (first === 'dashboard') {
      const mod = second === 'teacher'
        ? await import('./dashboards/teacher.js')
        : await import('./dashboards/student.js');
      renderView(mod);
      return;
    }
    if (ROUTES[first]) {
      const mod = await ROUTES[first]();
      renderView(mod);
      return;
    }
    renderError(`No page exists for "#/${raw}" yet.`);
  } catch (err) {
    console.error(err);
    renderError('This section is still being built. Please check back soon.');
  }
  updateProgressPill();
}

function renderView(mod) {
  mainEl.innerHTML = '';
  const container = el('div', { class: 'view' });
  mainEl.appendChild(container);
  mod.render(container);
  mainEl.focus();
  updateProgressPill();
}

window.addEventListener('hashchange', router);
window.addEventListener('state:changed', () => {
  applyTheme();
  updateProgressPill();
});

darkToggle.addEventListener('click', () => {
  toggleDarkMode();
  applyTheme();
});

narrationToggle.addEventListener('click', () => {
  const next = !isNarrationEnabled();
  setNarrationEnabled(next);
  narrationToggle.setAttribute('aria-pressed', String(next));
  narrationToggle.textContent = next ? '🔊' : '🔇';
});

applyTheme();
updateProgressPill();
router();

setInterval(() => {
  if (document.visibilityState === 'visible') addTimeOnTask(30);
}, 30000);
