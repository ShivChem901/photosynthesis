// Module 5: Energy Explorer
// Students sequence energy tokens (Sunlight -> Leaf -> Glucose -> Stored Chemical Energy),
// get specific corrective feedback for wrong pathways, watch the energy "travel" once the
// order is correct, and finish with a short mini-quiz on energy transformation/conservation.

import {
  el,
  showFeedback,
  confettiBurst,
  makeDraggable,
  makeDropzone,
  quizQuestion,
  shuffle,
  clearContainer,
} from '../utils.js';
import { visitModule, completeModule, recordMisconception } from '../state.js';

const STYLE_ID = 'module5-energy-explorer-styles';

const STAGES = [
  {
    id: 'sunlight',
    icon: '☀️',
    label: 'Sunlight',
    caption: 'The original energy source',
  },
  {
    id: 'leaf',
    icon: '🍃',
    label: 'Leaf',
    caption: "Where light energy enters the plant's cells",
  },
  {
    id: 'glucose',
    icon: '🍬',
    label: 'Glucose',
    caption: 'Where energy is rebuilt into chemical form',
  },
  {
    id: 'stored',
    icon: '🔋',
    label: 'Stored Chemical Energy',
    caption: "Where energy waits in glucose's chemical bonds",
  },
];

const STAGE_BY_ID = STAGES.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
const CORRECT_ORDER = ['sunlight', 'leaf', 'glucose', 'stored'];

// Every wrong adjacent pair a student could create gets its own specific explanation.
// (12 possible ordered pairs among 4 distinct stages, minus the 3 correct ones = 9 entries.)
const WRONG_PAIR_MESSAGES = {
  'sunlight>glucose': "Energy can't jump straight from sunlight into glucose — it has to pass through the leaf's cells first.",
  'sunlight>stored': "Energy can't leap directly into storage — it must first enter the leaf and be used to build glucose.",
  'leaf>sunlight': "That's backwards. Sunlight is the original energy source, so it has to come before the leaf, not after.",
  'leaf>stored': "You skipped a step. The leaf uses light energy to build glucose before any energy can be ‘stored.’",
  'glucose>sunlight': 'That’s backwards, and it skips a step. Sunlight is the very first stage — energy has to start there before it ever reaches the leaf or glucose.',
  'glucose>leaf': "That's backwards. Inside the leaf's cells, light energy is transformed first — glucose only forms after that.",
  'stored>sunlight': "That's backwards. Sunlight is where this energy pathway begins, not where it ends.",
  'stored>leaf': 'That’s backwards, and it skips ahead. The leaf comes right after sunlight — long before energy is ‘stored.’',
  'stored>glucose': "That's backwards. Energy is stored in glucose's chemical bonds only after glucose has already formed.",
};

