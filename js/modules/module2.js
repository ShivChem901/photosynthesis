// Module 2: Interactive Photosynthesis Model
// Students drag (or click-to-place) Sunlight, Carbon Dioxide, and Water onto a plant.
// Once all three are correctly placed, an animated sequence shows atoms rearranging
// into glucose + oxygen, with chemical energy stored in the glucose. A short
// reflection quiz follows and reports a score back to the shared state store.

import {
  el,
  showFeedback,
  confettiBurst,
  makeDraggable,
  makeDropzone,
  quizQuestion,
  atomChip,
  shuffle,
  speak,
} from '../utils.js';
import { visitModule, completeModule, recordMisconception } from '../state.js';

const STYLE_ID = 'module2-scoped-styles';

const REQUIRED_INPUTS = [
  {
    id: 'sunlight',
    label: 'Sunlight',
    icon: '☀️',
    hint: 'Without sunlight, the plant has no energy source to drive the reaction — try adding sunlight as well.',
  },
  {
    id: 'co2',
    label: 'Carbon Dioxide',
    icon: '💨',
    hint: 'Plants need carbon dioxide to supply the carbon atoms for building glucose — try adding carbon dioxide as well.',
  },
  {
    id: 'water',
    label: 'Water',
    icon: '💧',
    hint: "Plants can't make food without water reaching the leaves — try adding water too.",
  },
];

const DISTRACTORS = [
  {
    id: 'oxygen',
    label: 'Oxygen (O₂)',
    icon: '🫧',
    hint: "Oxygen is what the plant releases as a byproduct — it's an output of this reaction, not something the plant takes in.",
  },
  {
    id: 'minerals',
    label: 'Soil Minerals',
    icon: '🪨',
    hint: "Soil minerals help a plant grow overall, but they aren't one of the three raw materials this reaction runs on. Think: what enters through the leaf as light or gas, or travels up through the stem as liquid?",
  },
  {
    id: 'glucose',
    label: 'Glucose (C₆H₁₂O₆)',
    icon: '🍬',
    hint: "Glucose is the product this reaction makes — you can't add the finished food before the plant has built it!",
  },
];

