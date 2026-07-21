// Game 3: Plant Builder
// Students grow a virtual plant by (1) choosing the correct raw ingredients,
// (2) balancing the photosynthesis equation, and (3) identifying the correct
// products. Every correct step advances the plant one growth stage; a wrong
// choice triggers a wilt/pause animation plus a specific hint.

import { el, showFeedback, confettiBurst } from '../utils.js';
import { recordGameScore, getState } from '../state.js';

const STYLE_ID = 'plant-builder-styles';

const STAGE_LABELS = {
  seed: 'Seed',
  sprout: 'Sprout',
  leafy: 'Leafy',
  healthy: 'Flowering & Healthy',
};

const REACTANT_OPTIONS = [
  { id: 'sun', label: 'Sunlight', icon: '☀️', correct: true },
  { id: 'co2', label: 'Carbon Dioxide (CO₂)', icon: '🌫️', correct: true },
  { id: 'water', label: 'Water (H₂O)', icon: '💧', correct: true },
  { id: 'soda', label: 'Soda', icon: '🥤', correct: false },
  { id: 'oil', label: 'Motor Oil', icon: '🛢️', correct: false },
  { id: 'rock', label: 'Gravel', icon: '🪨', correct: false },
];

const REACTANT_HINTS = {
  soda: 'Soda isn’t a raw ingredient for photosynthesis — plants use carbon dioxide, water, and sunlight, not sugary drinks.',
  oil: 'Oil isn’t absorbed by roots or leaves — it isn’t part of the photosynthesis recipe.',
  rock: 'Gravel is not a raw material a plant uses to make food.',
  missing: 'Not quite — photosynthesis needs exactly three raw ingredients: sunlight, water, and carbon dioxide. Check your selection again.',
};

const PRODUCT_OPTIONS = [
  { id: 'glucose', label: 'Glucose (sugar/food)', icon: '🍬', correct: true },
  { id: 'oxygen', label: 'Oxygen (O₂)', icon: '💨', correct: true },
  { id: 'co2', label: 'Carbon Dioxide', icon: '🌫️', correct: false },
  { id: 'smoke', label: 'Smoke', icon: '💭', correct: false },
  { id: 'salt', label: 'Salt', icon: '🧂', correct: false },
];

