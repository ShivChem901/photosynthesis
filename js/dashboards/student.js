// Student Dashboard — a single learner's view of their own progress,
// badges, game scores, modeling achievements, and mastery level.
// All data comes from this browser's localStorage via state.js.

import {
  getState,
  getBadgeDefs,
  getModuleIds,
  getGameIds,
  overallProgressPercent,
  masteryLevel,
} from '../state.js';
import { el } from '../utils.js';

const STYLE_ID = 'student-dashboard-styles';

const MODULE_LABELS = {
  module1: 'Module 1 — Big Idea Explorer',
  module2: 'Module 2 — Model Builder',
  module3: 'Module 3 — Equation Balancer',
  module4: 'Module 4 — Atom Tracker',
  module5: 'Module 5 — Energy Explorer',
  module6: 'Module 6 — Model Scientist',
  module7: 'Module 7 — Investigator',
};

const GAME_LABELS = {
  balanceIt: 'Balance It!',
  atomTracker: 'Atom Tracker',
  plantBuilder: 'Plant Builder',
  energyQuest: 'Energy Quest',
  escapeGreenhouse: 'Escape the Greenhouse',
};

const LEVEL_DESCRIPTIONS = [
  {
    level: 1,
    title: 'Level 1',
    text: 'Identify reactants, products, sunlight, glucose, and oxygen from a provided model.',
  },
  {
    level: 2,
    title: 'Level 2',
    text: 'Identify matter, energy, reactants, and products using a completed diagram and equation.',
  },
  {
    level: 3,
    title: 'Level 3',
    text: 'Use a model and the balanced equation to explain conservation of matter and energy.',
  },
  {
    level: 4,
    title: 'Level 4',
    text: 'Construct a complete labeled model showing matter movement, energy transformation, and a correctly balanced photosynthesis equation.',
  },
  {
    level: 5,
    title: 'Level 5',
    text: 'Design an original scientific model from scratch using only the inputs and outputs, balance the equation independently, and justify how the model demonstrates conservation of matter and the transformation of light energy into stored chemical energy.',
  },
];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .sd-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 1rem;
    }
    .sd-stat-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      text-align: center;
    }
    .sd-stat-value { font-size: 1.6rem; font-weight: 700; color: var(--green-700); }
    :root[data-theme='dark'] .sd-stat-value { color: var(--green-300); }
    .sd-stat-label { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem; }
    .sd-badge-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .sd-badge-locked {
      opacity: 0.5;
      filter: grayscale(1);
      border: 1px dashed var(--border);
      background: transparent;
    }
    .sd-badge-locked .sd-badge-status { font-style: italic; }
    .sd-level-list { list-style: none; margin: 0.75rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .sd-level-item {
      border: 2px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      position: relative;
    }
    .sd-level-item.sd-level-current {
      border-color: var(--green-500);
      background: var(--green-100);
    }
    .sd-level-item h4 { margin: 0 0 0.25rem; display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .sd-here-tag {
      display: inline-block;
      background: var(--sun-500);
      color: #3a2a00;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .sd-model-callout {
      border-left: 5px solid var(--sun-500);
      background: var(--green-100);
      border-radius: 8px;
      padding: 0.9rem 1.1rem;
    }
    .sd-section { margin-top: 1.75rem; }
  `;
  document.head.appendChild(style);
}

function statCard(value, label) {
  return el('div', { class: 'sd-stat-card' }, [
    el('div', { class: 'sd-stat-value' }, value),
    el('div', { class: 'sd-stat-label' }, label),
  ]);
}

export function render(container) {
  injectStyles();
  const state = getState();
  const pct = overallProgressPercent();
  const level = masteryLevel();
  const badgeDefs = getBadgeDefs();
  const earnedBadgeIds = state.badges || [];
  const moduleIds = getModuleIds();
  const gameIds = getGameIds();
  const minutesOnTask = Math.round((state.timeOnTaskSeconds || 0) / 60);
  const streakCount = (state.streak && state.streak.count) || 0;

  const greetingName = state.studentName ? `, ${state.studentName}` : '';

  container.appendChild(el('h1', { class: 'section-title' }, `My Progress${greetingName}`));
  container.appendChild(el('p', { class: 'text-muted' },
    minutesOnTask > 0
      ? `You've spent ${minutesOnTask} minute${minutesOnTask === 1 ? '' : 's'} exploring photosynthesis this session.`
      : "You're just getting started exploring photosynthesis — dive into a module to begin!"));

  // ---- Overall progress ----
  const progressSection = el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, 'Overall Progress'),
    el('div', {
      class: 'progress-bar-track',
      role: 'progressbar',
      'aria-valuenow': String(pct),
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-label': 'Overall module completion progress',
    }, [
      el('div', { class: 'progress-bar-fill', style: `width:${pct}%` }),
    ]),
    el('p', { class: 'text-muted', style: 'margin-top:0.4rem;' }, `${pct}% of modules complete`),
  ]);
  container.appendChild(progressSection);

  // ---- Quick stats ----
  const statsSection = el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, 'Quick Stats'),
    el('div', { class: 'sd-stat-grid' }, [
      statCard(`🔥 ${streakCount}`, `Day learning streak`),
      statCard(`${minutesOnTask}`, 'Minutes on task'),
      statCard(`${earnedBadgeIds.length} / ${Object.keys(badgeDefs).length}`, 'Badges earned'),
      statCard(`${level} / 5`, 'Mastery level'),
    ]),
  ]);
  container.appendChild(statsSection);

  // ---- Badges ----
  const allBadgeIds = Object.keys(badgeDefs);
  const badgeRow = el('div', { class: 'sd-badge-row', role: 'list', 'aria-label': 'Badges earned and locked' });
  allBadgeIds.forEach((id) => {
    const def = badgeDefs[id];
    const earned = earnedBadgeIds.includes(id);
    badgeRow.appendChild(el('span', {
      class: `badge-chip${earned ? '' : ' sd-badge-locked'}`,
      role: 'listitem',
      'aria-label': `${def.label}: ${earned ? 'earned' : 'locked, not yet earned'}`,
    }, [
      el('span', { 'aria-hidden': 'true' }, def.icon),
      el('span', {}, def.label),
      !earned ? el('span', { class: 'sd-badge-status' }, ' (locked)') : null,
    ]));
  });
  container.appendChild(el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, 'Badges'),
    el('p', { class: 'text-muted' }, 'Earned badges are shown in full color. Locked badges are grayed out — keep going to unlock them!'),
    badgeRow,
  ]));

  // ---- Completed modules table ----
  const moduleTable = el('table', { 'aria-label': 'Module completion and scores' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { scope: 'col' }, 'Module'),
      el('th', { scope: 'col' }, 'Status'),
      el('th', { scope: 'col' }, 'Score'),
    ])),
    el('tbody', {}, moduleIds.map((id) => {
      const m = state.modules[id] || { completed: false, score: null };
      return el('tr', {}, [
        el('td', {}, MODULE_LABELS[id] || id),
        el('td', {}, m.completed ? '✅ Completed' : (m.visited ? '🕓 In progress' : '⬜ Not started')),
        el('td', {}, m.score !== null && m.score !== undefined ? `${m.score}%` : '—'),
      ]);
    })),
  ]);
  container.appendChild(el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, 'Modules'),
    moduleTable,
  ]));

  // ---- Game scores ----
  const gameTable = el('table', { 'aria-label': 'Game high scores' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { scope: 'col' }, 'Game'),
      el('th', { scope: 'col' }, 'High Score'),
      el('th', { scope: 'col' }, 'Attempts'),
    ])),
    el('tbody', {}, gameIds.map((id) => {
      const g = state.games[id] || { highScore: 0, attempts: 0 };
      const label = GAME_LABELS[id] || id;
      return el('tr', {}, [
        el('td', {}, id === 'balanceIt' ? `⚖️ ${label} (Equation Balancing)` : label),
        el('td', {}, String(g.highScore || 0)),
        el('td', {}, String(g.attempts || 0)),
      ]);
    })),
  ]);
  container.appendChild(el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, 'Game High Scores'),
    gameTable,
  ]));

  // ---- Modeling achievement (Module 6) ----
  const m6 = state.modules.module6 || { completed: false, score: null };
  container.appendChild(el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, 'Modeling Achievement'),
    el('div', { class: 'sd-model-callout' }, [
      el('p', {}, [
        el('strong', {}, 'Module 6 — Build Your Own Model: '),
        m6.completed
          ? `Completed${m6.score !== null && m6.score !== undefined ? ` with a score of ${m6.score}%` : ''}. Great work designing an original photosynthesis model!`
          : 'Not yet completed. This is your chance to design an original scientific model from scratch.',
      ]),
    ]),
  ]));

  // ---- Mastery level ----
  const levelList = el('ul', { class: 'sd-level-list' }, LEVEL_DESCRIPTIONS.map((desc) => {
    const isCurrent = desc.level === level;
    return el('li', {
      class: `sd-level-item${isCurrent ? ' sd-level-current' : ''}`,
      'aria-current': isCurrent ? 'true' : 'false',
    }, [
      el('h4', {}, [
        el('span', {}, desc.title),
        isCurrent ? el('span', { class: 'sd-here-tag' }, 'You are here') : null,
      ]),
      el('p', { style: 'margin:0;' }, desc.text),
    ]);
  }));
  container.appendChild(el('section', { class: 'card sd-section' }, [
    el('h2', { class: 'section-title' }, `Mastery Level: ${level} / 5`),
    el('p', { class: 'text-muted' }, 'These describe the five NYS Regents performance levels for modeling photosynthesis. Your current level is marked "You are here".'),
    levelList,
  ]));
}
