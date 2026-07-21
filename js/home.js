import { el, speak } from './utils.js';
import { getState, overallProgressPercent } from './state.js';

export function render(container) {
  const state = getState();
  const pct = overallProgressPercent();

  const hero = el('section', { class: 'hero', 'aria-label': 'Welcome animation' }, [
    el('div', { class: 'sun', 'aria-hidden': 'true' }),
    el('span', { class: 'leaf-float', style: 'left:14%; top:18%;', 'aria-hidden': 'true' }, '🍃'),
    el('span', { class: 'leaf-float', style: 'left:78%; top:30%; animation-delay:2s;', 'aria-hidden': 'true' }, '🍃'),
    el('span', { class: 'leaf-float', style: 'left:60%; top:12%; animation-delay:4s;', 'aria-hidden': 'true' }, '🍂'),
    el('div', { class: 'hero-content' }, [
      el('h1', {}, 'Photosynthesis: Turning Sunlight Into Life'),
      el('p', { class: 'essential-question' }, 'How do plants transform sunlight into food while conserving matter?'),
      el('div', { class: 'hero-actions' }, [
        el('a', { class: 'btn btn-primary', href: '#/modules' }, '🚀 Start Learning'),
        el('a', { class: 'btn btn-sun', href: '#/module3' }, '⚖️ Balance the Equation'),
        el('a', { class: 'btn', href: '#/games' }, '🎮 Play Games'),
      ]),
    ]),
    el('div', { class: 'plant-scene', 'aria-hidden': 'true' }, [
      el('div', { class: 'plant-stem', style: 'left:12%;' }),
      el('div', { class: 'plant-leaf', style: 'left:6%; bottom:40px; animation-delay:1.2s;' }),
      el('div', { class: 'plant-leaf', style: 'left:16%; bottom:70px; animation-delay:1.8s; transform-origin:left;' }),
    ]),
  ]);

  const navCards = [
    { href: '#/modules', icon: '🧭', title: 'Interactive Models', desc: 'Explore all seven learning modules.' },
    { href: '#/module3', icon: '⚖️', title: 'Balance the Equation', desc: 'Master conservation of matter through the balanced equation.' },
    { href: '#/module6', icon: '🧩', title: 'Build Your Own Model', desc: 'Construct a complete scientific model from scratch.' },
    { href: '#/games', icon: '🎮', title: 'Play Games', desc: 'Five games reinforcing every concept.' },
    { href: '#/module7', icon: '🧪', title: 'Virtual Lab', desc: 'Investigate variables that affect photosynthesis rate.' },
    { href: '#/final-assessment', icon: '🏆', title: 'Final Challenge', desc: 'Prove mastery and earn your certificate.' },
    { href: '#/dashboard/teacher', icon: '📊', title: 'Teacher Dashboard', desc: 'Track class progress and misconceptions.' },
    { href: '#/dashboard/student', icon: '🌟', title: 'My Progress', desc: 'View badges, streaks, and mastery level.' },
  ];

  const grid = el('section', { class: 'card-grid mt-3' },
    navCards.map((c) => el('a', { class: 'module-card card', href: c.href }, [
      el('div', { class: 'module-icon', 'aria-hidden': 'true' }, c.icon),
      el('h3', {}, c.title),
      el('p', { class: 'text-muted' }, c.desc),
    ]))
  );

  const overview = el('section', { class: 'card mt-3' }, [
    el('h2', { class: 'section-title' }, 'Your Learning Journey'),
    el('div', { class: 'progress-bar-track', role: 'progressbar', 'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100' }, [
      el('div', { class: 'progress-bar-fill', style: `width:${pct}%` }),
    ]),
    el('p', { class: 'text-muted mt-1' }, `${pct}% of modules complete. ${state.badges.length} badges earned.`),
  ]);

  container.append(hero, grid, overview);
  speak('Welcome to the Photosynthesis Lab. How do plants transform sunlight into food while conserving matter? Choose a module to begin.');
}
