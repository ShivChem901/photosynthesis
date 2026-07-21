// Module 6: Build Your Own Scientific Model
// Students assemble a complete model of photosynthesis (inputs, transformation,
// outputs, a balanced equation, and matching atom counts) using a draggable
// workspace with a full click-to-place keyboard fallback.

import { visitModule, completeModule } from '../state.js';
import { el, makeDraggable, makeDropzone, showFeedback, confettiBurst, atomChip } from '../utils.js';

const STYLE_ID = 'module6-inline-styles';

const PALETTE = [
  { id: 'sun', icon: '☀️', label: 'Sunlight', desc: 'Light energy that powers the reaction', zone: 'inputs' },
  { id: 'co2', icon: '💨', label: 'Carbon Dioxide (CO₂)', desc: 'Taken in from the air', zone: 'inputs' },
  { id: 'water', icon: '💧', label: 'Water (H₂O)', desc: 'Absorbed by the roots', zone: 'inputs' },
  { id: 'plant', icon: '🌿', label: 'Plant', desc: 'Where the reaction takes place', zone: 'transform' },
  { id: 'roots', icon: '🌱', label: 'Roots', desc: 'Absorb water & minerals from the soil', zone: 'transform' },
  { id: 'energyArrow', icon: '⚡', label: 'Energy Arrow', desc: 'Light energy → chemical energy stored in glucose', zone: 'transform' },
  { id: 'matterArrow', icon: '🔁', label: 'Matter Arrow', desc: 'Atoms from CO₂ & water rearranged into glucose & O₂', zone: 'transform' },
  { id: 'labelProducer', icon: '🏷️', label: 'Label: Producer', desc: '"Plants make their own food"', zone: 'transform' },
  { id: 'glucose', icon: '🍬', label: 'Glucose (C₆H₁₂O₆)', desc: 'Food / stored chemical energy', zone: 'outputs' },
  { id: 'oxygen', icon: '🫧', label: 'Oxygen (O₂)', desc: 'Released into the air', zone: 'outputs' },
];

