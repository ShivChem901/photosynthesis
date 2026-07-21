import { el } from './utils.js';
import { getState } from './state.js';

const GAMES = [
  { id: 'balance-it', icon: '⏱️', title: 'Balance It!', desc: 'Race the clock balancing photosynthesis equations.' },
  { id: 'atom-tracker', icon: '🧬', title: 'Atom Tracker', desc: 'Trace every carbon, hydrogen, and oxygen atom from reactants to products.' },
  { id: 'plant-builder', icon: '🌱', title: 'Plant Builder', desc: 'Grow a healthy plant with correct reactants and a balanced equation.' },
  { id: 'energy-quest', icon: '🔆', title: 'Energy Quest', desc: 'Collect sunlight and transfer its energy into stored glucose.' },
  { id: 'escape-greenhouse', icon: '🔐', title: 'Escape the Greenhouse', desc: 'Solve a chain of photosynthesis puzzles to unlock every door.' },
];

export function render(container) {
  const state = getState();
  container.append(
    el('h1', {}, 'Educational Games'),
    el('p', { class: 'text-muted' }, 'Five games reinforcing reactants, products, balancing, atom tracking, and energy transformation.'),
    el('section', { class: 'card-grid mt-2' },
      GAMES.map((g) => {
        const record = state.games[g.id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
        return el('a', { class: 'module-card card', href: `#/game/${g.id}` }, [
          el('div', { class: 'module-icon', 'aria-hidden': 'true' }, g.icon),
          el('h3', {}, g.title),
          el('p', { class: 'text-muted' }, g.desc),
          record ? el('p', { class: 'text-muted' }, `High score: ${record.highScore}`) : null,
        ]);
      })
    )
  );
}
