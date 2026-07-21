// Final Challenge: a single-sitting, auto-gradable assessment covering the
// NGSS performance expectation — using a model to show how photosynthesis
// transforms light energy into stored chemical energy while conserving matter.

import { recordAssessment } from './state.js';
import {
  el,
  quizQuestion,
  showFeedback,
  confettiBurst,
  clearContainer,
  makeDraggable,
  makeDropzone,
} from './utils.js';

const PASS_THRESHOLD = 85;

const SECTION_LABELS = [
  'Balancing the equation',
  'Conservation of matter',
  'Simplified model check',
  'Light energy → chemical energy',
  'Inputs & outputs of matter',
  'Matter + energy synthesis',
];

const MODEL_ITEMS = [
  { key: 'sunlight', text: '☀️ Sunlight (light energy entering the leaf)', correct: 'Input' },
  { key: 'reactants', text: 'CO₂ + H₂O (carbon dioxide and water)', correct: 'Input' },
  { key: 'products', text: 'C₆H₁₂O₆ + O₂ (glucose and oxygen)', correct: 'Output' },
  {
    key: 'chloroplast',
    text: 'Chloroplast: where light energy is captured and changed into chemical energy stored in glucose',
    correct: 'Energy Transformation',
  },
];

const SORT_ITEMS = [
  { id: 'sunlight', label: '☀️ Sunlight', bin: 'inputs' },
  { id: 'co2', label: 'CO₂ (carbon dioxide)', bin: 'inputs' },
  { id: 'water', label: 'H₂O (water)', bin: 'inputs' },
  { id: 'glucose', label: 'C₆H₁₂O₆ (glucose)', bin: 'outputs' },
  { id: 'oxygen', label: 'O₂ (oxygen gas)', bin: 'outputs' },
];

function ensureAssessmentStyles() {
  if (document.getElementById('final-assessment-styles')) return;
  const style = document.createElement('style');
  style.id = 'final-assessment-styles';
  style.textContent = `
    .assessment-equation {
      align-items: center;
      font-size: 1.3rem;
      font-weight: 600;
      background: var(--green-100);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
    }
    .coef-input {
      width: 3.4rem;
      font-size: 1.2rem;
      text-align: center;
      padding: 0.35rem 0.2rem;
      border-radius: 8px;
      border: 2px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text);
    }
    .coef-input:focus-visible { border-color: var(--green-500); }
    .model-row {
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding: 0.6rem 0.1rem;
    }
    .model-row select {
      padding: 0.4rem 0.6rem;
      border-radius: 8px;
      border: 2px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text);
      min-width: 190px;
    }
    .sort-bank {
      min-height: 60px;
      border: 2px dashed var(--border);
      border-radius: var(--radius);
      padding: 0.75rem;
    }
    .sort-item {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 180px;
      padding: 0.6rem 0.75rem !important;
    }
    .sort-chip {
      font-weight: 600;
      cursor: grab;
    }
    .sort-chip.placed {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      background: var(--bg-elevated);
      border: 2px solid var(--border);
      border-radius: 8px;
      padding: 0.4rem 0.6rem;
      width: 100%;
    }
    .sort-chip.placed button {
      border: none;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }
    .sort-bin {
      align-content: flex-start;
      align-items: stretch;
      flex-direction: column;
    }
    .assessment-reflection {
      width: 100%;
      font-family: inherit;
      padding: 0.6rem;
      border-radius: 8px;
      border: 2px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text);
    }
  `;
  document.head.appendChild(style);
}

function sectionCard(num, title, desc) {
  const card = el('div', { class: 'card mt-2', id: `assessment-section-${num}` });
  card.appendChild(el('h2', { class: 'section-title' }, `${num}. ${title}`));
  if (desc) card.appendChild(el('p', { class: 'text-muted' }, desc));
  return card;
}

