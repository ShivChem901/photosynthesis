import { el, atomChip, showFeedback, confettiBurst, speak, quizQuestion } from '../utils.js';
import { visitModule, completeModule } from '../state.js';

// Canonical answer: 6 CO2 + 6 H2O -> C6H12O6 + 6 O2 (glucose coefficient is always 1)
const ANSWER = { co2: 6, h2o: 6, o2: 6 };

const DIFFICULTY = {
  1: {
    label: 'Level 1 — Scaffolded',
    desc: 'The oxygen coefficient is filled in for you. Find the other two.',
    start: { co2: null, h2o: null, o2: 6 },
    locked: ['o2'],
  },
  2: {
    label: 'Level 2 — Standard',
    desc: 'All three coefficients are blank. Balance the whole equation yourself.',
    start: { co2: null, h2o: null, o2: null },
    locked: [],
  },
  3: {
    label: 'Level 3 — Fix the Mistake',
    desc: 'This equation was balanced incorrectly. Find and fix every wrong coefficient.',
    start: { co2: 3, h2o: 2, o2: 3 },
    locked: [],
  },
};

let styleInjected = false;
function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.id = 'module3-styles';
  style.textContent = `
    .eq-row { display:flex; align-items:center; flex-wrap:wrap; gap:0.5rem; font-size:1.5rem; font-weight:700; margin:1.25rem 0; }
    .eq-term { display:flex; align-items:center; gap:0.35rem; }
    .coef-blank {
      display:inline-flex; align-items:center; justify-content:center;
      width:2.6rem; height:2.6rem; border-radius:10px;
      border:3px dashed var(--border); background:var(--bg); font-size:1.3rem; font-weight:800;
      color: var(--green-700);
    }
    :root[data-theme='dark'] .coef-blank { color: var(--green-300); }
    .coef-blank.filled { border-style:solid; border-color: var(--green-500); background: var(--green-100); }
    .coef-blank.locked { border-color: var(--sun-500); background: var(--sun-300); color:#3a2a00; }
    .coef-blank.correct-glow { animation: coefPop 0.5s ease; }
    @keyframes coefPop { 0%{ transform:scale(1);} 40%{ transform:scale(1.25);} 100%{ transform:scale(1);} }
    .coef-palette { display:flex; gap:0.5rem; flex-wrap:wrap; margin: 0.75rem 0 1.25rem; }
    .coef-tile {
      width:2.8rem; height:2.8rem; border-radius:50%; border:2px solid var(--green-700);
      background: var(--bg-elevated); color: var(--green-700); font-weight:800; font-size:1.1rem; cursor:pointer;
    }
    :root[data-theme='dark'] .coef-tile { color: var(--green-300); border-color: var(--green-300); }
    .coef-tile.selected { background: var(--green-700); color:#fff; transform: scale(1.1); }
    .coef-tile:hover { background: var(--green-100); }
    .atom-counter-row { display:flex; gap:2rem; flex-wrap:wrap; margin: 1rem 0; }
    .atom-counter-side h4 { margin: 0 0 0.4rem; }
    .atom-counter-list { display:flex; gap:0.5rem; }
    .atom-counter-list .atom-chip.mismatch { outline: 3px solid #e76f51; }
    .atom-counter-list .atom-chip.match { outline: 3px solid #2a9d8f; }
    .mode-card-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); }
    .mode-card { cursor:pointer; text-align:left; border:2px solid var(--border); }
    .mode-card:hover { border-color: var(--green-500); }
    .step-indicator { display:flex; gap:0.5rem; margin-bottom:1rem; }
    .step-dot {
      width:2rem; height:2rem; border-radius:50%; display:flex; align-items:center; justify-content:center;
      background: var(--border); color: var(--text-muted); font-weight:700; font-size:0.85rem;
    }
    .step-dot.active { background: var(--green-700); color:#fff; }
    .step-dot.done { background:#2a9d8f; color:#fff; }
    .inventory-table td, .inventory-table th { text-align:center; }
    .conservation-callout {
      background: var(--green-100); border-left:5px solid var(--green-700); border-radius:8px;
      padding:1rem 1.25rem; margin:1rem 0;
    }
    .timer-badge { font-weight:700; }
  `;
  document.head.appendChild(style);
}

export function render(container) {
  injectStyles();
  visitModule('module3');
  showModeSelect(container);
}

