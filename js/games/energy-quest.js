// Game 4: Energy Quest
// Arcade-style game: collect sunlight tokens against the clock, then transfer
// that energy through the correct pathway (Sunlight -> Leaf -> Glucose ->
// Stored Chemical Energy) before time runs out.

import {
  el, showFeedback, confettiBurst, shuffle, makeDraggable, makeDropzone,
} from '../utils.js';
import { recordGameScore, getState } from '../state.js';

const STYLE_ID = 'energy-quest-styles';

const GRID_SIZE = 9;
const COLLECT_SECONDS = 16;
const MAX_CONCURRENT_SUNS = 3;
const SPAWN_INTERVAL_MS = 700;
const SUN_LIFETIME_MS = 1100;

const PATHWAY = [
  { id: 'sunlight', label: 'Sunlight', icon: '☀️' },
  { id: 'leaf', label: 'Leaf', icon: '🍃' },
  { id: 'glucose', label: 'Glucose', icon: '🍬' },
  { id: 'stored', label: 'Stored Chemical Energy', icon: '🔋' },
];

const SKIP_HINTS = {
  sunlight: 'Energy has to start with sunlight — that’s the original energy source for photosynthesis.',
  leaf: 'Energy can’t skip the leaf — sunlight must reach the leaf before anything can be converted into food.',
  glucose: 'Energy can’t skip glucose — the leaf converts light energy into glucose before it can be stored.',
  stored: 'Glucose must be made first — its chemical energy is what ends up stored for later use.',
};

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .eq-status {
      display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
      font-weight: 700; margin: 0.75rem 0; color: var(--green-700);
    }
    :root[data-theme='dark'] .eq-status { color: var(--green-300); }
    .eq-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem;
      max-width: 340px; margin: 0 auto 1rem;
    }
    .eq-cell {
      aspect-ratio: 1; border-radius: var(--radius); border: 2px solid var(--border);
      background: var(--bg-elevated); font-size: 1.7rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s ease, border-color 0.2s ease, background 0.2s ease;
    }
    .eq-cell:hover { border-color: var(--green-500); }
    .eq-cell.eq-active {
      border-color: var(--sun-500);
      background: radial-gradient(circle, var(--sun-300), var(--sun-500));
      animation: eqPulse 0.9s ease-in-out infinite;
    }
    @keyframes eqPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    .eq-cell.eq-collected { animation: eqCollected 0.4s ease; }
    @keyframes eqCollected { 0% { transform: scale(1.2); } 100% { transform: scale(1); } }
    .eq-cell.eq-miss { animation: eqShake 0.3s ease; }
    @keyframes eqShake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }
    .eq-pathway {
      min-height: 70px; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
    }
    .eq-pathway.eq-shake { animation: eqShake 0.3s ease; }
    .eq-chip-slot {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.55rem 0.85rem;
      border-radius: 10px; background: var(--green-100); font-weight: 700; color: var(--green-900);
    }
    :root[data-theme='dark'] .eq-chip-slot { color: var(--green-100); }
    .eq-tiles { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem; }
    .eq-tile {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.65rem 1rem;
      border-radius: 12px; border: 2px solid var(--green-700); background: var(--bg-elevated);
      color: var(--text); font-weight: 600; cursor: grab; font-size: 0.95rem;
    }
    :root[data-theme='dark'] .eq-tile { border-color: var(--green-300); }
    .eq-tile.dragging { opacity: 0.5; }
    .eq-tile:disabled { opacity: 0.35; cursor: not-allowed; }
    .eq-complete { text-align: center; }
    .eq-complete .eq-score { font-size: 2rem; font-weight: 800; color: var(--green-700); }
    :root[data-theme='dark'] .eq-complete .eq-score { color: var(--green-300); }
  `;
  document.head.appendChild(style);
}

export function render(container) {
  injectStyles();

  const state = getState();
  const best = state.games.energyQuest ? state.games.energyQuest.highScore : 0;

  let energyCollected = 0;
  let transferMistakes = 0;
  let spawnTimer = null;
  let countdownTimer = null;

  const heading = el('div', {}, [
    el('h1', {}, 'Energy Quest'),
    el('p', { class: 'text-muted' }, 'Collect sunlight energy against the clock, then send it through the correct pathway to glucose.'),
    best > 0 ? el('p', { class: 'text-muted' }, `Best score: ${best}`) : null,
  ]);

  const phaseHost = el('div', { class: 'card mt-2' });
  container.append(heading, phaseHost);

  function clearTimers() {
    clearInterval(spawnTimer);
    clearInterval(countdownTimer);
    spawnTimer = null;
    countdownTimer = null;
  }

  function renderIntro() {
    clearTimers();
    phaseHost.innerHTML = '';
    phaseHost.append(
      el('h2', {}, 'Ready?'),
      el('p', {}, `Collect glowing sunlight tokens for ${COLLECT_SECONDS} seconds, then arrange the energy pathway in the correct order.`),
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onclick: startCollectionPhase,
      }, 'Start Game'),
    );
  }

  // --- Phase 1: collect sunlight tokens -------------------------------------------
  function startCollectionPhase() {
    energyCollected = 0;
    transferMistakes = 0;
    let secondsLeft = COLLECT_SECONDS;
    const activeCells = new Map(); // index -> timeoutId

    phaseHost.innerHTML = '';
    const status = el('div', { class: 'eq-status', role: 'status', 'aria-live': 'polite' }, [
      el('span', {}, `Energy collected: ${energyCollected}`),
      el('span', {}, `Time left: ${secondsLeft}s`),
    ]);
    phaseHost.appendChild(el('h2', {}, 'Collect Sunlight'));
    phaseHost.appendChild(el('p', { class: 'text-muted' }, 'Click a cell as soon as it glows with sunlight.'));
    phaseHost.appendChild(status);

    const grid = el('div', { class: 'eq-grid', role: 'group', 'aria-label': 'Sunlight collection grid' });
    const cells = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const cell = el('button', {
        type: 'button',
        class: 'eq-cell',
        'aria-label': `Grid cell ${i + 1}, empty`,
        onclick: () => collect(i),
      }, '');
      cells.push(cell);
      grid.appendChild(cell);
    }
    phaseHost.appendChild(grid);

    function updateStatus() {
      status.children[0].textContent = `Energy collected: ${energyCollected}`;
      status.children[1].textContent = `Time left: ${secondsLeft}s`;
    }

    function activate(i) {
      cells[i].classList.add('eq-active');
      cells[i].setAttribute('aria-label', `Grid cell ${i + 1}, sunlight available — click to collect`);
      const timeoutId = setTimeout(() => {
        if (activeCells.has(i)) {
          activeCells.delete(i);
          cells[i].classList.remove('eq-active');
          cells[i].setAttribute('aria-label', `Grid cell ${i + 1}, empty`);
        }
      }, SUN_LIFETIME_MS);
      activeCells.set(i, timeoutId);
    }

    function collect(i) {
      if (!activeCells.has(i)) {
        cells[i].classList.remove('eq-miss');
        void cells[i].offsetWidth;
        cells[i].classList.add('eq-miss');
        setTimeout(() => cells[i].classList.remove('eq-miss'), 320);
        return;
      }
      clearTimeout(activeCells.get(i));
      activeCells.delete(i);
      energyCollected += 1;
      cells[i].classList.remove('eq-active');
      cells[i].classList.add('eq-collected');
      cells[i].setAttribute('aria-label', `Grid cell ${i + 1}, empty`);
      setTimeout(() => cells[i].classList.remove('eq-collected'), 400);
      updateStatus();
    }

    spawnTimer = setInterval(() => {
      if (!container.isConnected) { clearTimers(); return; }
      if (activeCells.size >= MAX_CONCURRENT_SUNS) return;
      const free = cells.map((_, idx) => idx).filter((idx) => !activeCells.has(idx));
      if (!free.length) return;
      const pick = free[Math.floor(Math.random() * free.length)];
      activate(pick);
    }, SPAWN_INTERVAL_MS);

    countdownTimer = setInterval(() => {
      if (!container.isConnected) { clearTimers(); return; }
      secondsLeft -= 1;
      updateStatus();
      if (secondsLeft <= 0) {
        clearTimers();
        activeCells.forEach((timeoutId) => clearTimeout(timeoutId));
        showFeedback(`Time's up! You collected ${energyCollected} bits of sunlight energy.`, 'info');
        startTransferPhase();
      }
    }, 1000);
  }

  // --- Phase 2: transfer energy through the correct pathway -----------------------
  function startTransferPhase() {
    let expectedIndex = 0;
    const tileMap = {};

    phaseHost.innerHTML = '';
    phaseHost.appendChild(el('h2', {}, 'Transfer the Energy'));
    phaseHost.appendChild(el('p', { class: 'text-muted' }, 'Drag or click the tiles in order: Sunlight, then Leaf, then Glucose, then Stored Chemical Energy. Energy can’t skip a step.'));

    const pathway = el('div', { class: 'eq-pathway' });
    makeDropzone(pathway, {
      accepts: () => true,
      onDrop: (dragId) => attemptPlace(dragId),
    });
    phaseHost.appendChild(pathway);

    const tilesWrap = el('div', { class: 'eq-tiles', role: 'group', 'aria-label': 'Energy pathway tiles' });
    shuffle(PATHWAY).forEach((stage) => {
      const tile = el('button', {
        type: 'button',
        class: 'eq-tile',
        'aria-label': `Place ${stage.label} in the pathway`,
        onclick: () => attemptPlace(stage.id),
      }, `${stage.icon} ${stage.label}`);
      tile.dataset.dragId = stage.id;
      makeDraggable(tile);
      tileMap[stage.id] = tile;
      tilesWrap.appendChild(tile);
    });
    phaseHost.appendChild(tilesWrap);

    function shakePathway() {
      pathway.classList.remove('eq-shake');
      void pathway.offsetWidth;
      pathway.classList.add('eq-shake');
      setTimeout(() => pathway.classList.remove('eq-shake'), 320);
    }

    function attemptPlace(id) {
      const expected = PATHWAY[expectedIndex];
      const tile = tileMap[id];
      if (tile && tile.disabled) return;

      if (id === expected.id) {
        pathway.appendChild(el('div', { class: 'eq-chip-slot' }, `${expected.icon} ${expected.label}`));
        if (tile) { tile.disabled = true; tile.setAttribute('aria-hidden', 'true'); }
        expectedIndex += 1;
        if (expectedIndex === PATHWAY.length) {
          completeTransfer();
        }
      } else {
        transferMistakes += 1;
        shakePathway();
        showFeedback(SKIP_HINTS[expected.id], 'error');
      }
    }
  }

  function completeTransfer() {
    const energyScore = Math.min(60, energyCollected * 6);
    const transferScore = Math.max(0, 40 - transferMistakes * 8);
    const score = Math.max(0, Math.min(100, energyScore + transferScore));

    confettiBurst();
    recordGameScore('energyQuest', score);
    showFeedback('Energy successfully stored as glucose!', 'success');

    phaseHost.innerHTML = '';
    phaseHost.className = 'card mt-2 eq-complete';
    phaseHost.append(
      el('h2', {}, 'Energy Stored!'),
      el('p', {}, `Sunlight collected: ${energyCollected} · Transfer mistakes: ${transferMistakes}`),
      el('p', { class: 'eq-score' }, `Score: ${score}`),
      el('button', {
        type: 'button',
        class: 'btn btn-primary mt-1',
        onclick: () => {
          phaseHost.className = 'card mt-2';
          renderIntro();
        },
      }, 'Play Again'),
    );
  }

  renderIntro();
}