const ZONES = [
  { id: 'inputs', title: 'Inputs (Reactants)', hint: 'What does the plant take in?' },
  { id: 'transform', title: 'Transformation / Energy Flow', hint: 'Where the reaction happens — place the plant, roots, and your energy & matter arrows here.' },
  { id: 'outputs', title: 'Outputs (Products)', hint: 'What does the plant release?' },
];

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .m6-workspace { display: flex; flex-direction: column; gap: 1.5rem; }
    .m6-selection-status { font-weight: 600; color: var(--green-700); min-height: 1.2em; }
    :root[data-theme='dark'] .m6-selection-status { color: var(--green-300); }
    .m6-palette { display: flex; flex-wrap: wrap; gap: 0.6rem; min-height: 100px; }
    .m6-chip {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: var(--bg-elevated); border: 2px solid var(--border); border-radius: 10px;
      padding: 0.5rem 0.7rem; cursor: grab; text-align: left; max-width: 230px;
      color: var(--text); font: inherit;
    }
    .m6-chip:hover { border-color: var(--green-500); }
    .m6-chip.selected { border-color: var(--sun-500); box-shadow: 0 0 0 3px rgba(255,183,3,0.35); }
    .m6-chip-icon { font-size: 1.3rem; }
    .m6-chip-text { display: flex; flex-direction: column; }
    .m6-chip-desc { font-size: 0.78rem; color: var(--text-muted); }
    .m6-zones-grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
    .m6-zone-card h3 { margin-bottom: 0.2rem; color: var(--green-700); }
    :root[data-theme='dark'] .m6-zone-card h3 { color: var(--green-300); }
    .m6-zone-hint { font-size: 0.82rem; margin-top: 0; margin-bottom: 0.5rem; }
    .m6-zone-drop { min-height: 130px; cursor: pointer; }
    .m6-equation { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; font-size: 1.05rem; font-weight: 600; margin: 0.75rem 0; }
    .m6-coeff-select {
      font: inherit; font-weight: 700; padding: 0.25rem 0.4rem; border-radius: 8px;
      border: 2px solid var(--green-500); background: var(--bg-elevated); color: var(--text);
    }
    .m6-eq-arrow { font-weight: 700; color: var(--sun-500); }
    .m6-atom-panel { display: flex; flex-direction: column; gap: 0.5rem; }
    .m6-atom-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; font-size: 0.9rem; }
    .m6-atom-label { font-weight: 600; min-width: 70px; }
    .m6-atom-status { font-weight: 700; }
    .m6-atom-status.ok { color: #2a7a4f; }
    .m6-atom-status.bad { color: #9d2b2b; }
    :root[data-theme='dark'] .m6-atom-status.ok { color: #7be0b5; }
    :root[data-theme='dark'] .m6-atom-status.bad { color: #f5a397; }
    .m6-checklist { display: flex; flex-direction: column; gap: 0.4rem; margin: 0.75rem 0; }
    .m6-check-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.6rem; border-radius: 8px; background: var(--green-100); font-size: 0.92rem; }
    .m6-check-item.bad { background: rgba(157,43,43,0.12); }
    :root[data-theme='dark'] .m6-check-item.bad { background: rgba(245,163,151,0.14); }
    .m6-score { font-weight: 700; }
  `;
  document.head.appendChild(style);
}

export function render(container) {
  visitModule('module6');
  injectStyles();
  container.innerHTML = '';

  const placements = {};
  PALETTE.forEach((p) => { placements[p.id] = 'palette'; });
  const coeffs = { co2: 1, h2o: 1, o2: 1 };
  let selectedId = null;
  const chipEls = {};

  const heading = el('div', {}, [
    el('h1', {}, '🧩 Module 6: Build Your Own Scientific Model'),
    el('p', { class: 'essential-question' }, 'Can you construct a complete scientific model that explains how a plant makes its own food?'),
    el('p', { class: 'text-muted' }, 'Drag each component into the zone where it belongs, balance the chemical equation, and check that atoms are conserved. Click "Check My Model" any time — you can revise and retry until every part is correct.'),
  ]);

  // ---------- Palette ----------
  const selectionStatusEl = el('p', { class: 'm6-selection-status', 'aria-live': 'polite' }, 'Nothing selected.');
  const paletteListEl = el('div', { class: 'm6-palette dropzone', 'aria-label': 'Component palette — components not yet placed' });
  makeDropzone(paletteListEl, { onDrop: (dragId) => placeChip(dragId, 'palette') });

  PALETTE.forEach((item) => {
    const chip = createChip(item);
    chipEls[item.id] = chip;
    paletteListEl.appendChild(chip);
  });

  const paletteSection = el('div', {}, [
    el('h2', { class: 'section-title' }, 'Component Palette'),
    el('p', { class: 'text-muted' }, 'Drag a component into a zone below, or press Enter/Space on a component to select it, then press Enter/Space on a zone to place it there. Select a placed component again to send it back to the palette.'),
    selectionStatusEl,
    paletteListEl,
  ]);

  // ---------- Zones ----------
  const zoneDropEls = {};
  const zoneCards = ZONES.map((zone) => {
    const dropEl = el('div', {
      class: 'm6-zone-drop dropzone',
      tabindex: '0',
      role: 'button',
      'aria-label': `${zone.title} zone. Activate to place the selected component here.`,
    });
    makeDropzone(dropEl, { onDrop: (dragId) => placeChip(dragId, zone.id) });
    dropEl.addEventListener('click', () => { if (selectedId) placeChip(selectedId, zone.id); });
    dropEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (selectedId) placeChip(selectedId, zone.id);
      }
    });
    zoneDropEls[zone.id] = dropEl;
    return el('div', { class: 'card m6-zone-card' }, [
      el('h3', {}, zone.title),
      el('p', { class: 'text-muted m6-zone-hint' }, zone.hint),
      dropEl,
    ]);
  });
  const zonesGrid = el('div', { class: 'm6-zones-grid' }, zoneCards);

  // ---------- Equation widget ----------
  function makeCoeffSelect(key, ariaLabel) {
    const select = el('select', {
      class: 'm6-coeff-select',
      'aria-label': ariaLabel,
      onchange: (e) => { coeffs[key] = Number(e.target.value); refreshAll(); },
    }, Array.from({ length: 12 }, (_, i) => i + 1).map((n) =>
      el('option', { value: String(n), selected: n === coeffs[key] }, String(n))
    ));
    return select;
  }
  const co2Select = makeCoeffSelect('co2', 'Coefficient for carbon dioxide');
  const h2oSelect = makeCoeffSelect('h2o', 'Coefficient for water');
  const o2Select = makeCoeffSelect('o2', 'Coefficient for oxygen');

  const equationEl = el('div', { class: 'm6-equation', role: 'group', 'aria-label': 'Balance the photosynthesis equation' }, [
    co2Select, el('span', {}, ' CO₂  +  '),
    h2oSelect, el('span', {}, ' H₂O   '),
    el('span', { class: 'm6-eq-arrow' }, '☀️→'),
    el('span', {}, '   C₆H₁₂O₆  +  '),
    o2Select, el('span', {}, ' O₂'),
  ]);

  const atomPanelEl = el('div', { class: 'm6-atom-panel' });

  const equationSection = el('div', {}, [
    el('h2', { class: 'section-title' }, 'Balance the Equation'),
    equationEl,
    el('h3', { class: 'mt-2' }, 'Atom Counter'),
    atomPanelEl,
  ]);

  // ---------- Checklist ----------
  const checklistEl = el('div', { class: 'm6-checklist' });
  const scoreEl = el('p', { class: 'm6-score' }, '');
  const checkBtn = el('button', { type: 'button', class: 'btn btn-primary', onclick: () => checkModel() }, 'Check My Model');
  const resetBtn = el('button', { type: 'button', class: 'btn', onclick: () => resetWorkspace() }, 'Reset Workspace');

  const checklistSection = el('div', { class: 'card mt-2' }, [
    el('h2', { class: 'section-title' }, 'Model Checklist'),
    checklistEl,
    scoreEl,
    el('div', { class: 'flex gap-1 mt-2' }, [checkBtn, resetBtn]),
  ]);

  const workspaceCard = el('div', { class: 'card m6-workspace mt-2' }, [
    paletteSection,
    zonesGrid,
    equationSection,
  ]);

  container.append(heading, workspaceCard, checklistSection);

  // ---------- behavior ----------
  function createChip(item) {
    const chip = el('button', {
      type: 'button',
      class: 'm6-chip',
      'data-drag-id': item.id,
      'aria-pressed': 'false',
      'aria-label': `${item.label}. Currently in the palette.`,
    }, [
      el('span', { class: 'm6-chip-icon', 'aria-hidden': 'true' }, item.icon),
      el('span', { class: 'm6-chip-text' }, [
        el('strong', {}, item.label),
        el('span', { class: 'm6-chip-desc' }, item.desc),
      ]),
    ]);
    makeDraggable(chip);
    chip.addEventListener('click', () => onChipClick(item.id));
    return chip;
  }

  function onChipClick(id) {
    const currentZone = placements[id];
    if (currentZone !== 'palette') {
      placeChip(id, 'palette');
      return;
    }
    selectedId = selectedId === id ? null : id;
    updateSelectionUI();
  }

  function updateSelectionUI() {
    PALETTE.forEach((item) => {
      const chip = chipEls[item.id];
      const isSelected = selectedId === item.id;
      chip.classList.toggle('selected', isSelected);
      chip.setAttribute('aria-pressed', String(isSelected));
    });
    if (selectedId) {
      const item = PALETTE.find((p) => p.id === selectedId);
      selectionStatusEl.textContent = `Selected: ${item.label}. Now choose a zone to place it in.`;
    } else {
      selectionStatusEl.textContent = 'Nothing selected.';
    }
  }

  function placeChip(id, targetZone) {
    const item = PALETTE.find((p) => p.id === id);
    if (!item) return;
    const chip = chipEls[id];
    const target = targetZone === 'palette' ? paletteListEl : zoneDropEls[targetZone];
    target.appendChild(chip);
    placements[id] = targetZone;
    selectedId = null;
    chip.classList.remove('selected');
    chip.setAttribute('aria-pressed', 'false');
    const zoneLabel = targetZone === 'palette' ? 'the palette' : ZONES.find((z) => z.id === targetZone).title;
    chip.setAttribute('aria-label', `${item.label}. Currently placed in ${zoneLabel}. Activate to send it back to the palette.`);
    updateSelectionUI();
    refreshAll();
  }

  function computeAtoms() {
    return {
      reactants: { C: coeffs.co2, H: coeffs.h2o * 2, O: coeffs.co2 * 2 + coeffs.h2o },
      products: { C: 6, H: 12, O: 6 + coeffs.o2 * 2 },
    };
  }

  function renderAtomPanel() {
    atomPanelEl.innerHTML = '';
    const atoms = computeAtoms();
    const names = { C: 'Carbon', H: 'Hydrogen', O: 'Oxygen' };
    const rows = ['C', 'H', 'O'].map((element) => {
      const match = atoms.reactants[element] === atoms.products[element];
      return el('div', { class: 'm6-atom-row' }, [
        el('span', { class: 'm6-atom-label' }, names[element]),
        atomChip(element, atoms.reactants[element]),
        el('span', {}, 'reactants  vs.'),
        atomChip(element, atoms.products[element]),
        el('span', {}, 'products'),
        el('span', { class: `m6-atom-status ${match ? 'ok' : 'bad'}` }, match ? '✓ match' : '✗ mismatch'),
      ]);
    });
    atomPanelEl.append(...rows);
  }

  function evaluateCriteria() {
    const atoms = computeAtoms();
    const balanced = coeffs.co2 === 6 && coeffs.h2o === 6 && coeffs.o2 === 6;
    const atomsMatch = atoms.reactants.C === atoms.products.C
      && atoms.reactants.H === atoms.products.H
      && atoms.reactants.O === atoms.products.O;
    return [
      { id: 'sun', ok: placements.sun === 'inputs', label: 'Sunlight is placed in Inputs', missingMsg: 'Add sunlight to your Inputs zone — photosynthesis needs a light energy source to begin.' },
      { id: 'co2', ok: placements.co2 === 'inputs', label: 'Carbon dioxide is placed in Inputs', missingMsg: "Carbon dioxide isn't in your Inputs zone yet — plants take in CO₂ from the air." },
      { id: 'water', ok: placements.water === 'inputs', label: 'Water is placed in Inputs', missingMsg: 'Water still needs to go in your Inputs zone — roots absorb it from the soil.' },
      { id: 'glucose', ok: placements.glucose === 'outputs', label: 'Glucose is placed in Outputs', missingMsg: "Your model is missing a product — don't forget glucose is the food the plant makes." },
      { id: 'oxygen', ok: placements.oxygen === 'outputs', label: 'Oxygen is placed in Outputs', missingMsg: "Your model is missing an output — don't forget oxygen leaves the plant." },
      { id: 'energyArrow', ok: placements.energyArrow === 'transform', label: 'An energy-transformation arrow/label is in the Transformation zone', missingMsg: 'Place your Energy Arrow in the Transformation zone to show light energy becoming chemical energy.' },
      { id: 'matterArrow', ok: placements.matterArrow === 'transform', label: 'A matter-flow arrow/label is in the Transformation zone', missingMsg: 'Place your Matter Arrow in the Transformation zone to show atoms rearranging into new molecules.' },
      { id: 'balanced', ok: balanced, label: 'Chemical equation is balanced (6, 6, 6)', missingMsg: "Your equation isn't balanced yet — every carbon, hydrogen, and oxygen atom must be accounted for on both sides." },
      { id: 'atomsMatch', ok: atomsMatch, label: 'Atom counts match between reactants and products', missingMsg: "Your atom counts don't match yet — matter can't be created or destroyed, so recheck your coefficients." },
    ];
  }

  function renderChecklist(criteria) {
    checklistEl.innerHTML = '';
    criteria.forEach((c) => {
      checklistEl.appendChild(el('div', { class: `m6-check-item ${c.ok ? 'ok' : 'bad'}` }, [
        el('span', { class: 'm6-check-icon', 'aria-hidden': 'true' }, c.ok ? '✅' : '❌'),
        el('span', {}, `${c.label} — ${c.ok ? 'Done' : 'Not yet'}`),
      ]));
    });
    const doneCount = criteria.filter((c) => c.ok).length;
    const pct = Math.round((doneCount / criteria.length) * 100);
    scoreEl.textContent = `Progress: ${doneCount}/${criteria.length} criteria met (${pct}%).`;
  }

  function refreshAll() {
    renderAtomPanel();
    renderChecklist(evaluateCriteria());
  }

  function checkModel() {
    const criteria = evaluateCriteria();
    renderChecklist(criteria);
    renderAtomPanel();
    const missing = criteria.filter((c) => !c.ok);
    if (missing.length === 0) {
      confettiBurst();
      showFeedback('Excellent work! Every piece of your model is in place, your equation is balanced, and your atom counts match — that is a complete scientific model of photosynthesis.', 'success', 5000);
      completeModule('module6', 100);
    } else {
      showFeedback(missing[0].missingMsg, 'error', 5000);
    }
  }

  function resetWorkspace() {
    PALETTE.forEach((item) => {
      placements[item.id] = 'palette';
      paletteListEl.appendChild(chipEls[item.id]);
      chipEls[item.id].setAttribute('aria-label', `${item.label}. Currently in the palette.`);
      chipEls[item.id].classList.remove('selected');
      chipEls[item.id].setAttribute('aria-pressed', 'false');
    });
    coeffs.co2 = 1; coeffs.h2o = 1; coeffs.o2 = 1;
    co2Select.value = '1'; h2oSelect.value = '1'; o2Select.value = '1';
    selectedId = null;
    updateSelectionUI();
    refreshAll();
    showFeedback('Workspace reset. Try again!', 'info');
  }

  refreshAll();
}
