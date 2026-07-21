// Teacher Dashboard — a teacher-facing rollup of this browser's learner data
// (there is no backend, so "the class" is really just this one student's
// localStorage record), plus a clearly-labeled sample roster mockup showing
// what a real multi-student rollup would look like with an LMS/backend.

import {
  getState,
  getModuleIds,
  getGameIds,
  getMisconceptions,
  exportReport,
  overallProgressPercent,
  masteryLevel,
} from '../state.js';
import { el, showFeedback } from '../utils.js';

const STYLE_ID = 'teacher-dashboard-styles';

// Each module is treated as a rough proxy for an NGSS-aligned sub-skill.
const MODULE_SKILL_LABELS = {
  module1: 'Big Idea: Matter & Energy Recall',
  module2: 'Modeling Reactants & Products',
  module3: 'Conservation of Matter / Equation Balancing',
  module4: 'Atom Tracking Through the Reaction',
  module5: 'Conservation of Energy / Energy Transformation',
  module6: 'Original Model Construction (Modeling Practice)',
  module7: 'Scientific Investigation (Variables & Data)',
};

const MODULE_NAMES = {
  module1: 'Module 1: The Big Idea',
  module2: 'Module 2: Interactive Model',
  module3: 'Module 3: Balance the Equation',
  module4: 'Module 4: Matter Explorer',
  module5: 'Module 5: Energy Explorer',
  module6: 'Module 6: Build Your Own Model',
  module7: 'Module 7: Virtual Investigation',
};

const GAME_LABELS = {
  balanceIt: 'Balance It!',
  atomTracker: 'Atom Tracker',
  plantBuilder: 'Plant Builder',
  energyQuest: 'Energy Quest',
  escapeGreenhouse: 'Escape the Greenhouse',
};