const QUIZ = [
  {
    question: 'What form of energy does sunlight supply at the very start of photosynthesis?',
    choices: ['Light energy', 'Chemical energy', 'Sound energy', 'Nuclear energy'],
    correctIndex: 0,
  },
  {
    question: 'After photosynthesis, where is energy actually stored?',
    choices: [
      'In the oxygen gas that is released',
      'In the chemical bonds of glucose',
      'In the water molecules taken up by the roots',
      'It is not stored anywhere — it disappears',
    ],
    correctIndex: 1,
  },
  {
    question: 'According to the Law of Conservation of Energy, what really happens to the sun’s energy during photosynthesis?',
    choices: [
      'It is destroyed once the reaction is finished',
      'The plant creates brand-new energy out of nothing',
      'It is transformed from light energy into chemical energy — the total amount stays the same',
      'It leaks out of the leaf as heat and nothing else',
    ],
    correctIndex: 2,
  },
];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = el('style', { id: STYLE_ID }, `
    .m5-concept-icon { font-size: 1.8rem; }
    .m5-equation {
      font-size: 1.2rem; text-align: center; font-weight: 700;
      color: var(--green-700); background: var(--green-100);
      border-radius: var(--radius); padding: 0.75rem; letter-spacing: 0.02em;
    }
    :root[data-theme='dark'] .m5-equation { color: var(--green-300); }
    .m5-board { display: flex; flex-direction: column; gap: 1.25rem; }
    .m5-pool { min-height: 84px; }
    .m5-board[aria-busy='true'] .m5-token,
    .m5-board[aria-busy='true'] .m5-slot { pointer-events: none; opacity: 0.85; }
    .m5-sequence { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; position: relative; }
    .m5-arrow { font-size: 1.3rem; color: var(--text-muted); flex: 0 0 auto; }
    .m5-slot {
      flex: 1 1 150px; min-width: 140px; min-height: 118px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 0.3rem; font: inherit; color: var(--text); cursor: pointer; text-align: center;
      border: 3px dashed var(--border); border-radius: var(--radius); background: var(--bg);
      transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.3s ease;
    }
    .m5-slot-filled { border-style: solid; border-color: var(--green-500); background: var(--green-100); }
    .m5-slot-step { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: 700; }
    .m5-slot-icon, .m5-token-icon { font-size: 1.7rem; }
    .m5-slot-label { font-weight: 700; font-size: 0.9rem; }
    .m5-slot-caption { font-size: 0.72rem; color: var(--text-muted); max-width: 15ch; }
    .m5-token {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      min-width: 128px; padding: 0.65rem 0.9rem; border-radius: var(--radius);
      border: 2px solid var(--border); background: var(--bg-elevated); color: var(--text);
      cursor: grab; font: inherit; text-align: center;
    }
    .m5-token-label { font-weight: 600; font-size: 0.88rem; }
    .m5-token.selected, .m5-slot-filled.selected {
      border-color: var(--sun-500); box-shadow: 0 0 0 3px rgba(255, 183, 3, 0.4);
    }
    .m5-selected-tag { display: block; font-size: 0.68rem; font-weight: 700; text-decoration: underline; }
    .m5-slot-glow {
      border-color: var(--sun-500) !important; background: var(--sun-300) !important; color: #3a2a00;
      box-shadow: 0 0 0 4px rgba(255, 183, 3, 0.45), 0 0 18px 4px rgba(255, 183, 3, 0.55);
    }
    .m5-spark {
      position: absolute; font-size: 1.6rem; pointer-events: none; z-index: 5;
      filter: drop-shadow(0 0 6px var(--sun-500));
      transition: left 0.6s ease, top 0.6s ease;
    }
    .m5-locked { text-align: center; color: var(--text-muted); padding: 1.5rem; }
  `);
  document.head.appendChild(style);
}

function stageContent(stageId) {
  const stage = STAGE_BY_ID[stageId];
  return [
    el('span', { class: 'm5-slot-icon', 'aria-hidden': 'true' }, stage.icon),
    el('span', { class: 'm5-slot-label' }, stage.label),
    el('span', { class: 'm5-slot-caption' }, stage.caption),
  ];
}