const QUIZ = [
  {
    question: 'Which THREE substances did you combine to power the reaction you just built?',
    choices: [
      'Sunlight, carbon dioxide, and water',
      'Sunlight, oxygen, and glucose',
      'Water, soil minerals, and oxygen',
      'Carbon dioxide, glucose, and sunlight',
    ],
    correctIndex: 0,
  },
  {
    question: 'What TWO products did the plant make once the reaction finished?',
    choices: [
      'Water and carbon dioxide',
      'Glucose (sugar) and oxygen gas',
      'Sunlight and soil minerals',
      'Oxygen and carbon dioxide',
    ],
    correctIndex: 1,
  },
  {
    question: 'What happened to the energy that sunlight carried into the plant?',
    choices: [
      'It disappeared completely',
      'It bounced off the leaf and was lost',
      'It was transformed and stored in the chemical bonds of glucose',
      'It stayed as light energy floating inside the plant',
    ],
    correctIndex: 2,
  },
];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .m2-instructions { max-width: 60ch; }
    .m2-tray { margin: 1rem 0; }
    .input-token {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      min-width: 108px; padding: 0.7rem 0.9rem; border-radius: 14px;
      border: 2px solid var(--border); background: var(--bg-elevated); color: var(--text);
      font-weight: 600; font-size: 0.85rem; cursor: grab;
    }
    .input-token:hover:not(:disabled) { border-color: var(--green-500); }
    .input-token .input-token-icon { font-size: 1.7rem; }
    .input-token.selected { border-color: var(--sun-500); box-shadow: 0 0 0 3px rgba(255, 183, 3, 0.35); }
    .input-token.placed { opacity: 0.45; cursor: default; border-color: var(--green-500); }
    .input-token:disabled { cursor: default; }

    .m2-plant-wrap { position: relative; height: 150px; margin: 0.5rem 0; }
    .m2-plant-wrap .plant-scene { position: absolute; }

    .plant-dropzone { min-height: 76px; }
    .plant-dropzone .dropzone-placeholder { color: var(--text-muted); font-size: 0.9rem; text-align: center; }
    .plant-dropzone .placed-chip {
      display: inline-flex; align-items: center; gap: 0.35rem;
      background: var(--green-100); border-radius: 999px; padding: 0.35rem 0.75rem;
      font-weight: 600; font-size: 0.85rem; color: var(--green-900);
    }
    :root[data-theme='dark'] .plant-dropzone .placed-chip { color: var(--green-100); }

    .m2-run-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

    .reaction-stage {
      display: flex; align-items: center; justify-content: center; gap: 1.5rem;
      flex-wrap: wrap; padding: 1.5rem; border-radius: var(--radius);
      background: var(--green-100); margin-top: 1rem;
    }
    :root[data-theme='dark'] .reaction-stage { background: var(--bg-elevated); border: 1px solid var(--border); }
    .reaction-row { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; justify-content: center; }
    .reaction-arrow { font-size: 1.8rem; font-weight: 700; color: var(--green-700); }
    :root[data-theme='dark'] .reaction-arrow { color: var(--green-300); }

    .molecule-badge {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-width: 100px; padding: 0.6rem 0.8rem; border-radius: 12px; font-weight: 700;
      background: var(--bg-elevated); border: 2px solid var(--green-500);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      opacity: 0; transform: scale(0.6);
    }
    .molecule-badge .molecule-formula { font-size: 1rem; }
    .molecule-badge .molecule-name { font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
    .glucose-badge { border-color: var(--sun-500); }
    .oxygen-badge { border-color: var(--sky-500); }

    .reaction-stage.playing .reaction-inputs .atom-chip {
      animation: m2-atom-merge 1s ease forwards;
    }
    .reaction-stage.playing .glucose-badge {
      animation: m2-glucose-appear 0.8s ease forwards 1s,
                 m2-energy-pulse 1.6s ease-in-out 2.4s 3 alternate;
    }
    .reaction-stage.playing .oxygen-badge {
      animation: m2-oxygen-release 1.8s ease forwards 1.3s;
    }
    @keyframes m2-atom-merge {
      to { transform: scale(0.3) translateY(-16px); opacity: 0; }
    }
    @keyframes m2-glucose-appear {
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes m2-oxygen-release {
      0% { opacity: 0; transform: translateY(0) scale(0.6); }
      25% { opacity: 1; transform: scale(1); }
      100% { opacity: 0; transform: translateY(-70px) translateX(40px) scale(0.8); }
    }
    @keyframes m2-energy-pulse {
      0%, 100% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 0 rgba(255, 183, 3, 0); }
      50% { box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 26px 10px rgba(255, 183, 3, 0.85); }
    }
  `;
  document.head.appendChild(style);
}

function renderDropzoneContent(zoneEl, placed) {
  zoneEl.innerHTML = '';
  if (placed.size === 0) {
    zoneEl.appendChild(el('p', { class: 'dropzone-placeholder' }, 'Drop Sunlight, Carbon Dioxide, and Water here'));
    return;
  }
  REQUIRED_INPUTS.filter((r) => placed.has(r.id)).forEach((r) => {
    zoneEl.appendChild(el('span', { class: 'placed-chip' }, [
      el('span', { 'aria-hidden': 'true' }, r.icon),
      ` ${r.label}`,
    ]));
  });
}

function updateZoneLabel(zoneEl, placed) {
  if (placed.size === 0) {
    zoneEl.setAttribute('aria-label', 'The plant. No inputs placed yet. Drag an input here, or select an input above then activate the plant to place it.');
    return;
  }
  const names = REQUIRED_INPUTS.filter((r) => placed.has(r.id)).map((r) => r.label).join(', ');
  const remaining = REQUIRED_INPUTS.length - placed.size;
  zoneEl.setAttribute(
    'aria-label',
    remaining > 0
      ? `The plant. ${names} placed so far. ${remaining} more input${remaining > 1 ? 's' : ''} needed.`
      : `The plant. All three inputs placed: ${names}. Ready to run photosynthesis.`
  );
}

export function render(container) {
  visitModule('module2');
  injectStyles();

  const placed = new Set();
  let selectedDragId = null;
  let reactionStarted = false;
  const draggableButtons = new Map();

  function clearSelection() {
    selectedDragId = null;
    draggableButtons.forEach((btn) => {
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    });
  }

  function selectItem(id, btn) {
    if (btn.disabled) return;
    if (selectedDragId === id) {
      clearSelection();
      return;
    }
    clearSelection();
    selectedDragId = id;
    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
    const item = [...REQUIRED_INPUTS, ...DISTRACTORS].find((i) => i.id === id);
    showFeedback(`${item.label} selected. Now activate the plant to place it there.`, 'info', 2400);
  }

  function placeItem(dragId) {
    if (!dragId || reactionStarted) return;
    if (placed.has(dragId)) return;

    const required = REQUIRED_INPUTS.find((r) => r.id === dragId);
    if (!required) {
      const distractor = DISTRACTORS.find((d) => d.id === dragId);
      const hint = distractor
        ? distractor.hint
        : "That's not one of the three raw materials this reaction needs — think about what enters the leaf as light, gas, or liquid.";
      showFeedback(hint, 'error', 5000);
      recordMisconception(`module2-wrong-input-${dragId}`);
      clearSelection();
      return;
    }

    placed.add(dragId);
    clearSelection();
    const btn = draggableButtons.get(dragId);
    if (btn) {
      btn.disabled = true;
      btn.classList.add('placed');
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', `${required.label}. Already placed on the plant.`);
    }
    renderDropzoneContent(dropzone, placed);
    updateZoneLabel(dropzone, placed);
    showFeedback(`${required.label} added to the plant.`, 'info', 1800);
  }

  function handleRun() {
    if (reactionStarted) return;
    const missing = REQUIRED_INPUTS.filter((r) => !placed.has(r.id));
    if (missing.length > 0) {
      const hint = missing.length === REQUIRED_INPUTS.length
        ? 'Nothing has reached the plant yet — drag or select Sunlight, Carbon Dioxide, and Water onto it before running the reaction.'
        : missing.map((m) => m.hint).join(' ');
      showFeedback(hint, 'error', 5500);
      recordMisconception('module2-incomplete-model');
      return;
    }
    reactionStarted = true;
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Reaction running…';
    playReaction();
  }

  function playReaction() {
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const srStatus = el('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' }, '');
    const stage = el('div', { class: 'reaction-stage', 'aria-hidden': 'true' }, [
      el('div', { class: 'reaction-row reaction-inputs' }, [
        atomChip('C', 6),
        atomChip('H', 12),
        atomChip('O', 18),
      ]),
      el('div', { class: 'reaction-arrow', 'aria-hidden': 'true' }, '→'),
      el('div', { class: 'reaction-row reaction-products' }, [
        el('div', { class: 'molecule-badge glucose-badge' }, [
          el('span', { class: 'molecule-formula' }, 'C₆H₁₂O₆'),
          el('span', { class: 'molecule-name' }, 'Glucose (stores energy)'),
        ]),
        el('div', { class: 'molecule-badge oxygen-badge' }, [
          el('span', { class: 'molecule-formula' }, '6 O₂'),
          el('span', { class: 'molecule-name' }, 'Oxygen released'),
        ]),
      ]),
    ]);

    stageHost.append(srStatus, stage);

    const timings = reducedMotion
      ? { announce1: 20, announce2: 60, announce3: 100, announce4: 140, done: 250 }
      : { announce1: 100, announce2: 1100, announce3: 1500, announce4: 2500, done: 4200 };

    requestAnimationFrame(() => stage.classList.add('playing'));

    setTimeout(() => {
      srStatus.textContent = 'The atoms from carbon dioxide and water are rearranging.';
    }, timings.announce1);
    setTimeout(() => {
      srStatus.textContent = 'Glucose has formed from the rearranged atoms.';
    }, timings.announce2);
    setTimeout(() => {
      srStatus.textContent = 'Oxygen gas is released into the air.';
    }, timings.announce3);
    setTimeout(() => {
      srStatus.textContent = 'Chemical energy from sunlight is now stored in the bonds of glucose.';
    }, timings.announce4);
    setTimeout(() => {
      onReactionComplete();
    }, timings.done);
  }

  function onReactionComplete() {
    showFeedback(
      'Photosynthesis complete! Light energy has been transformed and stored as chemical energy in glucose, and oxygen was released as a byproduct.',
      'success',
      5500
    );
    confettiBurst();
    speak('Great work. You modeled photosynthesis: sunlight, carbon dioxide, and water combined to form glucose and oxygen, storing chemical energy in the glucose.');
    runBtn.textContent = '✅ Reaction complete';
    renderQuiz();
  }

  function renderQuiz() {
    let answered = 0;
    let correctCount = 0;

    const quizSection = el('section', { class: 'card mt-3', 'aria-label': 'Reflection quiz' }, [
      el('h2', { class: 'section-title' }, 'Reflect: What did you just model?'),
      el('p', { class: 'text-muted' }, 'Answer all three questions to finish Module 2.'),
    ]);

    QUIZ.forEach((q) => {
      const qEl = quizQuestion({
        question: q.question,
        choices: q.choices,
        correctIndex: q.correctIndex,
        onAnswer: (correct) => {
          answered += 1;
          if (correct) correctCount += 1;
          if (answered === QUIZ.length) {
            const score = Math.round((correctCount / QUIZ.length) * 100);
            completeModule('module2', score);
            quizSection.appendChild(el('p', { class: 'card mt-2', role: 'status' },
              `You scored ${score}% (${correctCount}/${QUIZ.length}) on the reflection quiz. Your progress has been saved!`));
            showFeedback(`Module 2 complete — quiz score ${score}%.`, 'success', 4200);
          }
        },
      });
      quizSection.appendChild(qEl);
    });

    quizHost.appendChild(quizSection);
    quizSection.scrollIntoView({ behavior: reducedOk() ? 'auto' : 'smooth', block: 'nearest' });
  }

  function reducedOk() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- Build UI ----------

  const header = el('section', { class: 'card' }, [
    el('h1', {}, '🧩 Module 2: Interactive Photosynthesis Model'),
    el('p', { class: 'essential-question' }, 'What raw materials does a plant need, and what does it make from them?'),
    el('p', { class: 'text-muted' },
      'Build the model yourself. Drag Sunlight, Carbon Dioxide, and Water onto the plant below, then run the reaction to see how matter rearranges and energy is stored.'),
  ]);

  const allInputs = shuffle([...REQUIRED_INPUTS, ...DISTRACTORS]);
  const tray = el('div', { class: 'flex flex-wrap gap-1 m2-tray', role: 'group', 'aria-label': 'Available inputs' });
  allInputs.forEach((item) => {
    const btn = el('button', {
      type: 'button',
      class: 'draggable input-token',
      'aria-pressed': 'false',
      'aria-label': `${item.label}. Activate to select it, then activate the plant to place it there. You can also drag it directly onto the plant.`,
      onclick: () => selectItem(item.id, btn),
    }, [
      el('span', { class: 'input-token-icon', 'aria-hidden': 'true' }, item.icon),
      el('span', { class: 'input-token-label' }, item.label),
    ]);
    btn.dataset.dragId = item.id;
    makeDraggable(btn, {});
    draggableButtons.set(item.id, btn);
    tray.appendChild(btn);
  });

  const plantWrap = el('div', { class: 'm2-plant-wrap', 'aria-hidden': 'true' }, [
    el('div', { class: 'plant-scene' }, [
      el('div', { class: 'plant-stem', style: 'left:45%;' }),
      el('div', { class: 'plant-leaf', style: 'left:38%; bottom:40px; animation-delay:0.6s;' }),
      el('div', { class: 'plant-leaf', style: 'left:50%; bottom:70px; animation-delay:1.1s; transform-origin:left;' }),
    ]),
  ]);

  const dropzone = el('div', {
    class: 'dropzone plant-dropzone',
    tabindex: '0',
    role: 'button',
    'aria-label': 'The plant. No inputs placed yet.',
  });
  makeDropzone(dropzone, {
    onDrop: (dragId) => placeItem(dragId),
  });
  dropzone.addEventListener('click', () => {
    if (!selectedDragId) {
      showFeedback('First choose an input above, then activate the plant to place it.', 'info', 2600);
      return;
    }
    placeItem(selectedDragId);
  });
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      dropzone.click();
    }
  });
  renderDropzoneContent(dropzone, placed);

  const instructions = el('p', { class: 'text-muted m2-instructions' }, [
    'Two ways to build the model: ',
    el('strong', {}, '(1) Drag'),
    ' an input token onto the plant, or ',
    el('strong', {}, '(2) Click'),
    ' (or press Enter on) a token to select it, then click or press Enter on the plant to place it.',
  ]);

  const runBtn = el('button', { type: 'button', class: 'btn btn-primary', onclick: () => handleRun() }, '▶ Run Photosynthesis');
  const equationNote = el('p', { class: 'text-muted mt-1' }, 'Target equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂');

  const stageHost = el('div', { class: 'm2-stage-host' });
  const quizHost = el('div', { class: 'm2-quiz-host' });

  const builderCard = el('section', { class: 'card mt-3' }, [
    el('h2', { class: 'section-title' }, 'Build the Model'),
    instructions,
    tray,
    plantWrap,
    dropzone,
    el('div', { class: 'm2-run-row mt-2' }, [runBtn]),
    equationNote,
    stageHost,
  ]);

  container.append(header, builderCard, quizHost);
}
