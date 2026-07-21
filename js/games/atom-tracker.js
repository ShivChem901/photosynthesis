// Game 2: Atom Tracker
// Students sort every atom from the reactant side of the balanced photosynthesis equation
// (6 CO2 + 6 H2O) into the correct product bucket: Glucose (C6H12O6) or Oxygen gas (6 O2).
//
// Arithmetic check (balanced equation: 6CO2 + 6H2O -> C6H12O6 + 6O2):
//   6 CO2 = 6 C + 12 O
//   6 H2O = 12 H + 6 O
//   reactant atom pool = 6 C + 12 H + 18 O  (36 atoms total)
//   Glucose (C6H12O6) needs   6 C + 12 H + 6 O   (24 atoms)
//   Oxygen gas (6 O2) needs             12 O      (12 atoms)
//   24 + 12 = 36 -> every atom in the pool has exactly one correct home. Balances out.

import { el, atomChip, makeDraggable, makeDropzone, showFeedback, confettiBurst, shuffle } from '../utils.js';
import { recordGameScore } from '../state.js';

const STYLE_ID = 'atom-tracker-styles';

const POOL_COUNTS = { C: 6, H: 12, O: 18 };
const TARGETS = {
  glucose: { C: 6, H: 12, O: 6 },
  oxygen: { O: 12 },
};
const ELEMENT_NAMES = { C: 'Carbon', H: 'Hydrogen', O: 'Oxygen' };

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = el('style', { id: STYLE_ID }, `
    .at-wrap { display: flex; flex-direction: column; gap: 1rem; }
    .at-hud { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .at-stat { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 999px; padding: 0.4rem 0.9rem; font-weight: 700; }
    .at-hint { text-align: center; color: var(--text-muted); font-size: 0.9rem; max-width: 70ch; margin: 0 auto; }
    .at-pool {
      display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center;
      padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius);
      background: var(--bg-elevated); min-height: 4.5rem;
    }
    .at-pool-empty { color: var(--text-muted); font-size: 0.9rem; }
    .at-buckets { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
    .at-bucket { border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-elevated); padding: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .at-bucket h3 { margin: 0; color: var(--green-700); }
    :root[data-theme='dark'] .at-bucket h3 { color: var(--green-300); }
    .at-tally { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .at-tally-item { display: inline-flex; align-items: center; gap: 0.3rem; font-weight: 700; font-size: 0.85rem; }
    .at-tally-item.at-tally-met { color: #2a9d8f; }
    .at-dropzone {
      min-height: 90px; display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: flex-start; align-content: flex-start;
    }
    .at-dropzone-empty { color: var(--text-muted); font-size: 0.85rem; margin: auto; }
    .at-atom-btn {
      border: none; cursor: grab; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.25);
    }
    .at-atom-btn.selected { outline: var(--focus-ring); transform: scale(1.12); }
    .at-atom-btn.placed { cursor: pointer; }
    .at-atom-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .at-place-row { display: flex; gap: 0.5rem; }
    .at-summary { text-align: center; }
  `);
  document.head.appendChild(style);
}

