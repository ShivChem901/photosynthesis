// Module 4: Matter Explorer
// Students build the four key photosynthesis molecules from atom chips, then
// watch those exact atoms visually regroup during the reaction, take an atom
// inventory, and finish with a short quiz on conservation of matter.

import { el, atomChip, showFeedback, makeDraggable, makeDropzone, quizQuestion, confettiBurst } from '../utils.js';
import { visitModule, completeModule } from '../state.js';

const LONGNAMES = { C: 'Carbon', H: 'Hydrogen', O: 'Oxygen' };

const MOLECULE_TARGETS = [
  { id: 'co2', name: 'Carbon Dioxide', formula: 'CO₂', target: { C: 1, O: 2 } },
  { id: 'h2o', name: 'Water', formula: 'H₂O', target: { H: 2, O: 1 } },
  { id: 'o2', name: 'Oxygen Gas', formula: 'O₂', target: { O: 2 } },
  { id: 'glucose', name: 'Glucose', formula: 'C₆H₁₂O₆', target: { C: 6, H: 12, O: 6 } },
];

// ---- Deterministic atom identity map for the "watch them rearrange" stage ----
// 6 CO2 molecules -> 6 C atoms + 12 O atoms. 6 H2O molecules -> 12 H atoms + 6 O atoms.
// Total: 6 C, 12 H, 18 O (36 atoms) on the reactant side.
const REACTANT_MOLECULES = [];
for (let i = 1; i <= 6; i++) {
  REACTANT_MOLECULES.push({
    label: `CO₂ #${i}`,
    atoms: [
      { id: `C${i}`, symbol: 'C' },
      { id: `O${2 * i - 1}`, symbol: 'O' },
      { id: `O${2 * i}`, symbol: 'O' },
    ],
  });
}
for (let i = 1; i <= 6; i++) {
  REACTANT_MOLECULES.push({
    label: `H₂O #${i}`,
    atoms: [
      { id: `O${12 + i}`, symbol: 'O' },
      { id: `H${2 * i - 1}`, symbol: 'H' },
      { id: `H${2 * i}`, symbol: 'H' },
    ],
  });
}

// Product side: same 36 atoms, regrouped into 1 glucose + 6 O2.
// (This specific pairing is an illustrative simplification for tracing purposes,
// not a claim about the real biological pathway, which is beyond this course.)
const glucoseAtoms = [];
for (let i = 1; i <= 6; i++) glucoseAtoms.push({ id: `C${i}`, symbol: 'C' });
for (let i = 1; i <= 12; i++) glucoseAtoms.push({ id: `H${i}`, symbol: 'H' });
[1, 3, 5, 7, 9, 11].forEach((n) => glucoseAtoms.push({ id: `O${n}`, symbol: 'O' }));

const PRODUCT_MOLECULES = [{ label: 'Glucose (C₆H₁₂O₆)', atoms: glucoseAtoms }];
const co2LeftoverO = [2, 4, 6, 8, 10, 12];
const h2oOAtoms = [13, 14, 15, 16, 17, 18];
for (let i = 0; i < 6; i++) {
  PRODUCT_MOLECULES.push({
    label: `O₂ #${i + 1}`,
    atoms: [
      { id: `O${co2LeftoverO[i]}`, symbol: 'O' },
      { id: `O${h2oOAtoms[i]}`, symbol: 'O' },
    ],
  });
}

const QUIZ = [
  {
    question: 'In 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂, how many total oxygen atoms are on the REACTANT side?',
    choices: ['12', '18', '24', '6'],
    correctIndex: 1,
  },
  {
    question: 'What actually happens to atoms during photosynthesis?',
    choices: [
      'They are destroyed and brand-new atoms are created',
      'They disappear and turn into pure energy',
      'They are rearranged into new molecules, but the same atoms remain',
      'Extra atoms are pulled in from sunlight',
    ],
    correctIndex: 2,
  },
  {
    question: 'A reaction starts with 6 carbon atoms among the reactants. How many carbon atoms should be found among the products?',
    choices: ['0 - carbon is used up', '3 - half is lost as heat', '6 - the same number', '12 - carbon doubles'],
    correctIndex: 2,
  },
  {
    question: 'Which law explains why the atom counts on each side of a correctly balanced chemical equation always match?',
    choices: ['Law of Conservation of Energy', "Newton's Third Law", 'Law of Conservation of Matter', 'Law of Definite Multiples'],
    correctIndex: 2,
  },
];