function heading(container) {
  container.append(
    el('h1', {}, 'Module 3: Balance the Photosynthesis Equation'),
    el('p', { class: 'essential-question' }, 'Every atom that starts the reaction has to show up somewhere at the end. Balancing proves it.')
  );
}

function showModeSelect(container) {
  container.innerHTML = '';
  heading(container);

  const modes = [
    { id: 'guided', icon: '🧭', title: 'Step-by-Step', desc: 'A guided walkthrough that balances carbon, then hydrogen, then oxygen — one at a time.' },
    { id: 'practice', icon: '🎯', title: 'Practice Mode', desc: 'Drag coefficients onto the equation with live atom counters and hints.' },
    { id: 'challenge', icon: '🏁', title: 'Challenge Mode', desc: 'Balance it yourself, timed, with no hints and no live counters.' },
  ];

  container.append(
    el('section', { class: 'card mt-2' }, [
      el('h2', { class: 'section-title' }, 'Unbalanced equation'),
      el('p', { class: 'eq-row', style: 'font-size:1.6rem;' }, 'CO₂ + H₂O → C₆H₁₂O₆ + O₂'),
      el('p', { class: 'text-muted' }, 'Right now, this equation is chemically impossible — count the atoms and you’ll see the two sides don’t match. Choose a mode below to fix that.'),
    ]),
    el('section', { class: 'mode-card-grid mt-2' },
      modes.map((m) => el('button', {
        class: 'card mode-card',
        type: 'button',
        onclick: () => {
          if (m.id === 'guided') showGuided(container);
          else showFreeform(container, m.id, 2);
        },
      }, [
        el('div', { class: 'module-icon', 'aria-hidden': 'true' }, m.icon),
        el('h3', {}, m.title),
        el('p', { class: 'text-muted' }, m.desc),
      ]))
    )
  );
}

// ---------------- Guided step-by-step mode ----------------
function showGuided(container) {
  container.innerHTML = '';
  heading(container);

  let step = 0;
  let coefs = { co2: 1, h2o: 1, o2: 1 };

  const steps = [
    {
      title: 'Step 1 — Balance Carbon',
      body: () => el('div', {}, [
        el('p', {}, ['Look at carbon (', atomChip('C'), '). Each CO₂ has 1 carbon. Glucose, C₆H₁₂O₆, has 6 carbons.']),
        el('p', {}, 'How many CO₂ molecules do you need so the carbons match on both sides?'),
        coefficientPicker('co2', coefs.co2, (v) => { coefs.co2 = v; }),
      ]),
      check: () => coefs.co2 === ANSWER.co2,
      hint: 'You need one CO₂ for every carbon in glucose. Glucose has 6 carbons, so try 6.',
    },
    {
      title: 'Step 2 — Balance Hydrogen',
      body: () => el('div', {}, [
        el('p', {}, ['Now look at hydrogen (', atomChip('H'), '). Each H₂O has 2 hydrogens. Glucose has 12 hydrogens.']),
        el('p', {}, 'How many H₂O molecules do you need?'),
        coefficientPicker('h2o', coefs.h2o, (v) => { coefs.h2o = v; }),
      ]),
      check: () => coefs.h2o === ANSWER.h2o,
      hint: 'Glucose has 12 hydrogens, and each water molecule only supplies 2. 12 ÷ 2 = 6.',
    },
    {
      title: 'Step 3 — Balance Oxygen',
      body: () => {
        const leftO = coefs.co2 * 2 + coefs.h2o * 1;
        return el('div', {}, [
          el('p', {}, ['Finally, oxygen (', atomChip('O'), '). Count every oxygen atom on the left: ', String(coefs.co2), '×CO₂ + ', String(coefs.h2o), '×H₂O = ', el('strong', {}, String(leftO)), ' oxygen atoms.']),
          el('p', {}, ['Glucose already supplies 6 oxygens. The rest must come from O₂ (2 oxygens each).']),
          el('p', {}, 'How many O₂ molecules do you need?'),
          coefficientPicker('o2', coefs.o2, (v) => { coefs.o2 = v; }),
        ]);
      },
      check: () => coefs.o2 === ANSWER.o2,
      hint: 'Left side has 18 oxygen atoms total. Glucose uses 6, leaving 12 for O₂. 12 ÷ 2 = 6.',
    },
  ];

  function renderStep() {
    container.querySelectorAll('.guided-area').forEach((n) => n.remove());
    const wrap = el('div', { class: 'guided-area' });

    wrap.appendChild(el('div', { class: 'step-indicator' },
      steps.map((s, i) => el('span', {
        class: `step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`,
        'aria-label': i < step ? `${s.title} complete` : s.title,
      }, i < step ? '✓' : String(i + 1)))
    ));

    if (step < steps.length) {
      const s = steps[step];
      wrap.append(
        el('section', { class: 'card' }, [
          el('h2', { class: 'section-title' }, s.title),
          s.body(),
          el('div', { class: 'flex gap-1 mt-2' }, [
            el('button', {
              class: 'btn btn-primary',
              type: 'button',
              onclick: () => {
                if (s.check()) {
                  showFeedback('Correct! On to the next atom.', 'success');
                  speak(s.title + ' complete.');
                  step += 1;
                  renderStep();
                } else {
                  showFeedback(s.hint, 'error');
                }
              },
            }, 'Check This Step'),
          ]),
          liveEquation(coefs),
        ])
      );
    } else {
      wrap.appendChild(showSuccess(container, coefs, 'guided'));
    }
    container.appendChild(wrap);
  }

  renderStep();
}