export function render(container) {
  ensureAssessmentStyles();
  clearContainer(container);

  // Per-attempt answer tracking. A fresh render() (e.g. via "Try Again")
  // creates a brand-new closure, so retakes are always a clean slate.
  const answers = {
    coefficients: { co2: '', h2o: '', o2: '' },
    conservation: null,
    model: { sunlight: '', reactants: '', products: '', chloroplast: '' },
    energyQuiz: null,
    sorting: {},
    synthesisQuiz: null,
  };

  const root = el('div', {});
  root.appendChild(el('h1', {}, 'Final Challenge: Photosynthesis Mastery Assessment'));
  root.appendChild(el('p', { class: 'essential-question' },
    'Show that you can use a model to explain how photosynthesis transforms light energy into stored chemical energy — while conserving matter every step of the way.'));
  root.appendChild(el('p', { class: 'text-muted' },
    `Complete all six sections below, then submit. You need ${PASS_THRESHOLD}% to earn your certificate, and you can retake this as many times as you like.`));

  root.appendChild(buildSection1());
  root.appendChild(buildSection2());
  root.appendChild(buildSection3());
  root.appendChild(buildSection4());
  root.appendChild(buildSection5());
  root.appendChild(buildSection6());

  const resultHost = el('div', { id: 'assessment-result' });
  root.appendChild(resultHost);

  const submitBtn = el('button', {
    class: 'btn btn-primary',
    type: 'button',
    onclick: handleSubmit,
  }, '✅ Submit Final Assessment');
  root.appendChild(el('div', { class: 'center mt-3' }, submitBtn));

  container.appendChild(root);

  // ---------------- section builders ----------------

  function buildSection1() {
    const card = sectionCard(1, 'Balance the Equation',
      'Type the missing coefficient in each box. (A formula with no visible number in a balanced equation has a coefficient of 1.)');
    const eq = el('div', { class: 'assessment-equation flex flex-wrap gap-1' });
    const mkInput = (key, label) => el('input', {
      type: 'number',
      min: '0',
      max: '20',
      inputmode: 'numeric',
      class: 'coef-input',
      'aria-label': label,
      oninput: (e) => { answers.coefficients[key] = e.target.value; },
    });
    eq.appendChild(mkInput('co2', 'Coefficient for carbon dioxide, C O 2'));
    eq.appendChild(el('span', {}, ' CO₂  +  '));
    eq.appendChild(mkInput('h2o', 'Coefficient for water, H 2 O'));
    eq.appendChild(el('span', {}, ' H₂O  →  C₆H₁₂O₆  +  '));
    eq.appendChild(mkInput('o2', 'Coefficient for oxygen gas, O 2'));
    eq.appendChild(el('span', {}, ' O₂'));
    card.appendChild(eq);
    return card;
  }

  function buildSection2() {
    const card = sectionCard(2, 'Why Balancing Proves Matter Is Conserved');
    card.appendChild(quizQuestion({
      question: 'Why does a correctly balanced chemical equation show that matter is conserved during photosynthesis?',
      choices: [
        'Because the same number of each type of atom appears on both sides of the equation — atoms are only rearranged, never created or destroyed.',
        'Because the plant uses exactly the same molecules as both reactants and products.',
        'Because balancing shows that more oxygen is produced than carbon dioxide is used.',
        'Because the coefficients tell you how much energy the reaction releases.',
      ],
      correctIndex: 0,
      onAnswer: (correct) => { answers.conservation = correct; },
    }));
    return card;
  }

  function buildSection3() {
    const card = sectionCard(3, 'Complete a Simplified Model',
      'For each part of the model, choose whether it is an Input, an Output, or the Energy Transformation step.');
    MODEL_ITEMS.forEach((item) => {
      const row = el('div', { class: 'model-row flex flex-wrap gap-1' });
      const labelId = `model-${item.key}-label`;
      row.appendChild(el('label', { for: `model-${item.key}`, id: labelId, style: 'flex:1; min-width:220px;' }, item.text));
      const select = el('select', {
        id: `model-${item.key}`,
        'aria-labelledby': labelId,
        onchange: (e) => { answers.model[item.key] = e.target.value; },
      }, [
        el('option', { value: '' }, 'Choose one...'),
        el('option', { value: 'Input' }, 'Input'),
        el('option', { value: 'Output' }, 'Output'),
        el('option', { value: 'Energy Transformation' }, 'Energy Transformation'),
      ]);
      row.appendChild(select);
      card.appendChild(row);
    });
    return card;
  }

  function buildSection4() {
    const card = sectionCard(4, 'Light Energy Becomes Stored Chemical Energy');
    card.appendChild(quizQuestion({
      question: 'Which statement best describes how photosynthesis transforms energy?',
      choices: [
        'Chloroplasts capture light energy and use it to build glucose, a molecule that stores that energy in its chemical bonds.',
        'Light energy is destroyed as it enters the leaf and reappears as heat.',
        'Water molecules absorb sunlight and turn directly into oxygen gas.',
        'Chlorophyll converts carbon dioxide into light energy for later use.',
      ],
      correctIndex: 0,
      onAnswer: (correct) => { answers.energyQuiz = correct; },
    }));
    return card;
  }

  function buildSection5() {
    const card = sectionCard(5, 'Sort the Inputs and Outputs',
      'Drag each item into the correct bin, or use its "Move to Inputs / Move to Outputs" buttons.');

    const bank = el('div', { class: 'sort-bank flex flex-wrap gap-1 mt-1', 'aria-label': 'Unplaced items' });
    const inputsBin = el('div', { class: 'dropzone sort-bin flex flex-wrap gap-1', id: 'bin-inputs', 'aria-label': 'Inputs bin' });
    const outputsBin = el('div', { class: 'dropzone sort-bin flex flex-wrap gap-1', id: 'bin-outputs', 'aria-label': 'Outputs bin' });

    function place(id, binName) {
      if (binName === null) delete answers.sorting[id];
      else answers.sorting[id] = binName;
      renderAll();
    }

    function bankChip(item) {
      const chip = el('div', { class: 'sort-chip', tabindex: '0' }, item.label);
      chip.dataset.dragId = item.id;
      makeDraggable(chip);
      const btnRow = el('div', { class: 'flex gap-1' }, [
        el('button', { class: 'btn', type: 'button', onclick: () => place(item.id, 'inputs') }, 'Move to Inputs'),
        el('button', { class: 'btn', type: 'button', onclick: () => place(item.id, 'outputs') }, 'Move to Outputs'),
      ]);
      return el('div', { class: 'sort-item card' }, [chip, btnRow]);
    }

    function placedChip(item, binName) {
      return el('div', { class: 'sort-chip placed' }, [
        el('span', {}, item.label),
        el('button', {
          type: 'button',
          'aria-label': `Remove ${item.label} from ${binName === 'inputs' ? 'Inputs' : 'Outputs'}`,
          onclick: () => place(item.id, null),
        }, '✕'),
      ]);
    }

    function renderAll() {
      bank.innerHTML = '';
      inputsBin.innerHTML = '';
      outputsBin.innerHTML = '';
      SORT_ITEMS.forEach((item) => {
        const placement = answers.sorting[item.id];
        if (!placement) bank.appendChild(bankChip(item));
        else (placement === 'inputs' ? inputsBin : outputsBin).appendChild(placedChip(item, placement));
      });
    }

    makeDropzone(inputsBin, { accepts: () => true, onDrop: (id) => place(id, 'inputs') });
    makeDropzone(outputsBin, { accepts: () => true, onDrop: (id) => place(id, 'outputs') });

    renderAll();

    card.appendChild(bank);
    card.appendChild(el('div', { class: 'card-grid mt-1' }, [
      el('div', {}, [el('h3', {}, 'Inputs'), inputsBin]),
      el('div', {}, [el('h3', {}, 'Outputs'), outputsBin]),
    ]));
    return card;
  }

  function buildSection6() {
    const card = sectionCard(6, 'How Your Model Shows Both Matter Conservation and Energy Transformation');
    card.appendChild(quizQuestion({
      question: 'Which statement correctly explains how a photosynthesis model shows BOTH conservation of matter AND transformation of energy?',
      choices: [
        'The same atoms from CO₂ and H₂O are rearranged into glucose and oxygen (matter conserved), while light energy is captured and stored in the chemical bonds of glucose (energy transformed).',
        'Matter is conserved because no new molecules ever form, and energy is transformed because sunlight disappears completely.',
        'Energy is conserved because the plant releases the same amount of light it absorbs, and matter changes because new atoms are created.',
        'Both matter and energy are destroyed and replaced by entirely new atoms during photosynthesis.',
      ],
      correctIndex: 0,
      onAnswer: (correct) => { answers.synthesisQuiz = correct; },
    }));

    const reflectionId = 'assessment-reflection';
    card.appendChild(el('label', { for: reflectionId, class: 'mt-1', style: 'display:block; font-weight:600;' },
      'Optional: in your own words, describe how your model shows matter conservation AND energy transformation. (Not graded — just for your own reflection.)'));
    card.appendChild(el('textarea', {
      id: reflectionId,
      class: 'assessment-reflection mt-1',
      rows: '3',
      'aria-label': 'Optional reflection, not graded',
      oninput: (e) => { answers.reflection = e.target.value; },
    }));
    return card;
  }

  // ---------------- grading ----------------

  function handleSubmit() {
    const missing = [];
    if (!answers.coefficients.co2 || !answers.coefficients.h2o || !answers.coefficients.o2) missing.push('the equation coefficients (Section 1)');
    if (answers.conservation === null) missing.push('the conservation-of-matter question (Section 2)');
    if (Object.values(answers.model).some((v) => !v)) missing.push('the model checklist (Section 3)');
    if (answers.energyQuiz === null) missing.push('the energy-transformation question (Section 4)');
    if (SORT_ITEMS.some((it) => !answers.sorting[it.id])) missing.push('the inputs/outputs sorting (Section 5)');
    if (answers.synthesisQuiz === null) missing.push('the final synthesis question (Section 6)');

    if (missing.length) {
      showFeedback(`Please finish: ${missing.join('; ')}.`, 'error');
      return;
    }

    const coefTargets = { co2: 6, h2o: 6, o2: 6 };
    const s1 = Object.keys(coefTargets).filter((k) => Number(answers.coefficients[k]) === coefTargets[k]).length / 3;

    const s2 = answers.conservation ? 1 : 0;

    const modelTargets = MODEL_ITEMS.reduce((acc, m) => { acc[m.key] = m.correct; return acc; }, {});
    const s3 = Object.keys(modelTargets).filter((k) => answers.model[k] === modelTargets[k]).length / MODEL_ITEMS.length;

    const s4 = answers.energyQuiz ? 1 : 0;

    const s5 = SORT_ITEMS.filter((it) => answers.sorting[it.id] === it.bin).length / SORT_ITEMS.length;

    const s6 = answers.synthesisQuiz ? 1 : 0;

    const sectionScores = [s1, s2, s3, s4, s5, s6];
    const overall = Math.round((sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length) * 100);
    const passed = overall >= PASS_THRESHOLD;

    recordAssessment('final', overall, passed);
    submitBtn.disabled = true;
    showResult(overall, passed, sectionScores);
  }

  function showResult(overall, passed, sectionScores) {
    resultHost.innerHTML = '';
    const reviewAreas = SECTION_LABELS.filter((_, i) => sectionScores[i] < 1);

    if (passed) {
      confettiBurst();
      showFeedback('Great work — you passed the Final Challenge!', 'success');
      resultHost.appendChild(el('div', { class: 'card mt-2', role: 'status' }, [
        el('h2', { class: 'section-title' }, `🎉 You passed with ${overall}%!`),
        el('p', {}, 'You have shown that you can use a model to explain how photosynthesis transforms light energy into stored chemical energy, and how matter is conserved throughout the process.'),
        reviewAreas.length
          ? el('p', { class: 'text-muted' }, `Nice work overall! A couple of areas you could still sharpen up: ${reviewAreas.join(', ')}.`)
          : el('p', { class: 'text-muted' }, 'You answered every section correctly — outstanding!'),
        el('div', { class: 'flex gap-1 mt-2 flex-wrap' }, [
          el('a', { class: 'btn btn-primary', href: '#/certificate' }, '🏆 Get Your Certificate'),
          el('button', { class: 'btn', type: 'button', onclick: () => render(container) }, 'Retake for a Higher Score'),
        ]),
      ]));
    } else {
      resultHost.appendChild(el('div', { class: 'card mt-2', role: 'status' }, [
        el('h2', { class: 'section-title' }, `Your score: ${overall}%`),
        el('p', {}, `You need ${PASS_THRESHOLD}% to pass and unlock your certificate. You're on your way — review the area(s) below, revisit the related module, and try again whenever you're ready.`),
        el('p', {}, [
          el('strong', {}, 'Areas to review: '),
          reviewAreas.length ? reviewAreas.join(', ') : 'None flagged — double-check your work above and resubmit.',
        ]),
        el('div', { class: 'mt-2' }, el('button', { class: 'btn btn-primary', type: 'button', onclick: () => render(container) }, '🔄 Try Again')),
      ]));
    }
    resultHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