// Clearly-fake demo roster — hardcoded, NOT read from localStorage.
// Illustrates what a real multi-student teacher rollup would show.
const DEMO_ROSTER = [
  { name: 'Ava Thompson (demo)', progress: 100, mastery: 5, finalScore: 92, misconception: 'None flagged' },
  { name: 'Marcus Lee (demo)', progress: 86, mastery: 4, finalScore: 78, misconception: 'Confuses reactants/products' },
  { name: 'Priya Natarajan (demo)', progress: 71, mastery: 3, finalScore: 68, misconception: 'Thinks plants get mass from soil' },
  { name: 'Diego Ramirez (demo)', progress: 43, mastery: 2, finalScore: null, misconception: 'Struggles balancing equation' },
  { name: 'Chloe Martin (demo)', progress: 14, mastery: 1, finalScore: null, misconception: 'Not enough data yet' },
];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .td-stat-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 1rem;
    }
    .td-stat-card {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      text-align: center;
    }
    .td-stat-value { font-size: 1.6rem; font-weight: 700; color: var(--green-700); }
    :root[data-theme='dark'] .td-stat-value { color: var(--green-300); }
    .td-stat-label { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem; }
    .td-section { margin-top: 1.75rem; }
    .td-notice {
      border-left: 5px solid var(--sky-500);
      background: var(--green-100);
      border-radius: 8px;
      padding: 0.75rem 1.1rem;
      font-size: 0.9rem;
    }
    .td-demo-notice {
      border-left: 5px solid var(--sun-500);
      background: var(--green-100);
      border-radius: 8px;
      padding: 0.75rem 1.1rem;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 0.85rem;
    }
    .td-demo-tag {
      display: inline-block;
      background: var(--sun-500);
      color: #3a2a00;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    .td-export-row { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; margin-top: 0.6rem; }
  `;
  document.head.appendChild(style);
}

function statCard(value, label) {
  return el('div', { class: 'td-stat-card' }, [
    el('div', { class: 'td-stat-value' }, value),
    el('div', { class: 'td-stat-label' }, label),
  ]);
}

function handleExport() {
  const json = exportReport();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const link = el('a', { href: url, download: `photosynthesis-report-${stamp}.json` });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showFeedback('Report downloaded.', 'success');
}

export function render(container) {
  injectStyles();
  const state = getState();
  const moduleIds = getModuleIds();
  const gameIds = getGameIds();
  const pct = overallProgressPercent();
  const level = masteryLevel();
  const minutesOnTask = Math.round((state.timeOnTaskSeconds || 0) / 60);
  const misconceptions = getMisconceptions();
  const misconceptionEntries = Object.entries(misconceptions).sort((a, b) => b[1] - a[1]);
  const finalAssessment = state.assessments.final;
  const balanceIt = state.games.balanceIt || { highScore: 0, attempts: 0, completed: false };

  container.appendChild(el('h1', { class: 'section-title' }, 'Teacher Dashboard'));
  container.appendChild(el('div', { class: 'td-notice' },
    "This is a fully static, client-side site with no backend or server database. Everything below in the "
    + '"This Learner\'s Data" section reflects the one student using THIS browser (read from localStorage) — '
    + 'not a real multi-student class. See the Sample Class Roster further down for a mockup of what a real '
    + 'class rollup would look like once connected to an LMS/backend.'));

  // ---- This learner's snapshot ----
  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, "This Learner's Data (this browser)"),
    el('div', { class: 'td-stat-grid' }, [
      statCard(`${pct}%`, 'Overall module progress'),
      statCard(`${level} / 5`, 'Mastery level'),
      statCard(`${minutesOnTask}`, 'Minutes on task'),
      statCard(`${(state.streak && state.streak.count) || 0}`, 'Day streak'),
      statCard(
        finalAssessment && finalAssessment.score !== null && finalAssessment.score !== undefined
          ? `${finalAssessment.score}%`
          : '—',
        `Final assessment${finalAssessment && finalAssessment.passed ? ' (passed)' : ''}`
      ),
    ]),
  ]));

  // ---- Module / NGSS sub-skill performance ----
  const moduleTable = el('table', { 'aria-label': 'Module performance by NGSS sub-skill' }, [
    el('thead', {}, el('tr', {}, [
      el('th', { scope: 'col' }, 'Module'),
      el('th', { scope: 'col' }, 'NGSS Sub-Skill Proxy'),
      el('th', { scope: 'col' }, 'Status'),
      el('th', { scope: 'col' }, 'Score'),
    ])),
    el('tbody', {}, moduleIds.map((id) => {
      const m = state.modules[id] || { completed: false, score: null, visited: false };
      return el('tr', {}, [
        el('td', {}, MODULE_NAMES[id] || id),
        el('td', {}, MODULE_SKILL_LABELS[id] || 'General'),
        el('td', {}, m.completed ? '✅ Completed' : (m.visited ? '🕓 In progress' : '⬜ Not started')),
        el('td', {}, m.score !== null && m.score !== undefined ? `${m.score}%` : '—'),
      ]);
    })),
  ]);
  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, 'Module Scores by Skill'),
    moduleTable,
  ]));

  // ---- Equation balancing accuracy (Balance It!) ----
  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, 'Equation-Balancing Accuracy'),
    el('p', { class: 'text-muted' }, 'Performance on the "Balance It!" game, used as a proxy for conservation-of-matter equation-balancing skill.'),
    el('table', { 'aria-label': 'Balance It game performance' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col' }, 'High Score'),
        el('th', { scope: 'col' }, 'Attempts'),
        el('th', { scope: 'col' }, 'Completed'),
      ])),
      el('tbody', {}, el('tr', {}, [
        el('td', {}, String(balanceIt.highScore || 0)),
        el('td', {}, String(balanceIt.attempts || 0)),
        el('td', {}, balanceIt.completed ? '✅ Yes' : '⬜ Not yet'),
      ])),
    ]),
  ]));

  // ---- All game high scores ----
  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, 'All Game High Scores'),
    el('table', { 'aria-label': 'All game high scores' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col' }, 'Game'),
        el('th', { scope: 'col' }, 'High Score'),
        el('th', { scope: 'col' }, 'Attempts'),
      ])),
      el('tbody', {}, gameIds.map((id) => {
        const g = state.games[id] || { highScore: 0, attempts: 0 };
        return el('tr', {}, [
          el('td', {}, GAME_LABELS[id] || id),
          el('td', {}, String(g.highScore || 0)),
          el('td', {}, String(g.attempts || 0)),
        ]);
      })),
    ]),
  ]));

  // ---- Common misconceptions ----
  const misconceptionsBody = misconceptionEntries.length
    ? misconceptionEntries.map(([topic, count]) => el('tr', {}, [
        el('td', {}, topic),
        el('td', {}, String(count)),
      ]))
    : el('tr', {}, el('td', { colspan: '2' }, 'No misconceptions logged yet.'));

  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, 'Common Misconceptions'),
    el('table', { 'aria-label': 'Common misconceptions logged during learning' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col' }, 'Misconception / Topic'),
        el('th', { scope: 'col' }, 'Times Logged'),
      ])),
      el('tbody', {}, misconceptionsBody),
    ]),
  ]));

  // ---- Export report ----
  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, 'Export Report'),
    el('p', { class: 'text-muted' }, "Download this learner's full progress record as a JSON file (e.g. to attach to a gradebook or share with a colleague)."),
    el('div', { class: 'td-export-row' }, [
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onclick: handleExport,
        'aria-label': "Download this learner's progress report as a JSON file",
      }, '⬇️ Export Report (JSON)'),
    ]),
  ]));

  // ---- Sample class roster (demo data, clearly labeled) ----
  container.appendChild(el('section', { class: 'card td-section' }, [
    el('h2', { class: 'section-title' }, ['Sample Class Roster', el('span', { class: 'td-demo-tag' }, 'Demo Data')]),
    el('p', { class: 'td-demo-notice' }, 'Demo data — connect a backend/LMS to see your real class roster here. The rows below are fictional example students, hardcoded for illustration only, and are NOT read from this device\'s saved progress.'),
    el('table', { 'aria-label': 'Sample demo class roster (fictional students, not real data)' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col' }, 'Student (demo)'),
        el('th', { scope: 'col' }, 'Progress'),
        el('th', { scope: 'col' }, 'Mastery Level'),
        el('th', { scope: 'col' }, 'Final Score'),
        el('th', { scope: 'col' }, 'Flagged Misconception'),
      ])),
      el('tbody', {}, DEMO_ROSTER.map((s) => el('tr', {}, [
        el('td', {}, s.name),
        el('td', {}, [
          el('div', {
            class: 'progress-bar-track',
            style: 'max-width:140px;',
            role: 'progressbar',
            'aria-valuenow': String(s.progress),
            'aria-valuemin': '0',
            'aria-valuemax': '100',
            'aria-label': `${s.name} progress`,
          }, el('div', { class: 'progress-bar-fill', style: `width:${s.progress}%` })),
          el('span', { class: 'text-muted', style: 'font-size:0.8rem;' }, ` ${s.progress}%`),
        ]),
        el('td', {}, `${s.mastery} / 5`),
        el('td', {}, s.finalScore !== null ? `${s.finalScore}%` : '—'),
        el('td', {}, s.misconception),
      ]))),
    ]),
  ]));
}