export function render(container) {
  injectStyles();
  visitModule('module5');

  // ----- interactive state (fresh every time this module is opened) -----
  let pool = shuffle(STAGES.map((s) => s.id));
  const slots = [null, null, null, null];
  let selectedId = null;
  let animating = false;
  let solvedOnce = false;

  const boardWrap = el('div', { class: 'm5-board card mt-2' });
  const poolEl = el('div', { class: 'm5-pool dropzone flex flex-wrap gap-1', 'aria-label': 'Available energy stages' });
  const sequenceEl = el('div', { class: 'm5-sequence', role: 'group', 'aria-label': 'Energy pathway, four steps' });
  const quizSection = el('div', { class: 'card mt-2' });

  function findLocation(id) {
    const slotIndex = slots.indexOf(id);
    if (slotIndex !== -1) return { type: 'slot', index: slotIndex };
    if (pool.includes(id)) return { type: 'pool' };
    return null;
  }

  function removeFromCurrent(id) {
    const loc = findLocation(id);
    if (!loc) return null;
    if (loc.type === 'slot') slots[loc.index] = null;
    else pool = pool.filter((x) => x !== id);
    return loc;
  }

  function moveToSlot(id, index) {
    const occupant = slots[index];
    const source = removeFromCurrent(id);
    if (occupant && occupant !== id) {
      if (source && source.type === 'slot') slots[source.index] = occupant;
      else pool.push(occupant);
    }
    slots[index] = id;
  }

  function moveToPool(id) {
    removeFromCurrent(id);
    if (!pool.includes(id)) pool.push(id);
  }

  function maybeAutoCheck() {
    if (slots.every((v) => v !== null)) checkOrder();
  }

  function checkOrder() {
    if (slots.some((v) => v === null)) {
      showFeedback('Place all four energy stages into the pathway before checking.', 'info');
      return;
    }
    for (let i = 0; i < slots.length - 1; i++) {
      const key = `${slots[i]}>${slots[i + 1]}`;
      if (WRONG_PAIR_MESSAGES[key]) {
        recordMisconception('module5-energy-pathway-order');
        showFeedback(WRONG_PAIR_MESSAGES[key], 'error', 4200);
        return;
      }
    }
    if (slots.join(',') === CORRECT_ORDER.join(',')) {
      onCorrectOrder();
    } else {
      recordMisconception('module5-energy-pathway-order');
      showFeedback('Not quite the right path yet. Energy flows from the sun to the leaf, into glucose, and is then stored in glucose’s chemical bonds.', 'error', 4200);
    }
  }

  function animateEnergyTravel(slotEls, onDone) {
    boardWrap.style.position = 'relative';
    const spark = el('div', { class: 'm5-spark', 'aria-hidden': 'true' }, '⚡');
    boardWrap.appendChild(spark);
    const boardRect = boardWrap.getBoundingClientRect();

    function placeSparkAt(i) {
      const r = slotEls[i].getBoundingClientRect();
      spark.style.left = `${r.left - boardRect.left + r.width / 2 - 14}px`;
      spark.style.top = `${r.top - boardRect.top + r.height / 2 - 14}px`;
      slotEls[i].classList.add('m5-slot-glow');
    }

    spark.style.transition = 'none';
    placeSparkAt(0);
    let i = 1;
    requestAnimationFrame(() => {
      spark.style.transition = 'left 0.6s ease, top 0.6s ease';
      const step = () => {
        if (i >= slotEls.length) {
          setTimeout(() => {
            spark.remove();
            onDone && onDone();
          }, 500);
          return;
        }
        placeSparkAt(i);
        i++;
        setTimeout(step, 650);
      };
      setTimeout(step, 650);
    });
  }

  function onCorrectOrder() {
    animating = true;
    boardWrap.setAttribute('aria-busy', 'true');
    const slotEls = [...sequenceEl.querySelectorAll('.m5-slot')];
    animateEnergyTravel(slotEls, () => {
      animating = false;
      boardWrap.removeAttribute('aria-busy');
      showFeedback('Energy transformed! Light energy from the sun became chemical energy stored in the bonds of glucose — the same total amount of energy, just a new form.', 'success', 4500);
      confettiBurst();
      if (!solvedOnce) {
        solvedOnce = true;
        unlockQuiz();
      }
    });
  }

  function renderToken(id) {
    const stage = STAGE_BY_ID[id];
    const isSelected = selectedId === id;
    const btn = el('button', {
      type: 'button',
      class: `m5-token draggable${isSelected ? ' selected' : ''}`,
      'aria-pressed': String(isSelected),
      'aria-label': `${stage.label}, energy stage. ${isSelected ? 'Selected. Choose a step to place it.' : 'Press to pick up, then choose a step.'}`,
      onclick: () => {
        if (animating) return;
        selectedId = isSelected ? null : id;
        renderBoard();
      },
    }, [
      el('span', { class: 'm5-token-icon', 'aria-hidden': 'true' }, stage.icon),
      el('span', { class: 'm5-token-label' }, stage.label),
      isSelected ? el('span', { class: 'm5-selected-tag' }, '(selected)') : null,
    ]);
    btn.dataset.dragId = id;
    makeDraggable(btn);
    return btn;
  }

  function renderSlot(index) {
    const occupant = slots[index];
    const isSelected = occupant && selectedId === occupant;
    const filled = !!occupant;
    const stage = filled ? STAGE_BY_ID[occupant] : null;

    const slotEl = el('button', {
      type: 'button',
      class: `m5-slot dropzone ${filled ? 'm5-slot-filled' : 'm5-slot-empty'}${isSelected ? ' selected' : ''}`,
      'aria-label': filled
        ? `Step ${index + 1}: ${stage.label}. ${isSelected ? 'Selected. Choose another step or the tray to move it.' : 'Press to pick this stage back up.'}`
        : `Step ${index + 1}: empty. Select a stage below, then press here to place it.`,
      onclick: () => {
        if (animating) return;
        if (filled) {
          selectedId = isSelected ? null : occupant;
          renderBoard();
        } else if (selectedId) {
          moveToSlot(selectedId, index);
          selectedId = null;
          renderBoard();
          maybeAutoCheck();
        } else {
          showFeedback('Select an energy stage from the tray below, then press an empty step to place it.', 'info');
        }
      },
    }, [
      el('span', { class: 'm5-slot-step' }, `Step ${index + 1}`),
      ...(filled ? stageContent(occupant) : [
        el('span', { class: 'm5-slot-icon', 'aria-hidden': 'true' }, '➕'),
        el('span', { class: 'm5-slot-caption' }, 'Drop or place a stage here'),
      ]),
      isSelected ? el('span', { class: 'm5-selected-tag' }, '(selected)') : null,
    ]);

    if (filled) {
      slotEl.dataset.dragId = occupant;
      makeDraggable(slotEl);
    }
    makeDropzone(slotEl, {
      accepts: () => !animating,
      onDrop: (dragId) => {
        if (animating || !dragId) return;
        moveToSlot(dragId, index);
        selectedId = null;
        renderBoard();
        maybeAutoCheck();
      },
    });
    return slotEl;
  }

  // Pool is a persistent node (only its children are re-rendered), so its dropzone/click
  // wiring is attached exactly once here rather than inside renderBoard(), which runs on
  // every interaction — attaching inside the loop would stack duplicate listeners.
  makeDropzone(poolEl, {
    accepts: () => !animating,
    onDrop: (dragId) => {
      if (animating || !dragId) return;
      moveToPool(dragId);
      selectedId = null;
      renderBoard();
    },
  });
  poolEl.addEventListener('click', (e) => {
    if (animating) return;
    if (e.target === poolEl && selectedId) {
      moveToPool(selectedId);
      selectedId = null;
      renderBoard();
    }
  });

  function renderBoard() {
    clearContainer(poolEl);
    pool.forEach((id) => poolEl.appendChild(renderToken(id)));

    clearContainer(sequenceEl);
    slots.forEach((_, index) => {
      if (index > 0) sequenceEl.appendChild(el('span', { class: 'm5-arrow', 'aria-hidden': 'true' }, '→'));
      sequenceEl.appendChild(renderSlot(index));
    });
  }

  function resetBoard() {
    if (animating) return;
    pool = shuffle(STAGES.map((s) => s.id));
    for (let i = 0; i < slots.length; i++) slots[i] = null;
    selectedId = null;
    renderBoard();
  }

  function unlockQuiz() {
    clearContainer(quizSection);
    quizSection.appendChild(el('h2', { class: 'section-title' }, 'Check Your Understanding'));
    let idx = 0;
    let correctCount = 0;
    const quizBody = el('div');
    quizSection.appendChild(quizBody);

    function renderNext() {
      clearContainer(quizBody);
      if (idx >= QUIZ.length) {
        const percent = Math.round((correctCount / QUIZ.length) * 100);
        completeModule('module5', percent);
        quizBody.appendChild(el('div', { role: 'status' }, [
          el('h3', {}, 'Quiz complete!'),
          el('p', {}, `You scored ${correctCount} out of ${QUIZ.length} (${percent}%).`),
          el('p', { class: 'text-muted' }, percent >= 100
            ? 'Perfect! Energy transformation and conservation are locked in.'
            : 'Remember: energy is never created or destroyed during photosynthesis — it just changes form, from light to chemical energy stored in glucose.'),
          el('div', { class: 'flex gap-1 flex-wrap mt-2' }, [
            el('a', { class: 'btn btn-primary', href: '#/modules' }, 'Back to Learning Journey'),
            el('a', { class: 'btn btn-sun', href: '#/game/energy-quest' }, 'Play Energy Quest ⚡'),
          ]),
        ]));
        return;
      }
      const q = QUIZ[idx];
      quizBody.appendChild(el('p', { class: 'text-muted' }, `Question ${idx + 1} of ${QUIZ.length}`));
      quizBody.appendChild(quizQuestion({
        question: q.question,
        choices: q.choices,
        correctIndex: q.correctIndex,
        onAnswer: (correct) => {
          if (correct) correctCount++;
          else recordMisconception('module5-energy-quiz');
          setTimeout(() => { idx++; renderNext(); }, 1200);
        },
      }));
    }
    renderNext();
  }

  // ----- static instructional content -----
  container.append(
    el('h1', {}, 'Module 5: Energy Explorer ⚡'),
    el('p', { class: 'essential-question' }, 'Essential Question: Once sunlight strikes a leaf, where does that energy actually go?'),

    el('section', { class: 'card-grid mt-2' }, [
      el('div', { class: 'card' }, [
        el('div', { class: 'm5-concept-icon', 'aria-hidden': 'true' }, '🔄'),
        el('h3', {}, 'Energy Changes Form'),
        el('p', { class: 'text-muted' }, 'Light energy from the sun does not stay light energy. Inside the leaf, it is transformed into chemical energy as glucose is built.'),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'm5-concept-icon', 'aria-hidden': 'true' }, '🧬'),
        el('h3', {}, 'Energy Is Stored in Bonds'),
        el('p', { class: 'text-muted' }, 'That chemical energy is stored in the chemical bonds holding glucose’s atoms together — like energy tucked away for later use.'),
      ]),
      el('div', { class: 'card' }, [
        el('div', { class: 'm5-concept-icon', 'aria-hidden': 'true' }, '♻️'),
        el('h3', {}, 'Energy Is Conserved'),
        el('p', { class: 'text-muted' }, 'The Law of Conservation of Energy: energy is never created or destroyed during photosynthesis, only transformed from one form into another.'),
      ]),
    ]),

    el('div', { class: 'card mt-2' }, [
      el('p', { class: 'text-muted' }, 'Matter follows a parallel rule in this same reaction (explored in Module 3 and Module 4): every atom on the left of the equation reappears on the right.'),
      el('p', { class: 'm5-equation' }, '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'),
      el('p', { class: 'text-muted mt-1' }, 'Energy works the same way: nothing is created or destroyed — light energy simply becomes chemical energy.'),
    ]),

    el('h2', { class: 'section-title mt-3' }, 'Build the Energy Pathway'),
    el('p', {}, 'Place the four energy stages, in order, into the four steps below. Drag a stage into a step, or click a stage to select it and then click a step to drop it there. Feel free to try an order that seems wrong — you’ll get specific feedback explaining exactly why it doesn’t work.'),

    boardWrap
  );

  boardWrap.append(
    el('h3', {}, 'Available Energy Stages'),
    poolEl,
    el('h3', { class: 'mt-2' }, 'Energy Pathway (Step 1 → Step 4)'),
    sequenceEl,
    el('div', { class: 'flex gap-1 flex-wrap mt-2' }, [
      el('button', { type: 'button', class: 'btn', onclick: () => checkOrder() }, 'Check My Pathway'),
      el('button', { type: 'button', class: 'btn', onclick: () => resetBoard() }, 'Reset Tokens'),
    ])
  );

  renderBoard();

  quizSection.appendChild(el('div', { class: 'm5-locked' }, [
    el('p', {}, '🔒 Solve the energy pathway above to unlock this quiz.'),
  ]));

  container.append(quizSection);
}