function coefficientPicker(key, current, onChange) {
  const row = el('div', { class: 'coef-palette', role: 'radiogroup', 'aria-label': `Coefficient for ${key}` });
  for (let n = 1; n <= 6; n++) {
    row.appendChild(el('button', {
      class: `coef-tile ${current === n ? 'selected' : ''}`,
      type: 'button',
      'aria-pressed': String(current === n),
      onclick: (e) => {
        row.querySelectorAll('.coef-tile').forEach((b) => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        onChange(n);
      },
    }, String(n)));
  }
  return row;
}

function liveEquation(coefs) {
  return el('p', { class: 'eq-row mt-2' }, [
    String(coefs.co2), 'CO₂ + ', String(coefs.h2o), 'H₂O → C₆H₁₂O₆ + ', String(coefs.o2), 'O₂',
  ]);
}

// ---------------- Freeform practice/challenge mode ----------------
function showFreeform(container, mode, difficultyLevel) {
  container.innerHTML = '';
  heading(container);
  const hintsOn = mode === 'practice';
  const timed = mode === 'challenge';
  const level = DIFFICULTY[difficultyLevel];
  const coefs = { ...level.start };
  let selectedTile = null;
  let mistakes = 0;
  let timeLeft = 120;
  let timerId = null;

  const difficultyBar = el('div', { class: 'flex gap-1 flex-wrap mt-1' },
    [1, 2, 3].map((lvl) => el('button', {
      class: `btn ${lvl === difficultyLevel ? 'btn-primary' : ''}`,
      type: 'button',
      onclick: () => { clearInterval(timerId); showFreeform(container, mode, lvl); },
    }, DIFFICULTY[lvl].label))
  );

  const card = el('section', { class: 'card mt-2' });
  card.append(
    el('h2', { class: 'section-title' }, mode === 'practice' ? '🎯 Practice Mode' : '🏁 Challenge Mode'),
    el('p', { class: 'text-muted' }, level.desc),
    difficultyBar
  );

  if (timed) {
    const timerEl = el('p', { class: 'timer-badge mt-1' }, `⏱️ Time left: ${timeLeft}s`);
    card.appendChild(timerEl);
    timerId = setInterval(() => {
      timeLeft -= 1;
      timerEl.textContent = `⏱️ Time left: ${timeLeft}s`;
      if (timeLeft <= 0) {
        clearInterval(timerId);
        showFeedback('Time’s up! Try again to beat the clock.', 'error');
        eqRow.querySelectorAll('.coef-blank').forEach((b) => (b.style.pointerEvents = 'none'));
      }
    }, 1000);
  }

  const palette = el('div', { class: 'coef-palette', role: 'radiogroup', 'aria-label': 'Coefficient tiles' });
  for (let n = 1; n <= 6; n++) {
    const tile = el('button', {
      class: 'coef-tile',
      type: 'button',
      'data-drag-id': `coef-${n}`,
      draggable: 'true',
      onclick: (e) => {
        palette.querySelectorAll('.coef-tile').forEach((b) => b.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        selectedTile = n;
      },
      ondragstart: (e) => { e.dataTransfer.setData('text/plain', String(n)); },
    }, String(n));
    palette.appendChild(tile);
  }
  card.appendChild(el('p', { class: 'text-muted mt-1' }, 'Click a number, then click a blank below — or drag a number onto a blank.'));
  card.appendChild(palette);

  const eqRow = el('div', { class: 'eq-row' });
  const blanks = {};

  function makeBlank(key) {
    const locked = level.locked.includes(key);
    const blank = el('span', {
      class: `coef-blank ${coefs[key] ? 'filled' : ''} ${locked ? 'locked' : ''}`,
      tabindex: '0',
      role: 'button',
      'aria-label': `Coefficient for ${key === 'co2' ? 'carbon dioxide' : key === 'h2o' ? 'water' : 'oxygen gas'}, currently ${coefs[key] || 'blank'}`,
      onclick: () => { if (!locked && selectedTile) assign(key, selectedTile); },
      onkeydown: (e) => {
        if (locked) return;
        if (e.key === 'ArrowUp') { assign(key, Math.min(6, (coefs[key] || 0) + 1)); e.preventDefault(); }
        if (e.key === 'ArrowDown') { assign(key, Math.max(1, (coefs[key] || 1) - 1)); e.preventDefault(); }
      },
      ondragover: (e) => !locked && e.preventDefault(),
      ondrop: (e) => {
        e.preventDefault();
        if (locked) return;
        const v = parseInt(e.dataTransfer.getData('text/plain'), 10);
        if (v) assign(key, v);
      },
    }, coefs[key] ? String(coefs[key]) : '?');
    blanks[key] = blank;
    return blank;
  }

  eqRow.append(
    el('span', { class: 'eq-term' }, [makeBlank('co2'), 'CO₂']), ' + ',
    el('span', { class: 'eq-term' }, [makeBlank('h2o'), 'H₂O']), ' → ',
    el('span', { class: 'eq-term' }, ['C₆H₁₂O₆']), ' + ',
    el('span', { class: 'eq-term' }, [makeBlank('o2'), 'O₂'])
  );
  card.appendChild(eqRow);

  const counterHost = el('div', { class: 'mt-2' });
  card.appendChild(counterHost);

  const actionRow = el('div', { class: 'flex gap-1 mt-2' }, [
    el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onclick: () => {
        clearInterval(timerId);
        const correct = coefs.co2 === ANSWER.co2 && coefs.h2o === ANSWER.h2o && coefs.o2 === ANSWER.o2;
        if (correct) {
          const score = Math.max(50, 100 - mistakes * 10 - (timed ? Math.max(0, 30 - timeLeft) / 2 : 0));
          card.remove();
          container.appendChild(showSuccess(container, coefs, mode, Math.round(score)));
        } else {
          mistakes += 1;
          if (hintsOn) {
            showFeedback(bestHint(coefs), 'error');
          } else {
            showFeedback('Not balanced yet. Recount the atoms on each side.', 'error');
          }
        }
      },
    }, 'Check My Equation'),
  ]);
  card.appendChild(actionRow);

  function assign(key, value) {
    coefs[key] = value;
    blanks[key].textContent = String(value);
    blanks[key].classList.add('filled', 'correct-glow');
    setTimeout(() => blanks[key].classList.remove('correct-glow'), 500);
    if (hintsOn) renderCounters();
  }

  function renderCounters() {
    counterHost.innerHTML = '';
    const left = { C: (coefs.co2 || 0) * 1, H: (coefs.h2o || 0) * 2, O: (coefs.co2 || 0) * 2 + (coefs.h2o || 0) * 1 };
    const right = { C: 6, H: 12, O: 6 + (coefs.o2 || 0) * 2 };
    counterHost.append(
      el('div', { class: 'atom-counter-row' }, [
        el('div', { class: 'atom-counter-side' }, [
          el('h4', {}, 'Reactant side'),
          el('div', { class: 'atom-counter-list' }, ['C', 'H', 'O'].map((e2) => {
            const chip = atomChip(e2, left[e2]);
            chip.classList.add(left[e2] === right[e2] ? 'match' : 'mismatch');
            return chip;
          })),
        ]),
        el('div', { class: 'atom-counter-side' }, [
          el('h4', {}, 'Product side'),
          el('div', { class: 'atom-counter-list' }, ['C', 'H', 'O'].map((e2) => {
            const chip = atomChip(e2, right[e2]);
            chip.classList.add(left[e2] === right[e2] ? 'match' : 'mismatch');
            return chip;
          })),
        ]),
      ])
    );
  }

  function bestHint(c) {
    const left = { C: (c.co2 || 0) * 1, H: (c.h2o || 0) * 2, O: (c.co2 || 0) * 2 + (c.h2o || 0) * 1 };
    const right = { C: 6, H: 12, O: 6 + (c.o2 || 0) * 2 };
    if (left.C !== right.C) return `Carbon doesn’t match: ${left.C} on the left vs ${right.C} on the right. Adjust the CO₂ coefficient.`;
    if (left.H !== right.H) return `Hydrogen doesn’t match: ${left.H} on the left vs ${right.H} on the right. Adjust the H₂O coefficient.`;
    if (left.O !== right.O) return `Oxygen doesn’t match: ${left.O} on the left vs ${right.O} on the right. Adjust the O₂ coefficient.`;
    return 'Almost there — double check every coefficient.';
  }

  if (hintsOn) renderCounters();
  container.appendChild(card);
}

