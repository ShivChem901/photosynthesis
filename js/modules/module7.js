// Module 7: Virtual Investigation
// Students explore how light intensity, CO2 concentration, and water availability
// (qualitatively) affect the rate of photosynthesis, then reflect on the results
// in terms of the balanced equation and conservation of matter/energy.

import { visitModule, completeModule } from '../state.js';
import { el, quizQuestion, showFeedback } from '../utils.js';

const STYLE_ID = 'module7-inline-styles';
const REFLECTION_KEY = 'photosynthesis-module7-reflection-v1';

const DESCRIPTIONS = {
  light: 'Light is the current limiting factor — even with plenty of CO₂ and water, the plant can’t make food any faster without more light energy.',
  co2: 'Carbon dioxide is the current limiting factor — the plant has enough light and water, but not enough raw material (CO₂) to build more glucose.',
  water: 'Water is the current limiting factor — without enough water, the plant can’t keep making food no matter how much light or CO₂ it gets.',
};

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .m7-controls { display: flex; flex-direction: column; gap: 1.1rem; }
    .m7-slider-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .m7-slider-label { min-width: 190px; font-weight: 600; display: flex; align-items: center; gap: 0.4rem; }
    .m7-slider-row input[type=range] { flex: 1; min-width: 160px; accent-color: var(--green-500); }
    .m7-slider-value { min-width: 130px; font-weight: 600; text-align: right; color: var(--text-muted); }
    .m7-rate-panel { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 1.25rem; }
    .m7-rate-heading { display: flex; justify-content: space-between; align-items: baseline; font-weight: 700; font-size: 1.05rem; }
    .m7-limiting-msg { padding: 0.6rem 0.9rem; background: var(--green-100); border-radius: 10px; font-size: 0.92rem; color: var(--text); }
    .m7-visual-row { display: flex; gap: 1.5rem; align-items: flex-end; flex-wrap: wrap; margin-top: 0.75rem; }
    .m7-plant-visual { position: relative; height: 140px; width: 90px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
    .m7-plant-stem { width: 14px; background: linear-gradient(180deg, var(--green-500), var(--green-700)); border-radius: 6px 6px 0 0; transition: height 0.4s ease; }
    .m7-plant-leaf { position: absolute; font-size: 1.4rem; opacity: 0; transition: opacity 0.3s ease; }
    .m7-plant-leaf.show { opacity: 1; }
    .m7-plant-pot { font-size: 2rem; }
    .m7-reflection-textarea { width: 100%; min-height: 120px; padding: 0.75rem; border-radius: 10px; border: 2px solid var(--border); background: var(--bg-elevated); color: var(--text); font: inherit; resize: vertical; }
    .m7-equation-ref { font-size: 1.05rem; font-weight: 700; text-align: center; padding: 0.75rem; background: var(--green-100); border-radius: 10px; margin: 1rem 0 0.5rem; }
  `;
  document.head.appendChild(style);
}

function factor(x) {
  if (x <= 0) return 0;
  return Math.min(1, x / 65);
}

function qualLabel(x) {
  if (x < 15) return 'Very Low';
  if (x < 35) return 'Low';
  if (x < 65) return 'Medium';
  if (x < 85) return 'High';
  return 'Very High';
}

// Simple, qualitative "law of limiting factors" model: the rate is capped by
// whichever variable is scarcest, and each variable's contribution saturates
// (plateaus) once it is no longer scarce. No biochemical mechanism implied.
function computeRate(light, co2, water) {
  const fLight = factor(light);
  const fCO2 = factor(co2);
  const fWater = factor(water);
  const minVal = Math.min(fLight, fCO2, fWater);
  const limitingNames = [];
  if (fLight === minVal) limitingNames.push('light');
  if (fCO2 === minVal) limitingNames.push('co2');
  if (fWater === minVal) limitingNames.push('water');
  return { rate: Math.round(minVal * 100), minVal, limitingNames };
}

export function render(container) {
  visitModule('module7');
  injectStyles();
  container.innerHTML = '';

  const vars = { light: 70, co2: 70, water: 70 };

  const heading = el('div', {}, [
    el('h1', {}, '🔎 Module 7: Virtual Investigation'),
    el('p', { class: 'essential-question' }, 'How do light, carbon dioxide, and water each affect how fast a plant can make its own food?'),
    el('p', { class: 'text-muted' }, 'Move the sliders below to change growing conditions and watch the rate of photosynthesis respond. When a resource is scarce, it becomes the "limiting factor" — increasing the other resources will not help until the scarce one increases too.'),
  ]);

  // ---------- Rate display elements (referenced by sliders & updateRate) ----------
  const rateValueEl = el('span', {}, '0%');
  const rateBarFill = el('div', { class: 'progress-bar-fill' });
  const rateBarTrack = el('div', {
    class: 'progress-bar-track', role: 'progressbar',
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0',
    'aria-label': 'Rate of photosynthesis',
  }, [rateBarFill]);
  const limitingMsgEl = el('p', { class: 'm7-limiting-msg', 'aria-live': 'polite' }, '');

  const plantStem = el('div', { class: 'm7-plant-stem', 'aria-hidden': 'true' });
  const leafSpecs = [
    { bottom: '28px', left: '2px' },
    { bottom: '52px', left: '42px' },
    { bottom: '76px', left: '18px' },
  ];
  const leaves = leafSpecs.map((pos) => {
    const leaf = el('span', { class: 'm7-plant-leaf' }, '🍃');
    leaf.style.bottom = pos.bottom;
    leaf.style.left = pos.left;
    return leaf;
  });
  const plantVisual = el('div', { class: 'm7-plant-visual', 'aria-hidden': 'true' }, [
    plantStem, ...leaves, el('span', { class: 'm7-plant-pot' }, '🪴'),
  ]);

  function updateRate() {
    const { rate, minVal, limitingNames } = computeRate(vars.light, vars.co2, vars.water);
    rateValueEl.textContent = `${rate}%`;
    rateBarFill.style.width = `${rate}%`;
    rateBarTrack.setAttribute('aria-valuenow', String(rate));
    plantStem.style.height = `${10 + rate * 1.1}px`;
    leaves.forEach((leaf, i) => leaf.classList.toggle('show', rate > (i + 1) * 25));
    if (minVal >= 0.98) {
      limitingMsgEl.textContent = 'All three factors are plentiful right now — the plant is photosynthesizing near its maximum rate.';
    } else {
      limitingMsgEl.textContent = limitingNames.map((n) => DESCRIPTIONS[n]).join(' ');
    }
  }

  function createSlider(key, label, icon) {
    const valueEl = el('span', { class: 'm7-slider-value' }, `${vars[key]}% (${qualLabel(vars[key])})`);
    const input = el('input', {
      type: 'range', min: '0', max: '100', step: '1', value: String(vars[key]),
      id: `m7-${key}`,
      'aria-label': `${label}, 0 to 100 percent`,
      oninput: (e) => {
        vars[key] = Number(e.target.value);
        valueEl.textContent = `${vars[key]}% (${qualLabel(vars[key])})`;
        updateRate();
      },
    });
    return el('div', { class: 'm7-slider-row' }, [
      el('label', { for: `m7-${key}`, class: 'm7-slider-label' }, `${icon} ${label}`),
      input,
      valueEl,
    ]);
  }

  const investigationCard = el('div', { class: 'card mt-2' }, [
    el('h2', { class: 'section-title' }, 'Investigation: Change the Conditions'),
    el('div', { class: 'm7-controls' }, [
      createSlider('light', 'Light Intensity', '☀️'),
      createSlider('co2', 'Carbon Dioxide Concentration', '💨'),
      createSlider('water', 'Water Availability', '💧'),
    ]),
    el('div', { class: 'm7-rate-panel' }, [
      el('div', { class: 'm7-rate-heading' }, [el('span', {}, 'Rate of Photosynthesis'), rateValueEl]),
      rateBarTrack,
      limitingMsgEl,
      el('div', { class: 'm7-visual-row' }, [plantVisual]),
    ]),
    el('p', { class: 'm7-equation-ref' }, '6 CO₂  +  6 H₂O   →(light energy)→   C₆H₁₂O₆  +  6 O₂'),
    el('p', { class: 'text-muted' }, 'Note: light energy is not a molecule like CO₂ or H₂O, but it is the essential energy input for the reaction to run — that is why it is written above the arrow rather than as a reactant formula.'),
  ]);

  // ---------- Reflection questions ----------
  let answeredCount = 0;
  let correctCount = 0;
  function handleAnswer(correct) {
    answeredCount += 1;
    if (correct) correctCount += 1;
    if (answeredCount === 3) {
      const score = Math.round((correctCount / 3) * 100);
      completeModule('module7', score);
      showFeedback(`Reflection complete — ${correctCount} of 3 correct (${score}%). Your progress has been saved.`, score === 100 ? 'success' : 'info', 5000);
    }
  }

  const q1 = quizQuestion({
    question: 'If water availability drops to zero, what happens to the rate of photosynthesis — even if light and CO₂ are plentiful?',
    choices: [
      'It stays the same, since light and CO₂ are the only factors that matter',
      'It drops toward zero, because water is a required reactant and becomes the limiting factor',
      'It increases, because the plant compensates by using more CO₂',
      'It becomes impossible to predict',
    ],
    correctIndex: 1,
    onAnswer: handleAnswer,
  });

  const q2 = quizQuestion({
    question: 'In the balanced equation 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, if water becomes completely unavailable, what does that mean for the reaction?',
    choices: [
      'The reactant side is missing a required input, so the reaction cannot produce its normal amount of products',
      'The products would still form normally because glucose only needs carbon dioxide',
      'Only the oxygen output would be affected, not the glucose',
      'The carbon dioxide coefficient would automatically increase to make up for it',
    ],
    correctIndex: 0,
    onAnswer: handleAnswer,
  });

  const q3 = quizQuestion({
    question: 'True or False: Increasing light intensity always increases the rate of photosynthesis, no matter what the other conditions are.',
    choices: [
      'True — light alone always increases the rate',
      'False — if another factor like water or CO₂ is more limited, adding more light will not help until that factor increases too',
    ],
    correctIndex: 1,
    onAnswer: handleAnswer,
  });

  const savedReflection = localStorage.getItem(REFLECTION_KEY) || '';
  const textarea = el('textarea', {
    class: 'm7-reflection-textarea',
    id: 'm7-reflection',
    'aria-label': 'Open-ended reflection response',
    placeholder: 'Type your explanation here...',
  }, savedReflection);

  const saveBtn = el('button', {
    type: 'button',
    class: 'btn btn-primary',
    onclick: () => {
      localStorage.setItem(REFLECTION_KEY, textarea.value);
      showFeedback('Your response has been saved.', 'success');
    },
  }, 'Save My Response');

  const reflectionCard = el('div', { class: 'card mt-2' }, [
    el('h2', { class: 'section-title' }, 'Reflection Questions'),
    q1, q2, q3,
    el('h3', { class: 'mt-2' }, 'Constructed Response (not auto-graded, but saved)'),
    el('p', { class: 'text-muted' }, "Explain: if water availability drops to zero, which reactant becomes limiting, and what happens to the balanced equation's inputs? Use the balanced equation (6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂) and conservation of matter/energy in your answer."),
    textarea,
    el('div', { class: 'mt-1' }, [saveBtn]),
  ]);

  container.append(heading, investigationCard, reflectionCard);

  updateRate();
}