export function render(container) {
  injectStyles();
  container.innerHTML = '';

  let atoms = [];
  let idCounter = 0;
  Object.entries(POOL_COUNTS).forEach(([elem, count]) => {
    for (let i = 0; i < count; i++) {
      atoms.push({ id: `atom-${idCounter++}`, element: elem, location: 'pool' });
    }
  });
  atoms = shuffle(atoms);

  let selectedAtomId = null;
  let mistakes = 0;
  let elapsedSeconds = 0;
  let finished = false;
  let tickId = null;
  let pendingFocusId = null;

  const wrap = el('div', { class: 'at-wrap' });
  const hud = el('div', { class: 'at-hud' });
  const timeStat = el('div', { class: 'at-stat' }, 'Time: 0s');
  const mistakeStat = el('div', { class: 'at-stat' }, 'Mistakes: 0');
  hud.append(timeStat, mistakeStat);

  const hint = el('p', { class: 'at-hint' },
    'These atoms came from 6 CO₂ + 6 H₂O. Drag each one into the bucket it ends up in on the product side of the balanced equation — or click an atom, then click "Place here." Oxygen gas is pure oxygen, so it only accepts O atoms.');

  const poolEl = el('div', { class: 'at-pool', role: 'group', 'aria-label': 'Atom pool from 6 carbon dioxide plus 6 water' });

  const glucoseZone = el('div', { class: 'at-dropzone', role: 'group', 'aria-label': 'Glucose bucket contents' });
  const glucoseTally = el('div', { class: 'at-tally' });
  const glucosePlaceBtn = el('button', { class: 'btn', type: 'button', disabled: true, onclick: () => placeSelected('glucose') }, 'Place here');
  const glucoseBucket = el('div', { class: 'at-bucket' }, [
    el('h3', {}, 'Glucose (C₆H₁₂O₆)'),
    glucoseTally,
    glucoseZone,
    el('div', { class: 'at-place-row' }, [glucosePlaceBtn]),
  ]);

  const oxygenZone = el('div', { class: 'at-dropzone', role: 'group', 'aria-label': 'Oxygen gas bucket contents' });
  const oxygenTally = el('div', { class: 'at-tally' });
  const oxygenPlaceBtn = el('button', { class: 'btn', type: 'button', disabled: true, onclick: () => placeSelected('oxygen') }, 'Place here');
  const oxygenBucket = el('div', { class: 'at-bucket' }, [
    el('h3', {}, 'Oxygen Gas (6 O₂)'),
    oxygenTally,
    oxygenZone,
    el('div', { class: 'at-place-row' }, [oxygenPlaceBtn]),
  ]);

  const bucketsEl = el('div', { class: 'at-buckets' }, [glucoseBucket, oxygenBucket]);
  const summaryHost = el('div', {});

  wrap.append(hud, hint, poolEl, bucketsEl, summaryHost);
  container.appendChild(wrap);

  makeDropzone(glucoseZone, { accepts: () => !finished, onDrop: (dragId) => handleDrop(dragId, 'glucose') });
  makeDropzone(oxygenZone, { accepts: () => !finished, onDrop: (dragId) => handleDrop(dragId, 'oxygen') });

  function atomById(id) {
    return atoms.find((a) => a.id === id);
  }

  function countsIn(location) {
    const counts = { C: 0, H: 0, O: 0 };
    atoms.forEach((a) => { if (a.location === location) counts[a.element] += 1; });
    return counts;
  }

  function handleDrop(dragId, bucketName) {
    const atom = atomById(dragId);
    if (!atom || finished) return;
    attemptPlace(atom, bucketName);
  }

  function selectAtom(atom) {
    if (finished) return;
    selectedAtomId = selectedAtomId === atom.id ? null : atom.id;
    pendingFocusId = atom.id;
    renderAll();
  }

  function returnToPool(atom) {
    if (finished) return;
    atom.location = 'pool';
    if (selectedAtomId === atom.id) selectedAtomId = null;
    pendingFocusId = atom.id;
    renderAll();
  }

  function placeSelected(bucketName) {
    if (finished || !selectedAtomId) return;
    const atom = atomById(selectedAtomId);
    if (!atom) return;
    attemptPlace(atom, bucketName);
  }

  function attemptPlace(atom, bucketName) {
    const target = TARGETS[bucketName];
    const cap = target[atom.element] || 0;
    const alreadyThere = atoms.filter((a) => a.location === bucketName && a.element === atom.element && a.id !== atom.id).length;
    const allowed = cap > 0 && alreadyThere < cap;

    if (!allowed) {
      mistakes += 1;
      mistakeStat.textContent = `Mistakes: ${mistakes}`;
      const bucketLabel = bucketName === 'oxygen' ? 'Oxygen gas (O₂)' : 'Glucose (C₆H₁₂O₆)';
      const reason = cap === 0
        ? `${bucketLabel} doesn't contain any ${ELEMENT_NAMES[atom.element].toLowerCase()} atoms.`
        : `${bucketLabel} already has all the ${ELEMENT_NAMES[atom.element].toLowerCase()} atoms it needs.`;
      showFeedback(reason, 'error', 2400);
      return;
    }

    atom.location = bucketName;
    if (selectedAtomId === atom.id) selectedAtomId = null;
    renderAll();
    checkFinished();
  }

  function makeAtomButton(atom) {
    const isPlaced = atom.location !== 'pool';
    const btn = el('button', {
      class: `atom-chip atom-${atom.element} at-atom-btn${selectedAtomId === atom.id ? ' selected' : ''}${isPlaced ? ' placed' : ''}`,
      type: 'button',
      disabled: finished,
      'data-drag-id': atom.id,
      'aria-pressed': String(selectedAtomId === atom.id),
      'aria-label': isPlaced
        ? `${ELEMENT_NAMES[atom.element]} atom, placed. Activate to send it back to the pool.`
        : `${ELEMENT_NAMES[atom.element]} atom. Activate to select it, then use a "Place here" button.`,
      onclick: () => (isPlaced ? returnToPool(atom) : selectAtom(atom)),
    }, atom.element);
    if (!finished) makeDraggable(btn);
    return btn;
  }

  function renderTallies(tallyEl, bucketName) {
    tallyEl.innerHTML = '';
    const counts = countsIn(bucketName);
    Object.keys(TARGETS[bucketName]).forEach((elem) => {
      const need = TARGETS[bucketName][elem];
      const have = counts[elem];
      const met = have === need;
      tallyEl.appendChild(el('span', { class: `at-tally-item${met ? ' at-tally-met' : ''}` }, [
        atomChip(elem, have || 1),
        document.createTextNode(`${have}/${need}`),
      ]));
    });
  }

  function renderAll() {
    poolEl.innerHTML = '';
    const poolAtoms = atoms.filter((a) => a.location === 'pool');
    if (poolAtoms.length === 0) {
      poolEl.appendChild(el('p', { class: 'at-pool-empty' }, 'All atoms sorted!'));
    } else {
      poolAtoms.forEach((a) => poolEl.appendChild(makeAtomButton(a)));
    }

    glucoseZone.innerHTML = '';
    const glucoseAtoms = atoms.filter((a) => a.location === 'glucose');
    if (glucoseAtoms.length === 0) glucoseZone.appendChild(el('p', { class: 'at-dropzone-empty' }, 'Drop atoms here'));
    else glucoseAtoms.forEach((a) => glucoseZone.appendChild(makeAtomButton(a)));

    oxygenZone.innerHTML = '';
    const oxygenAtoms = atoms.filter((a) => a.location === 'oxygen');
    if (oxygenAtoms.length === 0) oxygenZone.appendChild(el('p', { class: 'at-dropzone-empty' }, 'Drop atoms here'));
    else oxygenAtoms.forEach((a) => oxygenZone.appendChild(makeAtomButton(a)));

    renderTallies(glucoseTally, 'glucose');
    renderTallies(oxygenTally, 'oxygen');

    const selectedAtom = selectedAtomId ? atomById(selectedAtomId) : null;
    glucosePlaceBtn.disabled = !selectedAtom || finished;
    oxygenPlaceBtn.disabled = !selectedAtom || finished;
    glucosePlaceBtn.textContent = selectedAtom ? `Place ${ELEMENT_NAMES[selectedAtom.element]} here` : 'Place here';
    oxygenPlaceBtn.textContent = selectedAtom ? `Place ${ELEMENT_NAMES[selectedAtom.element]} here` : 'Place here';

    if (pendingFocusId) {
      const target = wrap.querySelector(`[data-drag-id="${pendingFocusId}"]`);
      if (target) target.focus();
      pendingFocusId = null;
    }
  }

  function checkFinished() {
    if (finished) return;
    if (atoms.every((a) => a.location !== 'pool')) {
      finishGame();
    }
  }

  function tick() {
    elapsedSeconds += 1;
    timeStat.textContent = `Time: ${elapsedSeconds}s`;
  }

  function finishGame() {
    finished = true;
    clearInterval(tickId);

    const timePenalty = Math.max(0, elapsedSeconds - 30) * 1.5;
    const mistakePenalty = mistakes * 6;
    const raw = 100 - timePenalty - mistakePenalty;
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    recordGameScore('atomTracker', score);
    renderAll();

    const goodRun = score >= 80 || mistakes === 0;
    const summary = el('div', { class: 'card at-summary mt-2', role: 'status' }, [
      el('h2', {}, goodRun ? 'Every atom traced correctly! 🎉' : 'All atoms sorted!'),
      el('p', {}, `Time: ${elapsedSeconds}s · Mistakes: ${mistakes}`),
      el('p', {}, `Final score: ${score} / 100`),
      el('button', {
        class: 'btn btn-primary mt-1',
        type: 'button',
        onclick: () => render(container),
      }, 'Play again'),
    ]);
    summaryHost.appendChild(summary);

    if (goodRun) {
      confettiBurst();
      showFeedback(`Great tracing! Final score ${score}/100.`, 'success', 3200);
    } else {
      showFeedback(`All sorted — final score ${score}/100.`, 'info', 3200);
    }
  }

  renderAll();
  tickId = setInterval(tick, 1000);
}
