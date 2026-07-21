// Game 5: Escape the Greenhouse
// A 4-door puzzle "escape room" reinforcing: balancing the photosynthesis equation,
// sorting reactants/products, checking conservation of matter (atom counts), and
// labeling a simplified input/output/energy-transformation model.

import { el, showFeedback, confettiBurst, quizQuestion, shuffle, makeDraggable, makeDropzone } from '../utils.js';
import { recordGameScore } from '../state.js';

const STYLE_ID = 'escape-greenhouse-style';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .eg-wrap { display: flex; flex-direction: column; gap: 1.25rem; }
    .eg-doors { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .eg-door {
      flex: 1 1 140px;
      border: 2px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem;
      text-align: center;
      background: var(--bg-elevated);
      transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
    }
    .eg-door .eg-door-icon { font-size: 1.6rem; display: block; }
    .eg-door .eg-door-label { font-size: 0.78rem; font-weight: 600; margin-top: 0.25rem; }
    .eg-door .eg-door-state { font-size: 0.72rem; color: var(--text-muted); }
    .eg-door.is-current { border-color: var(--sun-500); box-shadow: 0 0 0 3px rgba(255, 183, 3, 0.25); }
    .eg-door.is-unlocked { border-color: var(--green-500); }
    .eg-door.is-locked { opacity: 0.72; }
    .eg-door.eg-pulse { animation: eg-doorPulse 0.7s ease; }
    @keyframes eg-doorPulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.08); box-shadow: 0 0 0 6px rgba(64, 145, 108, 0.35); }
      100% { transform: scale(1); }
    }
    .eg-puzzle-card { animation: eg-fadeSlide 0.45s ease; }
    @keyframes eg-fadeSlide {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .eg-equation {
      display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;
      font-size: 1.15rem; font-weight: 600; margin: 1rem 0;
      background: var(--green-100); border-radius: var(--radius); padding: 1rem;
    }
    .eg-coef-input {
      width: 3.2rem; font-size: 1.1rem; font-weight: 700; text-align: center;
      border: 2px solid var(--border); border-radius: 8px; padding: 0.3rem;
      background: var(--bg-elevated); color: var(--text);
    }
    .eg-coef-input:focus-visible { outline: var(--focus-ring); outline-offset: 2px; }
    .eg-items { display: flex; flex-direction: column; gap: 0.6rem; margin: 1rem 0; }
    .eg-item {
      border: 2px solid var(--border); border-radius: var(--radius);
      padding: 0.6rem 0.8rem; background: var(--bg-elevated);
    }
    .eg-item-label { font-weight: 600; display: block; margin-bottom: 0.4rem; }
    .eg-assign-row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .eg-assign-btn {
      border: 2px solid var(--border); background: transparent; color: var(--text);
      padding: 0.35rem 0.7rem; border-radius: 999px; cursor: pointer; font-size: 0.85rem;
    }
    .eg-assign-btn:hover { border-color: var(--green-500); }
    .eg-assign-btn.is-pressed { border-color: var(--green-700); background: var(--green-100); font-weight: 700; }
    .eg-assign-btn.is-pressed::before { content: "\\2713  "; }
    .eg-item-status { margin: 0.35rem 0 0; font-size: 0.8rem; }
    .eg-bins { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin: 0.75rem 0; }
    .eg-bin h4 { margin: 0 0 0.4rem; color: var(--green-700); }
    :root[data-theme='dark'] .eg-bin h4 { color: var(--green-300); }
    .eg-bin-zone { min-height: 64px; }
    .eg-atomcheck { margin-top: 0.5rem; }
    .eg-final-card { text-align: center; }
    .eg-final-card .eg-final-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
  `;
  document.head.appendChild(style);
}

// ---------- Content constants ----------

const REACTANT_PRODUCT_ITEMS = [
  { id: 'sunlight', label: 'Sunlight (light energy)' },
  { id: 'co2', label: 'Carbon dioxide (CO₂)' },
  { id: 'water', label: 'Water (H₂O)' },
  { id: 'glucose', label: 'Glucose (C₆H₁₂O₆)' },
  { id: 'oxygen', label: 'Oxygen (O₂)' },
];
const REACTANT_PRODUCT_BINS = [
  { id: 'reactant', label: 'Reactant' },
  { id: 'product', label: 'Product' },
];
const REACTANT_PRODUCT_CORRECT = {
  sunlight: 'reactant', co2: 'reactant', water: 'reactant',
  glucose: 'product', oxygen: 'product',
};
const REACTANT_PRODUCT_HINTS = {
  sunlight: 'Sunlight is absorbed to power the reaction before anything is made — that makes it a Reactant.',
  co2: 'Carbon dioxide is taken in from the air before the reaction happens — that makes it a Reactant.',
  water: 'Water is absorbed by the roots before the reaction happens — that makes it a Reactant.',
  glucose: 'Glucose is newly made as a result of the reaction — that makes it a Product.',
  oxygen: 'Oxygen is released only after the reaction happens — that makes it a Product.',
};

const MODEL_ITEMS = [
  { id: 'co2', label: 'Carbon dioxide (CO₂) — from the air' },
  { id: 'water', label: 'Water (H₂O) — from the soil' },
  { id: 'light', label: 'Light energy — from the sun' },
  { id: 'transform', label: 'Light energy is captured and transformed into chemical energy' },
  { id: 'glucose', label: 'Glucose (C₆H₁₂O₆) — stored chemical energy' },
  { id: 'oxygen', label: 'Oxygen (O₂) — released into the air' },
];
const MODEL_BINS = [
  { id: 'inputs', label: 'Inputs' },
  { id: 'transform', label: 'Energy Transformation' },
  { id: 'outputs', label: 'Outputs' },
];
const MODEL_CORRECT = {
  co2: 'inputs', water: 'inputs', light: 'inputs',
  transform: 'transform',
  glucose: 'outputs', oxygen: 'outputs',
};
const MODEL_HINTS = {
  co2: 'Carbon dioxide enters the plant before anything happens — that makes it an Input.',
  water: 'Water enters through the roots before anything happens — that makes it an Input.',
  light: 'Light energy enters the system from the sun — that makes it an Input.',
  transform: 'This describes what HAPPENS to the energy, not a substance going in or out — it belongs under Energy Transformation.',
  glucose: 'Glucose is made and stored by the plant as a result of the process — that makes it an Output.',
  oxygen: 'Oxygen is released as a byproduct once the process is finished — that makes it an Output.',
};

const ATOM_QUESTIONS = [
  {
    q: 'The balanced equation is 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂. How many total carbon atoms are on the reactant side (in 6CO₂)?',
    choices: ['1', '6', '12', '36'],
    correctIndex: 1,
    hint: 'Each CO₂ has 1 carbon atom, and there are 6 molecules: 6 × 1 = 6.',
  },
  {
    q: 'How many total carbon atoms are in the product C₆H₁₂O₆?',
    choices: ['1', '6', '12', '18'],
    correctIndex: 1,
    hint: 'The subscript right after the C in C₆H₁₂O₆ tells you directly: 6 carbon atoms.',
  },
  {
    q: 'How many total oxygen atoms are on the reactant side — count every O in 6CO₂ and 6H₂O?',
    choices: ['12', '16', '18', '24'],
    correctIndex: 2,
    hint: '6CO₂ contributes 6×2 = 12 oxygens, and 6H₂O contributes 6×1 = 6 oxygens. 12 + 6 = 18.',
  },
  {
    q: 'How many total oxygen atoms are on the product side — count every O in C₆H₁₂O₆ and 6O₂?',
    choices: ['12', '16', '18', '24'],
    correctIndex: 2,
    hint: 'Glucose supplies 6 oxygens, and 6O₂ supplies 6×2 = 12 more. 6 + 12 = 18 — matter is conserved!',
  },
];

// ---------- Reusable click/drag sorting puzzle ----------

function buildSortPuzzle({ items, bins, correctMap, hints, onSolved, onWrong }) {
  const shuffled = shuffle(items);
  const assign = {};
  const wrap = el('div', { class: 'eg-sort' });
  const itemPool = el('div', { class: 'eg-items', role: 'list' });
  const binsRow = el('div', { class: 'eg-bins' });

  function refreshItemUI(itemEl, itemId) {
    itemEl.querySelectorAll('.eg-assign-btn').forEach((btn) => {
      const pressed = assign[itemId] === btn.dataset.binId;
      btn.setAttribute('aria-pressed', String(pressed));
      btn.classList.toggle('is-pressed', pressed);
    });
    const status = itemEl.querySelector('.eg-item-status');
    const binLabel = assign[itemId] ? bins.find((b) => b.id === assign[itemId]).label : 'not placed yet';
    status.textContent = `Currently placed in: ${binLabel}`;
  }

  shuffled.forEach((item) => {
    const itemEl = el('div', { class: 'eg-item', role: 'listitem' });
    itemEl.dataset.dragId = item.id;
    makeDraggable(itemEl);
    itemEl.appendChild(el('span', { class: 'eg-item-label' }, item.label));
    const btnRow = el('div', { class: 'eg-assign-row' });
    bins.forEach((bin) => {
      const btn = el('button', {
        type: 'button',
        class: 'eg-assign-btn',
        'aria-pressed': 'false',
        'aria-label': `Place "${item.label}" into ${bin.label}`,
        onclick: () => {
          assign[item.id] = bin.id;
          refreshItemUI(itemEl, item.id);
        },
      }, bin.label);
      btn.dataset.binId = bin.id;
      btnRow.appendChild(btn);
    });
    itemEl.appendChild(btnRow);
    itemEl.appendChild(el('p', { class: 'eg-item-status text-muted' }, 'Currently placed in: not placed yet'));
    itemPool.appendChild(itemEl);
  });

  bins.forEach((bin) => {
    const binEl = el('div', { class: 'eg-bin' });
    binEl.appendChild(el('h4', {}, bin.label));
    const zone = el('div', { class: 'eg-bin-zone', 'aria-label': `${bin.label} drop zone` });
    makeDropzone(zone, {
      accepts: (id) => items.some((i) => i.id === id),
      onDrop: (id) => {
        assign[id] = bin.id;
        const itemEl = itemPool.querySelector(`[data-drag-id="${id}"]`);
        if (itemEl) refreshItemUI(itemEl, id);
      },
    });
    binEl.appendChild(zone);
    binsRow.appendChild(binEl);
  });

  const checkBtn = el('button', {
    class: 'btn btn-primary mt-2',
    type: 'button',
    onclick: () => {
      let allCorrect = true;
      let firstWrong = null;
      items.forEach((item) => {
        if (assign[item.id] !== correctMap[item.id]) {
          allCorrect = false;
          if (!firstWrong) firstWrong = item.id;
        }
      });
      if (allCorrect) {
        onSolved();
      } else {
        onWrong && onWrong();
        const missing = items.find((item) => !assign[item.id]);
        const hintKey = firstWrong || (missing ? missing.id : null);
        showFeedback(hints[hintKey] || 'Not quite — double-check where each item belongs.', 'error');
      }
    },
  }, 'Check My Sorting');

  wrap.append(itemPool, binsRow, checkBtn);
  return wrap;
}

// ---------- Door 1: balance the equation ----------

function buildEquationPuzzle({ onSolved, onWrong }) {
  const wrap = el('div', { class: 'eg-equation-wrap' });
  wrap.appendChild(el('p', {}, 'Fill in the missing coefficients (the big numbers placed in front of each formula) to balance the equation for photosynthesis:'));

  const co2Input = el('input', { type: 'number', min: '1', max: '12', value: '1', class: 'eg-coef-input', 'aria-label': 'Coefficient for carbon dioxide, CO2' });
  const h2oInput = el('input', { type: 'number', min: '1', max: '12', value: '1', class: 'eg-coef-input', 'aria-label': 'Coefficient for water, H2O' });
  const o2Input = el('input', { type: 'number', min: '1', max: '12', value: '1', class: 'eg-coef-input', 'aria-label': 'Coefficient for oxygen gas, O2' });

  const eq = el('div', { class: 'eg-equation', role: 'group', 'aria-label': 'Balance the photosynthesis equation' }, [
    co2Input,
    el('span', {}, ' CO₂  +  '),
    h2oInput,
    el('span', {}, ' H₂O   →   C₆H₁₂O₆  +  '),
    o2Input,
    el('span', {}, ' O₂'),
  ]);

  const checkBtn = el('button', {
    class: 'btn btn-primary mt-2',
    type: 'button',
    onclick: () => {
      const co2 = parseInt(co2Input.value, 10);
      const h2o = parseInt(h2oInput.value, 10);
      const o2 = parseInt(o2Input.value, 10);
      if (co2 === 6 && h2o === 6 && o2 === 6) {
        onSolved();
        return;
      }
      onWrong && onWrong();
      let hint;
      if (co2 !== 6) {
        hint = 'Look at the carbons: glucose (C₆H₁₂O₆) contains 6 carbon atoms, and each CO₂ supplies only 1 carbon. How many CO₂ molecules are needed?';
      } else if (h2o !== 6) {
        hint = 'Carbon checks out. Now look at the hydrogens: glucose contains 12 hydrogen atoms, and each H₂O supplies 2. How many water molecules are needed?';
      } else {
        hint = 'Carbon and hydrogen are balanced. Now count every oxygen atom on the reactant side (from your CO₂ and H₂O) and make sure that same number appears on the product side — remember O₂ carries 2 oxygens per molecule.';
      }
      showFeedback(hint, 'error');
    },
  }, 'Check Balance');

  wrap.append(eq, checkBtn);
  return wrap;
}

// ---------- Door 3: atom / matter conservation check ----------

function buildAtomCheckPuzzle({ onSolved, onWrong }) {
  let idx = 0;
  const host = el('div', { class: 'eg-atomcheck' });
  const progress = el('p', { class: 'text-muted' }, '');
  const qHost = el('div', {});
  host.append(progress, qHost);

  function renderQuestion() {
    qHost.innerHTML = '';
    progress.textContent = `Check ${idx + 1} of ${ATOM_QUESTIONS.length}`;
    const cfg = ATOM_QUESTIONS[idx];
    const qEl = quizQuestion({
      question: cfg.q,
      choices: cfg.choices,
      correctIndex: cfg.correctIndex,
      onAnswer: (correct) => {
        if (correct) {
          idx += 1;
          if (idx >= ATOM_QUESTIONS.length) {
            showFeedback('All atoms are accounted for on both sides — matter is conserved!', 'success');
            setTimeout(onSolved, 900);
          } else {
            setTimeout(renderQuestion, 700);
          }
        } else {
          onWrong && onWrong();
          showFeedback(cfg.hint, 'error');
          setTimeout(renderQuestion, 1900);
        }
      },
    });
    qHost.appendChild(qEl);
  }

  renderQuestion();
  return host;
}

// ---------- Door state machine ----------

const DOORS = [
  {
    title: 'Door 1 — Balance the Equation',
    intro: 'This door is sealed with an unbalanced equation. Balance it to unlock the door.',
    build: buildEquationPuzzle,
  },
  {
    title: 'Door 2 — Reactants & Products',
    intro: 'Sort each item into the correct bin: Reactant (goes in) or Product (comes out).',
    build: (hooks) => buildSortPuzzle({
      items: REACTANT_PRODUCT_ITEMS,
      bins: REACTANT_PRODUCT_BINS,
      correctMap: REACTANT_PRODUCT_CORRECT,
      hints: REACTANT_PRODUCT_HINTS,
      ...hooks,
    }),
  },
  {
    title: 'Door 3 — Atom & Matter Check',
    intro: 'Prove matter is conserved by checking that atoms match up on both sides of the equation.',
    build: buildAtomCheckPuzzle,
  },
  {
    title: 'Door 4 — Complete the Model (Final Door!)',
    intro: 'Label the simplified model of photosynthesis: sort each piece into Inputs, Energy Transformation, or Outputs.',
    build: (hooks) => buildSortPuzzle({
      items: MODEL_ITEMS,
      bins: MODEL_BINS,
      correctMap: MODEL_CORRECT,
      hints: MODEL_HINTS,
      ...hooks,
    }),
  },
];

export function render(container) {
  injectStyles();
  container.innerHTML = '';

  const gameState = { doorIndex: 0, wrongAttempts: 0, escaped: false };

  const root = el('div', { class: 'eg-wrap' });
  container.appendChild(root);

  function doorStatusLabel(i) {
    if (i < gameState.doorIndex) return 'Unlocked';
    if (i === gameState.doorIndex) return gameState.escaped ? 'Unlocked' : 'In progress';
    return 'Locked';
  }

  function renderDoorTrack() {
    const track = el('div', { class: 'eg-doors', role: 'list', 'aria-label': 'Door progress' });
    DOORS.forEach((door, i) => {
      const unlocked = i < gameState.doorIndex || (i === gameState.doorIndex && gameState.escaped);
      const isCurrent = i === gameState.doorIndex && !gameState.escaped;
      const stateClass = unlocked ? 'is-unlocked' : isCurrent ? 'is-current' : 'is-locked';
      const icon = unlocked ? '\u{1F513}' : '\u{1F512}';
      track.appendChild(el('div', { class: `eg-door ${stateClass}`, role: 'listitem' }, [
        el('span', { class: 'eg-door-icon', 'aria-hidden': 'true' }, icon),
        el('span', { class: 'eg-door-label' }, `Door ${i + 1}`),
        el('span', { class: 'eg-door-state' }, doorStatusLabel(i)),
      ]));
    });
    return track;
  }

  function renderProgressBar() {
    const doneCount = gameState.escaped ? DOORS.length : gameState.doorIndex;
    const pct = Math.round((doneCount / DOORS.length) * 100);
    return el('div', {}, [
      el('p', { class: 'text-muted', 'aria-live': 'polite' }, gameState.escaped
        ? 'All doors unlocked!'
        : `Door ${gameState.doorIndex + 1} of ${DOORS.length}`),
      el('div', { class: 'progress-bar-track' }, [
        el('div', { class: 'progress-bar-fill', style: `width:${pct}%` }),
      ]),
    ]);
  }

  function pulseDoor(index) {
    const doorEls = root.querySelectorAll('.eg-door');
    const target = doorEls[Math.min(index, doorEls.length - 1)];
    if (!target) return;
    target.classList.add('eg-pulse');
    setTimeout(() => target.classList.remove('eg-pulse'), 750);
  }

  function computeScore() {
    return Math.max(50, 100 - gameState.wrongAttempts * 5);
  }

  function advanceDoor() {
    const solvedIndex = gameState.doorIndex;
    showFeedback(`Door ${solvedIndex + 1} unlocked!`, 'success');
    if (solvedIndex >= DOORS.length - 1) {
      gameState.escaped = true;
      renderAll();
      pulseDoor(solvedIndex);
      confettiBurst();
      recordGameScore('escapeGreenhouse', computeScore());
    } else {
      gameState.doorIndex += 1;
      renderAll();
      pulseDoor(solvedIndex);
    }
  }

  function renderPuzzleArea() {
    if (gameState.escaped) {
      return el('div', { class: 'card eg-final-card eg-puzzle-card' }, [
        el('span', { class: 'eg-final-icon', 'aria-hidden': 'true' }, '\u{1F33F}✅'),
        el('h2', {}, 'You escaped the greenhouse!'),
        el('p', {}, `You solved every puzzle and unlocked all ${DOORS.length} doors. Final score: ${computeScore()} / 100.`),
        el('div', { class: 'flex gap-1', style: 'justify-content:center; flex-wrap:wrap;' }, [
          el('button', {
            class: 'btn btn-primary',
            type: 'button',
            onclick: () => {
              gameState.doorIndex = 0;
              gameState.wrongAttempts = 0;
              gameState.escaped = false;
              renderAll();
            },
          }, 'Play Again'),
          el('a', { class: 'btn', href: '#/games' }, 'Back to Games'),
        ]),
      ]);
    }

    const door = DOORS[gameState.doorIndex];
    const card = el('div', { class: 'card eg-puzzle-card' });
    card.append(
      el('h2', {}, door.title),
      el('p', { class: 'text-muted' }, door.intro),
      door.build({
        onSolved: advanceDoor,
        onWrong: () => { gameState.wrongAttempts += 1; },
      })
    );
    return card;
  }

  function renderAll() {
    root.innerHTML = '';
    root.append(
      el('h1', {}, 'Escape the Greenhouse'),
      el('p', { class: 'text-muted' }, 'Solve each photosynthesis puzzle to unlock the next door — and escape!'),
      renderProgressBar(),
      renderDoorTrack(),
      renderPuzzleArea()
    );
  }

  renderAll();
}