function describeCounts(target) {
  return Object.entries(target)
    .map(([sym, n]) => `${n} ${LONGNAMES[sym]} atom${n !== 1 ? 's' : ''}`)
    .join(', ');
}

function idAtomChip(id, symbol) {
  return el('span', { class: `atom-chip atom-${symbol} m4-atom`, 'data-atom-id': id, title: `Atom ${id}` }, id);
}

function buildPod(mol, empty) {
  const pod = el('div', { class: 'm4-pod' });
  pod.appendChild(el('div', { class: 'm4-pod-label' }, mol.label));
  const atomsRow = el('div', { class: 'm4-pod-atoms' });
  if (!empty) mol.atoms.forEach((a) => atomsRow.appendChild(idAtomChip(a.id, a.symbol)));
  pod.appendChild(atomsRow);
  return { pod, atomsRow };
}

function atomIdSort(a, b) {
  const pa = a.match(/^([A-Z])(\d+)$/);
  const pb = b.match(/^([A-Z])(\d+)$/);
  if (pa[1] !== pb[1]) return pa[1] < pb[1] ? -1 : 1;
  return parseInt(pa[2], 10) - parseInt(pb[2], 10);
}

function injectStyles() {
  if (document.getElementById('module4-styles')) return;
  const style = document.createElement('style');
  style.id = 'module4-styles';
  style.textContent = `
    .m4-palette { padding: 0.75rem; border: 2px dashed var(--border); border-radius: var(--radius); }
    .m4-palette-chip { cursor: grab; font-size: 1rem; width: 44px; height: 44px; }
    .m4-molecule-card { border: 2px solid var(--border); transition: border-color 0.3s ease; }
    .m4-molecule-complete { border-color: #2a9d8f; }
    .m4-dropzone { min-height: 70px; }
    .m4-placed-atom { border: none; cursor: pointer; }
    .m4-placed-atom:hover, .m4-placed-atom:focus-visible { filter: brightness(1.12); }
    .m4-stage { display: flex; gap: 1rem; align-items: stretch; flex-wrap: wrap; }
    .m4-zone { flex: 1; min-width: 260px; }
    .m4-zone-label { font-size: 1rem; color: var(--text-muted); }
    .m4-arrow { font-size: 2rem; display: flex; align-items: center; justify-content: center; color: var(--green-500); padding: 0 0.5rem; min-width: 40px; }
    :root[data-theme='dark'] .m4-arrow { color: var(--green-300); }
    .m4-pods-grid { display: flex; flex-wrap: wrap; gap: 0.6rem; align-content: flex-start; }
    .m4-pod { border: 1px solid var(--border); border-radius: 10px; padding: 0.5rem; min-width: 108px; background: var(--bg); }
    .m4-pod-label { font-size: 0.76rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.3rem; }
    .m4-pod-atoms { display: flex; flex-wrap: wrap; gap: 4px; min-height: 34px; }
    .m4-atom { font-size: 0.62rem; min-width: 30px; height: 30px; padding: 0; }
    .m4-atom-traced { outline: 3px solid var(--sun-500); outline-offset: 2px; box-shadow: 0 0 0 6px rgba(255, 183, 3, 0.35); animation: m4-pulse 0.6s ease-in-out 2; }
    @keyframes m4-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
    .m4-equation { font-size: 1.3rem; font-weight: 700; text-align: center; background: var(--green-100); color: var(--text); padding: 0.9rem; border-radius: 10px; letter-spacing: 0.02em; }
    .m4-takeaways { line-height: 1.6; }
    .m4-takeaways li { margin-bottom: 0.5rem; }
    .m4-inventory-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .m4-inv-col { display: flex; flex-direction: column; gap: 0.3rem; }
    .m4-count-input { width: 100%; max-width: 140px; padding: 0.4rem 0.6rem; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-elevated); color: var(--text); margin-bottom: 0.5rem; }
    .m4-result-good { color: #2a7a4f; font-weight: 600; }
    .m4-result-bad { color: #9d2b2b; font-weight: 600; }
    :root[data-theme='dark'] .m4-result-good { color: #6fd6ae; }
    :root[data-theme='dark'] .m4-result-bad { color: #f5a189; }
  `;
  document.head.appendChild(style);
}

