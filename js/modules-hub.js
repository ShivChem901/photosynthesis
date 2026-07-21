import { el } from './utils.js';
import { getState } from './state.js';

const MODULES = [
  { id: 'module1', icon: '🌞', title: 'Module 1: The Big Idea', desc: 'Meet the players: sunlight, CO₂, water, glucose, and oxygen.' },
  { id: 'module2', icon: '🖐️', title: 'Module 2: Interactive Photosynthesis Model', desc: 'Drag sunlight, CO₂, and water onto a virtual plant.' },
  { id: 'module3', icon: '⚖️', title: 'Module 3: Balance the Equation', desc: 'Balance the photosynthesis equation and prove conservation of matter.' },
  { id: 'module4', icon: '🔬', title: 'Module 4: Matter Explorer', desc: 'Build molecules and trace every atom through the reaction.' },
  { id: 'module5', icon: '⚡', title: 'Module 5: Energy Explorer', desc: 'Follow energy from sunlight into stored chemical bonds.' },
  { id: 'module6', icon: '🧩', title: 'Module 6: Build Your Own Scientific Model', desc: 'Construct and get feedback on a complete model.' },
  { id: 'module7', icon: '🧪', title: 'Module 7: Virtual Investigation', desc: 'Test how light, CO₂, and water affect photosynthesis.' },
];

export function render(container) {
  const state = getState();
  container.append(
    el('h1', {}, 'Learning Journey'),
    el('p', { class: 'text-muted' }, 'Work through all seven modules. Each one unlocks a badge and feeds your Student Progress dashboard.'),
    el('section', { class: 'card-grid mt-2' },
      MODULES.map((m) => {
        const done = state.modules[m.id]?.completed;
        return el('a', { class: 'module-card card', href: `#/${m.id}` }, [
          done ? el('span', { class: 'badge-done', 'aria-label': 'Completed' }, '✅') : null,
          el('div', { class: 'module-icon', 'aria-hidden': 'true' }, m.icon),
          el('h3', {}, m.title),
          el('p', { class: 'text-muted' }, m.desc),
        ]);
      })
    )
  );
}