const PRODUCT_HINTS = {
  co2: 'Carbon dioxide is a raw ingredient that goes IN to photosynthesis — it isn’t something the plant produces.',
  smoke: 'Plants don’t release smoke — that’s not part of photosynthesis at all.',
  salt: 'Salt isn’t made or released during photosynthesis.',
  missing: 'Not quite — photosynthesis produces exactly two things: glucose (food) and oxygen gas. Check your selection again.',
};

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .pb-scene {
      position: relative;
      height: 230px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: linear-gradient(180deg, var(--sky-300) 0%, var(--sky-500) 45%, var(--green-100) 100%);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    :root[data-theme='dark'] .pb-scene { background: linear-gradient(180deg, #0d1f2d 0%, #123024 55%, var(--green-900) 100%); }
    .pb-pot {
      position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
      width: 100px; height: 46px; background: var(--soil-700);
      border-radius: 6px 6px 22px 22px; z-index: 2;
    }
    .pb-plant {
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center;
      transform-origin: bottom center;
    }
    .pb-seed {
      width: 18px; height: 18px; border-radius: 50%; background: #7a4a24;
      opacity: 1; transition: opacity 0.5s ease;
    }
    .pb-stem {
      width: 9px; height: 0; background: var(--green-700);
      border-radius: 5px 5px 0 0;
      transition: height 0.9s ease;
    }
    .pb-leaves { position: relative; width: 1px; height: 1px; }
    .pb-leaf {
      position: absolute; width: 40px; height: 24px;
      background: var(--green-500); border-radius: 0 100% 0 100%;
      opacity: 0; transform: scale(0);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .pb-leaf-1 { top: -70px; left: -38px; }
    .pb-leaf-2 { top: -70px; left: 2px; transform-origin: left; }
    .pb-leaf-3 { top: -40px; left: -44px; }
    .pb-leaf-4 { top: -40px; left: 6px; }
    .pb-flower {
      width: 26px; height: 26px; border-radius: 50%;
      background: radial-gradient(circle, var(--sun-300), var(--sun-500));
      opacity: 0; transform: scale(0);
      transition: opacity 0.6s ease, transform 0.6s ease;
      margin-bottom: 2px;
    }
    .pb-scene[data-stage='seed'] .pb-stem { height: 0; }
    .pb-scene[data-stage='sprout'] .pb-seed { opacity: 0; }
    .pb-scene[data-stage='sprout'] .pb-stem { height: 34px; }
    .pb-scene[data-stage='sprout'] .pb-leaf-1,
    .pb-scene[data-stage='sprout'] .pb-leaf-2 { opacity: 1; transform: scale(0.55); }
    .pb-scene[data-stage='leafy'] .pb-seed { opacity: 0; }
    .pb-scene[data-stage='leafy'] .pb-stem { height: 88px; }
    .pb-scene[data-stage='leafy'] .pb-leaf { opacity: 1; transform: scale(1); }
    .pb-scene[data-stage='healthy'] .pb-seed { opacity: 0; }
    .pb-scene[data-stage='healthy'] .pb-stem { height: 108px; }
    .pb-scene[data-stage='healthy'] .pb-leaf { opacity: 1; transform: scale(1); }
    .pb-scene[data-stage='healthy'] .pb-flower { opacity: 1; transform: scale(1); }
    .pb-scene[data-stage='healthy'] .pb-plant { animation: pbSway 3.2s ease-in-out infinite; }
    @keyframes pbSway { 0%, 100% { transform: translateX(-50%) rotate(-2deg); } 50% { transform: translateX(-50%) rotate(2deg); } }
    .pb-scene.pb-wilt .pb-stem,
    .pb-scene.pb-wilt .pb-leaf,
    .pb-scene.pb-wilt .pb-flower { animation: pbWilt 0.7s ease; }
    @keyframes pbWilt {
      0% { filter: none; }
      45% { transform: rotate(10deg) translateY(6px) scale(var(--pb-wilt-scale, 1)); filter: saturate(0.35) brightness(0.8); }
      100% { transform: none; filter: none; }
    }
    .pb-stage-label { font-weight: 700; color: var(--green-700); margin: 0 0 0.75rem; text-align: center; }
    :root[data-theme='dark'] .pb-stage-label { color: var(--green-300); }
    .pb-chip-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; margin: 0.75rem 0; }
    .pb-chip {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.6rem 0.9rem; border-radius: 999px;
      border: 2px solid var(--border); background: var(--bg-elevated); color: var(--text);
      cursor: pointer; font-size: 0.95rem;
    }
    .pb-chip:hover { border-color: var(--green-500); }
    .pb-chip[aria-pressed='true'] {
      border-color: var(--green-500); background: var(--green-100); font-weight: 700;
    }
    .pb-chip[aria-pressed='true']::after { content: ' \\2713'; }
    .pb-equation {
      font-size: 1.15rem; font-weight: 700; text-align: center;
      padding: 0.9rem; background: var(--green-100); border-radius: var(--radius);
      margin: 0.75rem 0; letter-spacing: 0.02em;
    }
    :root[data-theme='dark'] .pb-equation { color: var(--green-100); }
    .pb-stepper-row { display: flex; flex-wrap: wrap; gap: 1.25rem; justify-content: center; margin: 0.75rem 0 1rem; }
    .pb-stepper { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
    .pb-stepper-controls { display: flex; align-items: center; gap: 0.4rem; }
    .pb-step-btn { width: 2.2rem; height: 2.2rem; padding: 0; border-radius: 50%; font-size: 1.1rem; line-height: 1; }
    .pb-coef-input {
      width: 3.2rem; text-align: center; font-size: 1.05rem; font-weight: 700;
      padding: 0.4rem; border-radius: 8px; border: 2px solid var(--border);
      background: var(--bg-elevated); color: var(--text);
    }
    .pb-complete { text-align: center; }
    .pb-complete .pb-score { font-size: 2rem; font-weight: 800; color: var(--green-700); }
    :root[data-theme='dark'] .pb-complete .pb-score { color: var(--green-300); }
  `;
  document.head.appendChild(style);
}

export function render(container) {
  injectStyles();

  let mistakes = 0;

  const state = getState();
  const best = state.games.plantBuilder ? state.games.plantBuilder.highScore : 0;

  const heading = el('div', {}, [
    el('h1', {}, 'Plant Builder'),
    el('p', { class: 'text-muted' }, 'Choose the right ingredients, balance the equation, and identify the products to grow a healthy plant.'),
    best > 0 ? el('p', { class: 'text-muted' }, `Best score: ${best}`) : null,
  ]);

  // --- Plant scene (decorative; stage is announced separately for screen readers) ---
  const stageLabel = el('p', { class: 'pb-stage-label', 'aria-live': 'polite' }, `Stage: ${STAGE_LABELS.seed}`);

  const leaves = el('div', { class: 'pb-leaves' }, [1, 2, 3, 4].map((n) => el('div', { class: `pb-leaf pb-leaf-${n}` })));
  const scene = el('div', { class: 'pb-scene', 'aria-hidden': 'true', 'data-stage': 'seed' }, [
    el('div', { class: 'pb-pot' }),
    el('div', { class: 'pb-plant' }, [
      el('div', { class: 'pb-flower' }),
      leaves,
      el('div', { class: 'pb-stem' }),
      el('div', { class: 'pb-seed' }),
    ]),
  ]);

  function setStage(stage) {
    scene.dataset.stage = stage;
    stageLabel.textContent = `Stage: ${STAGE_LABELS[stage]}`;
  }

  function wilt() {
    scene.classList.remove('pb-wilt');
    // Force reflow so the animation can restart if triggered twice in a row.
    void scene.offsetWidth;
    scene.classList.add('pb-wilt');
    setTimeout(() => scene.classList.remove('pb-wilt'), 750);
  }

  const stepHost = el('div', { class: 'pb-step-card card mt-2' });

  container.append(heading, scene, stageLabel, stepHost);

  // --- Step 1: choose reactants -------------------------------------------------
  function renderReactantStep() {
    stepHost.innerHTML = '';
    const selected = new Set();
    stepHost.appendChild(el('h2', {}, 'Step 1: Pick the raw ingredients'));
    stepHost.appendChild(el('p', { class: 'text-muted' }, 'Select every ingredient a plant actually uses for photosynthesis, then check your answer.'));

    const grid = el('div', { class: 'pb-chip-grid', role: 'group', 'aria-label': 'Ingredient choices' });
    REACTANT_OPTIONS.forEach((opt) => {
      const btn = el('button', {
        type: 'button',
        class: 'pb-chip',
        'aria-pressed': 'false',
        onclick: () => {
          if (selected.has(opt.id)) { selected.delete(opt.id); btn.setAttribute('aria-pressed', 'false'); }
          else { selected.add(opt.id); btn.setAttribute('aria-pressed', 'true'); }
        },
      }, `${opt.icon} ${opt.label}`);
      grid.appendChild(btn);
    });
    stepHost.appendChild(grid);

    const checkBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary mt-1',
      onclick: () => {
        const wrongPicked = [...selected].find((id) => !REACTANT_OPTIONS.find((o) => o.id === id).correct);
        const correctIds = REACTANT_OPTIONS.filter((o) => o.correct).map((o) => o.id);
        const isComplete = correctIds.every((id) => selected.has(id)) && selected.size === correctIds.length;

        if (isComplete) {
          setStage('sprout');
          showFeedback('Great choice! Sunlight, water, and carbon dioxide are all raw ingredients of photosynthesis.', 'success');
          renderBalanceStep();
        } else {
          mistakes += 1;
          wilt();
          const hint = wrongPicked ? REACTANT_HINTS[wrongPicked] : REACTANT_HINTS.missing;
          showFeedback(hint, 'error');
        }
      },
    }, 'Check Ingredients');
    stepHost.appendChild(checkBtn);
  }

  // --- Step 2: balance the equation ---------------------------------------------
  function renderBalanceStep() {
    stepHost.innerHTML = '';
    const coeffs = { co2: 1, h2o: 1, o2: 1 };

    stepHost.appendChild(el('h2', {}, 'Step 2: Balance the equation'));
    stepHost.appendChild(el('p', { class: 'text-muted' }, 'Set each coefficient so the number of atoms matches on both sides.'));

    const equationDisplay = el('p', { class: 'pb-equation' });
    function updateEquation() {
      equationDisplay.textContent = `${coeffs.co2}CO₂ + ${coeffs.h2o}H₂O → C₆H₁₂O₆ + ${coeffs.o2}O₂`;
    }
    updateEquation();
    stepHost.appendChild(equationDisplay);

    const row = el('div', { class: 'pb-stepper-row' });

    function makeStepper(key, label) {
      const input = el('input', {
        type: 'number', min: '0', max: '12', value: String(coeffs[key]),
        class: 'pb-coef-input', 'aria-label': `${label} coefficient`,
        oninput: (e) => {
          const v = parseInt(e.target.value, 10);
          coeffs[key] = Number.isFinite(v) ? Math.max(0, Math.min(12, v)) : 0;
          updateEquation();
        },
      });
      const dec = el('button', {
        type: 'button', class: 'btn pb-step-btn', 'aria-label': `Decrease ${label} coefficient`,
        onclick: () => { coeffs[key] = Math.max(0, coeffs[key] - 1); input.value = String(coeffs[key]); updateEquation(); },
      }, '−');
      const inc = el('button', {
        type: 'button', class: 'btn pb-step-btn', 'aria-label': `Increase ${label} coefficient`,
        onclick: () => { coeffs[key] = Math.min(12, coeffs[key] + 1); input.value = String(coeffs[key]); updateEquation(); },
      }, '+');
      return el('div', { class: 'pb-stepper' }, [
        el('span', {}, label),
        el('div', { class: 'pb-stepper-controls' }, [dec, input, inc]),
      ]);
    }

    row.append(
      makeStepper('co2', 'CO₂'),
      makeStepper('h2o', 'H₂O'),
      makeStepper('o2', 'O₂'),
    );
    stepHost.appendChild(row);

    const checkBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary',
      onclick: () => {
        if (coeffs.co2 === 6 && coeffs.h2o === 6 && coeffs.o2 === 6) {
          setStage('leafy');
          showFeedback('Balanced! 6 CO₂ + 6 H₂O → C₆H₁₂O₆ + 6 O₂.', 'success');
          renderProductStep();
        } else {
          mistakes += 1;
          wilt();
          let hint;
          if (coeffs.co2 !== 6) {
            hint = 'Glucose (C₆H₁₂O₆) has 6 carbon atoms, so you need 6 CO₂ molecules to supply them. Check the CO₂ coefficient.';
          } else if (coeffs.h2o !== 6) {
            hint = 'Glucose has 12 hydrogen atoms and each H₂O supplies 2, so you need 6 H₂O molecules. Check the H₂O coefficient.';
          } else {
            hint = 'Count the oxygen atoms on both sides of the arrow — with 6 CO₂ and 6 H₂O on the left, the right side needs 6 O₂ to balance.';
          }
          showFeedback(hint, 'error');
        }
      },
    }, 'Check Balance');
    stepHost.appendChild(checkBtn);
  }

  // --- Step 3: identify the products ---------------------------------------------
  function renderProductStep() {
    stepHost.innerHTML = '';
    const selected = new Set();
    stepHost.appendChild(el('h2', {}, 'Step 3: Identify the products'));
    stepHost.appendChild(el('p', { class: 'text-muted' }, 'Select everything photosynthesis actually produces, then check your answer.'));

    const grid = el('div', { class: 'pb-chip-grid', role: 'group', 'aria-label': 'Product choices' });
    PRODUCT_OPTIONS.forEach((opt) => {
      const btn = el('button', {
        type: 'button',
        class: 'pb-chip',
        'aria-pressed': 'false',
        onclick: () => {
          if (selected.has(opt.id)) { selected.delete(opt.id); btn.setAttribute('aria-pressed', 'false'); }
          else { selected.add(opt.id); btn.setAttribute('aria-pressed', 'true'); }
        },
      }, `${opt.icon} ${opt.label}`);
      grid.appendChild(btn);
    });
    stepHost.appendChild(grid);

    const checkBtn = el('button', {
      type: 'button',
      class: 'btn btn-primary mt-1',
      onclick: () => {
        const wrongPicked = [...selected].find((id) => !PRODUCT_OPTIONS.find((o) => o.id === id).correct);
        const correctIds = PRODUCT_OPTIONS.filter((o) => o.correct).map((o) => o.id);
        const isComplete = correctIds.every((id) => selected.has(id)) && selected.size === correctIds.length;

        if (isComplete) {
          setStage('healthy');
          finishGame();
        } else {
          mistakes += 1;
          wilt();
          const hint = wrongPicked ? PRODUCT_HINTS[wrongPicked] : PRODUCT_HINTS.missing;
          showFeedback(hint, 'error');
        }
      },
    }, 'Check Products');
    stepHost.appendChild(checkBtn);
  }

  function finishGame() {
    const score = Math.max(40, 100 - mistakes * 10);
    confettiBurst();
    recordGameScore('plantBuilder', score);
    showFeedback('Your plant is happy and healthy!', 'success');

    stepHost.innerHTML = '';
    stepHost.className = 'pb-step-card card mt-2 pb-complete';
    stepHost.append(
      el('h2', {}, 'Your Plant Is Fully Grown!'),
      el('p', {}, `Mistakes made: ${mistakes}`),
      el('p', { class: 'pb-score' }, `Score: ${score}`),
      el('button', {
        type: 'button',
        class: 'btn btn-primary mt-1',
        onclick: () => {
          mistakes = 0;
          stepHost.className = 'pb-step-card card mt-2';
          setStage('seed');
          renderReactantStep();
        },
      }, 'Grow Another Plant'),
    );
  }

  renderReactantStep();
}