function buildMoleculeCard(target) {
  const card = el('div', { class: 'card m4-molecule-card' });

  const targetRow = el('div', { class: 'flex gap-1 flex-wrap mt-1' });
  Object.entries(target.target).forEach(([sym, count]) => targetRow.appendChild(atomChip(sym, count)));

  const dropzone = el('div', {
    class: 'dropzone m4-dropzone',
    role: 'group',
    'aria-label': `${target.name} building slot - drag atoms here or use the add buttons below`,
  });

  const tally = el('p', { class: 'text-muted mt-1', 'aria-live': 'polite' }, 'Current: 0 C, 0 H, 0 O');

  function updateTally() {
    const c = dropzone.querySelectorAll('.atom-C').length;
    const h = dropzone.querySelectorAll('.atom-H').length;
    const o = dropzone.querySelectorAll('.atom-O').length;
    tally.textContent = `Current: ${c} C, ${h} H, ${o} O`;
  }

  function addAtom(sym) {
    if (!LONGNAMES[sym]) return;
    const chip = el(
      'button',
      {
        class: `atom-chip atom-${sym} m4-placed-atom`,
        type: 'button',
        'aria-label': `${LONGNAMES[sym]} atom placed in ${target.name}. Activate to remove it.`,
        onclick: () => {
          chip.remove();
          updateTally();
        },
      },
      sym
    );
    dropzone.appendChild(chip);
    updateTally();
  }

  makeDropzone(dropzone, { accepts: (id) => ['C', 'H', 'O'].includes(id), onDrop: (id) => addAtom(id) });

  const addRow = el('div', { class: 'flex gap-1 flex-wrap mt-1' });
  ['C', 'H', 'O'].forEach((sym) => {
    addRow.appendChild(
      el(
        'button',
        { class: 'btn', type: 'button', 'aria-label': `Add one ${LONGNAMES[sym]} atom to ${target.name}` },
        `+ ${sym}`
      )
    );
  });
  [...addRow.children].forEach((btn, i) => btn.addEventListener('click', () => addAtom(['C', 'H', 'O'][i])));

  function checkMolecule() {
    const counts = {
      C: dropzone.querySelectorAll('.atom-C').length,
      H: dropzone.querySelectorAll('.atom-H').length,
      O: dropzone.querySelectorAll('.atom-O').length,
    };
    const wanted = { C: 0, H: 0, O: 0, ...target.target };
    const correct = counts.C === wanted.C && counts.H === wanted.H && counts.O === wanted.O;
    if (correct) {
      showFeedback(`Correct! That's ${target.formula} - ${describeCounts(target.target)}.`, 'success');
      card.classList.add('m4-molecule-complete');
    } else {
      const parts = [];
      ['C', 'H', 'O'].forEach((sym) => {
        if (counts[sym] !== wanted[sym]) parts.push(`${wanted[sym]} ${LONGNAMES[sym]} (you have ${counts[sym]})`);
      });
      showFeedback(`Not quite. ${target.name} (${target.formula}) needs exactly ${parts.join(' and ')}.`, 'error');
      card.classList.remove('m4-molecule-complete');
    }
  }

  const checkBtn = el('button', { class: 'btn btn-primary mt-1', type: 'button', onclick: checkMolecule }, `Check ${target.formula}`);
  const resetBtn = el(
    'button',
    {
      class: 'btn mt-1',
      type: 'button',
      onclick: () => {
        dropzone.innerHTML = '';
        updateTally();
        card.classList.remove('m4-molecule-complete');
      },
    },
    'Reset'
  );

  card.append(
    el('h3', {}, `${target.name} (${target.formula})`),
    el('p', { class: 'text-muted' }, 'Target:'),
    targetRow,
    dropzone,
    tally,
    addRow,
    el('div', { class: 'flex gap-1 mt-1' }, [checkBtn, resetBtn])
  );
  return card;
}