// ---------------- Shared success screen ----------------
function showSuccess(container, coefs, mode, score = 100) {
  confettiBurst();
  showFeedback('Balanced! Every atom is accounted for.', 'success');
  speak('Balanced. Six C O 2 plus six H 2 O yields C 6 H 12 O 6 plus six O 2.');

  const wrap = el('div', { class: 'success-area' });
  wrap.append(
    el('section', { class: 'card' }, [
      el('h2', { class: 'section-title' }, '✅ Balanced Equation'),
      el('p', { class: 'eq-row', style: 'color:var(--green-700)' }, '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'),
      el('div', { class: 'conservation-callout' }, [
        el('p', {}, [el('strong', {}, 'Every carbon atom'), ' is accounted for: 6 in, 6 out.']),
        el('p', {}, [el('strong', {}, 'Every hydrogen atom'), ' is accounted for: 12 in, 12 out.']),
        el('p', {}, [el('strong', {}, 'Every oxygen atom'), ' is accounted for: 18 in, 18 out.']),
        el('p', {}, 'No atoms disappear. No atoms are created. Balancing the equation is direct evidence of the Law of Conservation of Matter.'),
      ]),
      atomInventory(),
    ])
  );

  const quizHost = el('section', { class: 'card mt-2' }, [
    el('h2', { class: 'section-title' }, 'Quick Check'),
  ]);
  let correctCount = 0;
  const questions = [
    {
      question: 'Why does the balanced equation prove matter is conserved?',
      choices: [
        'Because the same number of each type of atom appears on both sides.',
        'Because glucose is heavier than carbon dioxide.',
        'Because oxygen gas always has a coefficient of 6.',
      ],
      correctIndex: 0,
    },
    {
      question: 'In 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, how many total oxygen atoms are on the reactant side?',
      choices: ['6', '12', '18'],
      correctIndex: 2,
    },
    {
      question: 'What happens to atoms during a chemical reaction like photosynthesis?',
      choices: [
        'They are destroyed and new ones are created.',
        'They are rearranged into new molecules, but none are gained or lost.',
        'They disappear and reappear later.',
      ],
      correctIndex: 1,
    },
  ];
  questions.forEach((q) => quizHost.appendChild(quizQuestion({ ...q, onAnswer: (ok) => { if (ok) correctCount += 1; } })));

  const finishBtn = el('button', {
    class: 'btn btn-primary mt-2',
    type: 'button',
    onclick: () => {
      const quizPct = Math.round((correctCount / questions.length) * 100);
      const finalScore = Math.round(score * 0.6 + quizPct * 0.4);
      completeModule('module3', finalScore);
      showFeedback(`Module 3 complete! Score: ${finalScore}%`, 'success');
      confettiBurst();
      import('../modules-hub.js').then((m) => {
        container.innerHTML = '';
        m.render(container);
      });
    },
  }, 'Finish Module 3');

  wrap.append(quizHost, finishBtn);
  return wrap;
}

function atomInventory() {
  const rows = [
    { el: 'C', left: 6, right: 6 },
    { el: 'H', left: 12, right: 12 },
    { el: 'O', left: 18, right: 18 },
  ];
  return el('div', { class: 'mt-2' }, [
    el('h3', {}, 'Atom Inventory'),
    el('table', { class: 'inventory-table' }, [
      el('thead', {}, el('tr', {}, [el('th', {}, 'Element'), el('th', {}, 'Reactant side'), el('th', {}, 'Product side'), el('th', {}, 'Match?')])),
      el('tbody', {}, rows.map((r) => el('tr', {}, [
        el('td', {}, atomChip(r.el)),
        el('td', {}, String(r.left)),
        el('td', {}, String(r.right)),
        el('td', {}, r.left === r.right ? '✅' : '❌'),
      ]))),
    ]),
  ]);
}