function buildBuilderSection() {
  const section = el('section', { class: 'card mt-2' });

  const palette = el('div', {
    class: 'm4-palette flex gap-1 flex-wrap mt-1',
    role: 'group',
    'aria-label': 'Atom palette - drag a chip onto a molecule slot below',
  });
  ['C', 'H', 'O'].forEach((sym) => {
    const chip = atomChip(sym, 1);
    chip.classList.add('m4-palette-chip');
    chip.dataset.dragId = sym;
    chip.setAttribute('aria-label', `${LONGNAMES[sym]} atom - drag onto a molecule slot`);
    makeDraggable(chip);
    palette.appendChild(chip);
  });

  section.append(
    el('h2', { class: 'section-title' }, 'Step 1: Build the Molecules'),
    el(
      'p',
      { class: 'text-muted' },
      'Photosynthesis involves four molecules. Drag atom chips from the palette into each slot below - or use the + buttons if dragging is not available - then check your work.'
    ),
    palette,
    el('div', { class: 'card-grid mt-2' }, MOLECULE_TARGETS.map(buildMoleculeCard))
  );
  return section;
}

function buildAnimationSection() {
  const section = el('section', { class: 'card mt-2' });
  section.append(
    el('h2', { class: 'section-title' }, 'Step 2: Watch the Atoms Rearrange'),
    el(
      'p',
      { class: 'text-muted' },
      'These are the same 36 atoms that make up 6 CO₂ + 6 H₂O. Press play to watch them regroup into 1 glucose molecule and 6 O₂ molecules, without a single atom being added or lost. (This particular pairing is a simplified, illustrative regrouping for tracing purposes - not a claim about the exact biological pathway, which is beyond this course.)'
    )
  );

  const stage = el('div', { class: 'm4-stage' });

  const reactantPodsEl = el('div', { class: 'm4-pods-grid' });
  const originLabelById = new Map();
  REACTANT_MOLECULES.forEach((mol) => {
    const { pod } = buildPod(mol, false);
    mol.atoms.forEach((a) => originLabelById.set(a.id, mol.label));
    reactantPodsEl.appendChild(pod);
  });
  const reactantZone = el('div', { class: 'm4-zone' }, [
    el('h3', { class: 'm4-zone-label' }, 'Before: Reactants (6 CO₂ + 6 H₂O)'),
    reactantPodsEl,
  ]);

  const arrow = el('div', { class: 'm4-arrow', 'aria-hidden': 'true' }, '⟶');

  const productPodsEl = el('div', { class: 'm4-pods-grid' });
  const destLabelById = new Map();
  let destRowById = new Map();
  PRODUCT_MOLECULES.forEach((mol) => {
    const { pod, atomsRow } = buildPod(mol, true);
    mol.atoms.forEach((a) => {
      destLabelById.set(a.id, mol.label);
      destRowById.set(a.id, atomsRow);
    });
    productPodsEl.appendChild(pod);
  });
  const productZone = el('div', { class: 'm4-zone' }, [
    el('h3', { class: 'm4-zone-label' }, 'After: Products (1 C₆H₁₂O₆ + 6 O₂)'),
    productPodsEl,
  ]);

  stage.append(reactantZone, arrow, productZone);

  const statusEl = el(
    'p',
    { class: 'text-muted mt-1', role: 'status', 'aria-live': 'polite' },
    'Atoms are grouped as reactants. Press play to rearrange them.'
  );

  const playBtn = el('button', { class: 'btn btn-primary mt-1', type: 'button' }, '▶ Watch the Atoms Rearrange');
  const resetAnimBtn = el('button', { class: 'btn mt-1', type: 'button' }, '↺ Reset Animation');
  resetAnimBtn.disabled = true;

  playBtn.addEventListener('click', () => {
    playBtn.disabled = true;
    const atomEls = [...reactantPodsEl.querySelectorAll('.m4-atom')];
    if (atomEls.length === 0) return;

    // FLIP technique: record First rects, move to Last position, Invert with a
    // transform, then Play the transition back to identity transform.
    const firstRects = new Map();
    atomEls.forEach((a) => firstRects.set(a, a.getBoundingClientRect()));

    atomEls.forEach((a) => {
      const destRow = destRowById.get(a.dataset.atomId);
      if (destRow) destRow.appendChild(a);
    });

    atomEls.forEach((a) => {
      const first = firstRects.get(a);
      const last = a.getBoundingClientRect();
      a.style.transition = 'none';
      a.style.transform = `translate(${first.left - last.left}px, ${first.top - last.top}px)`;
    });

    // Force reflow so the "none" transition + starting transform are committed
    // before we switch to the animated transition.
    void stage.offsetHeight;

    requestAnimationFrame(() => {
      atomEls.forEach((a) => {
        a.style.transition = 'transform 1s cubic-bezier(0.4, 0, 0.2, 1)';
        a.style.transform = '';
      });
    });

    statusEl.textContent = 'Rearranging... watch the atoms glide into their new molecules.';

    setTimeout(() => {
      atomEls.forEach((a) => {
        a.style.transition = '';
      });
      statusEl.textContent =
        'Rearrangement complete! All 36 atoms moved from reactant molecules into product molecules - none were created, none were destroyed.';
      resetAnimBtn.disabled = false;
      showFeedback('Matter rearranged, not created or destroyed!', 'success');
    }, 1100);
  });

  resetAnimBtn.addEventListener('click', () => {
    reactantPodsEl.innerHTML = '';
    productPodsEl.innerHTML = '';
    destRowById = new Map();
    REACTANT_MOLECULES.forEach((mol) => {
      const { pod } = buildPod(mol, false);
      reactantPodsEl.appendChild(pod);
    });
    PRODUCT_MOLECULES.forEach((mol) => {
      const { pod, atomsRow } = buildPod(mol, true);
      mol.atoms.forEach((a) => destRowById.set(a.id, atomsRow));
      productPodsEl.appendChild(pod);
    });
    playBtn.disabled = false;
    resetAnimBtn.disabled = true;
    statusEl.textContent = 'Atoms are grouped as reactants. Press play to rearrange them.';
  });

  const allIds = REACTANT_MOLECULES.flatMap((m) => m.atoms.map((a) => a.id)).sort(atomIdSort);
  const traceSelectId = 'm4-trace-select';
  const traceSelect = el('select', { 'aria-label': 'Choose an atom to trace', id: traceSelectId });
  allIds.forEach((id) => traceSelect.appendChild(el('option', { value: id }, id)));
  const traceBtn = el('button', { class: 'btn mt-1', type: 'button' }, '🔎 Trace this atom');
  traceBtn.addEventListener('click', () => {
    const id = traceSelect.value;
    const target = stage.querySelector(`[data-atom-id="${id}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('m4-atom-traced');
    setTimeout(() => target.classList.remove('m4-atom-traced'), 2500);
    showFeedback(`Atom ${id}: started in ${originLabelById.get(id)}, ends up in ${destLabelById.get(id)}.`, 'info', 4200);
  });
  const traceRow = el('div', { class: 'flex gap-1 flex-wrap mt-2' }, [
    el('label', { for: traceSelectId }, 'Trace a specific atom:'),
    traceSelect,
    traceBtn,
  ]);

  section.append(stage, el('div', { class: 'flex gap-1 flex-wrap mt-1' }, [playBtn, resetAnimBtn]), statusEl, traceRow);
  return section;
}

function buildTakeawaysSection() {
  const section = el('section', { class: 'card mt-2' });
  section.append(
    el('h2', { class: 'section-title' }, 'The Big Idea: Conservation of Matter'),
    el('p', { class: 'm4-equation' }, '6CO₂ + 6H₂O ⟶ C₆H₁₂O₆ + 6O₂'),
    el('ul', { class: 'm4-takeaways' }, [
      el('li', {}, [
        el('strong', {}, 'Matter is rearranged: '),
        'atoms swap partners. Carbon and oxygen atoms that started in CO₂, and hydrogen and oxygen atoms that started in H₂O, end up bonded differently in glucose and oxygen gas.',
      ]),
      el('li', {}, [
        el('strong', {}, 'Matter is conserved: '),
        'the exact same 36 atoms (6 C, 12 H, 18 O) present before the reaction are present after it - just organized into new molecules.',
      ]),
      el('li', {}, [
        el('strong', {}, 'Atoms are neither created nor destroyed: '),
        'this is the Law of Conservation of Matter. It is why a correctly balanced chemical equation must have identical atom counts on both sides.',
      ]),
    ])
  );
  return section;
}

function buildInventorySection() {
  const section = el('section', { class: 'card mt-2' });
  section.append(
    el('h2', { class: 'section-title' }, 'Step 3: Atom Inventory Check'),
    el(
      'p',
      { class: 'text-muted' },
      'Count the atoms yourself. Using the balanced equation above, type how many total carbon, hydrogen, and oxygen atoms appear on the reactant side, and how many appear on the product side.'
    )
  );

  function countInputs(prefix, label) {
    const wrap = el('div', { class: 'm4-inv-col' });
    wrap.appendChild(el('h3', {}, label));
    const ids = {};
    ['C', 'H', 'O'].forEach((sym) => {
      const inputId = `m4-inv-${prefix}-${sym}`;
      ids[sym] = inputId;
      wrap.append(
        el('label', { for: inputId }, `Total ${LONGNAMES[sym]} atoms:`),
        el('input', { type: 'number', min: '0', step: '1', id: inputId, class: 'm4-count-input', value: '0' })
      );
    });
    return { wrap, ids };
  }

  const reactantCols = countInputs('r', 'Reactant Side (6CO₂ + 6H₂O)');
  const productCols = countInputs('p', 'Product Side (C₆H₁₂O₆ + 6O₂)');
  const grid = el('div', { class: 'm4-inventory-grid' }, [reactantCols.wrap, productCols.wrap]);

  const resultEl = el('p', { class: 'mt-1', role: 'status', 'aria-live': 'polite' });

  const checkBtn = el('button', { class: 'btn btn-primary mt-1', type: 'button' }, 'Check My Inventory');
  checkBtn.addEventListener('click', () => {
    const get = (id) => parseInt(document.getElementById(id).value, 10) || 0;
    const rC = get(reactantCols.ids.C);
    const rH = get(reactantCols.ids.H);
    const rO = get(reactantCols.ids.O);
    const pC = get(productCols.ids.C);
    const pH = get(productCols.ids.H);
    const pO = get(productCols.ids.O);
    const correct = { C: 6, H: 12, O: 18 };
    const reactantOk = rC === correct.C && rH === correct.H && rO === correct.O;
    const productOk = pC === correct.C && pH === correct.H && pO === correct.O;

    if (reactantOk && productOk) {
      resultEl.textContent = 'Correct! Both sides total 6 C, 12 H, and 18 O atoms. Matter is conserved.';
      resultEl.className = 'mt-1 m4-result-good';
      showFeedback('Atom inventory confirmed - matter is conserved!', 'success');
    } else {
      const issues = [];
      if (!reactantOk) issues.push(`reactant side should total 6 C, 12 H, 18 O (you entered ${rC} C, ${rH} H, ${rO} O)`);
      if (!productOk) issues.push(`product side should total 6 C, 12 H, 18 O (you entered ${pC} C, ${pH} H, ${pO} O)`);
      resultEl.textContent = `Check again: ${issues.join('; ')}.`;
      resultEl.className = 'mt-1 m4-result-bad';
      showFeedback('Recount the atoms in the equation and try again.', 'error');
    }
  });

  section.append(grid, checkBtn, resultEl);
  return section;
}

function buildQuizSection() {
  const section = el('section', { class: 'card mt-2' });
  section.append(el('h2', { class: 'section-title' }, 'Quick Check'), el('p', { class: 'text-muted' }, 'Answer all questions to complete Module 4.'));

  let answered = 0;
  let correct = 0;
  const scoreEl = el('p', { class: 'mt-1', role: 'status', 'aria-live': 'polite' });

  QUIZ.forEach((q) => {
    section.appendChild(
      quizQuestion({
        question: q.question,
        choices: q.choices,
        correctIndex: q.correctIndex,
        onAnswer: (isCorrect) => {
          answered += 1;
          if (isCorrect) correct += 1;
          if (answered === QUIZ.length) {
            const score = Math.round((correct / QUIZ.length) * 100);
            completeModule('module4', score);
            scoreEl.textContent = `You scored ${score}% (${correct}/${QUIZ.length}). Module 4 complete!`;
            showFeedback(`Module 4 complete - score ${score}%!`, 'success');
            if (score >= 75) confettiBurst();
          }
        },
      })
    );
  });

  section.appendChild(scoreEl);
  return section;
}

export function render(container) {
  visitModule('module4');
  injectStyles();

  container.append(
    el('h1', {}, '🔬 Module 4: Matter Explorer'),
    el(
      'p',
      { class: 'essential-question' },
      'If plants "make their own food," where do the atoms in that food actually come from - and where do they go?'
    )
  );

  container.appendChild(buildBuilderSection());
  container.appendChild(buildAnimationSection());
  container.appendChild(buildTakeawaysSection());
  container.appendChild(buildInventorySection());
  container.appendChild(buildQuizSection());
}
