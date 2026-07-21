// Game 1: Balance It! — a fast, timed arcade game for balancing the photosynthesis equation.
// Distinct from Module 3's full step-mode teaching tool: no difficulty ladder, no atom-by-atom
// walkthrough — just place coefficient tiles before the clock runs out.

import { el, atomChip, makeDraggable, makeDropzone, showFeedback, confettiBurst, shuffle } from '../utils.js';
import { recordGameScore, awardBadge } from '../state.js';

const STYLE_ID = 'balance-it-styles';
const TIME_LIMIT = 75; // seconds
const TOTAL_ROUNDS = 4;

// Each round is the same balanced skeleton; coefficients are what students place.
// blanks: [CO2, H2O, C6H12O6 (fixed at 1, shown for completeness), O2]
const ROUND = {
  answer: [6, 6, 1, 6],
  labels: ['CO₂', 'H₂O', 'C₆H₁₂O₆', 'O₂'],
};

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = el('style', { id: STYLE_ID }, `
    .bi-wrap { display: flex; flex-direction: column; gap: 1rem; }
    .bi-hud { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; justify-content: space-between; }
    .bi-stat { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 999px; padding: 0.4rem 0.9rem; font-weight: 700; }
    .bi-clock { color: var(--green-700); }
    :root[data-theme='dark'] .bi-clock { color: var(--green-300); }
    .bi-clock.low { color: #c0392b; }
    .bi-equation {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
      gap: 0.5rem; font-size: 1.5rem; font-weight: 700; padding: 1.25rem 0.5rem;
      background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius);
      text-align: center;
    }
    .bi-term { display: inline-flex; align-items: center; gap: 0.3rem; }
    .bi-blank {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.4rem; height: 2.4rem; border-radius: 8px;
      border: 3px dashed var(--border); font-size: 1.1rem; font-weight: 800;
      background: var(--bg); color: var(--text); cursor: pointer;
    }
    .bi-blank.filled { border-style: solid; border-color: var(--green-500); background: var(--green-100); }
    .bi-blank.correct { border-color: #2a9d8f; background: #d4f5ee; color: #124d43; }
    .bi-blank.wrong { border-color: #e76f51; background: #fde3da; color: #7a2c15; }
    .bi-blank.selected-target { outline: var(--focus-ring); }
    .bi-tiles { display: flex; flex-wrap: wrap; gap: 0.6rem; justify-content: center; padding: 0.5rem; }
    .bi-tile {
      width: 2.6rem; height: 2.6rem; border-radius: 50%;
      border: 2px solid var(--green-700); background: var(--bg-elevated); color: var(--green-700);
      font-weight: 800; font-size: 1.15rem; cursor: grab; display: flex; align-items: center; justify-content: center;
    }
    :root[data-theme='dark'] .bi-tile { color: var(--green-300); border-color: var(--green-300); }
    .bi-tile.picked { outline: var(--focus-ring); background: var(--sun-300); color: #3a2a00; border-color: var(--sun-500); }
    .bi-tile:disabled { opacity: 0.35; cursor: not-allowed; }
    .bi-counters { display: flex; flex-wrap: wrap; gap: 1.5rem; justify-content: center; }
    .bi-counter-col { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .bi-counter-col h4 { margin: 0; font-size: 0.85rem; color: var(--text-muted); }
    .bi-counter-row { display: flex; gap: 0.35rem; }
    .bi-counter-row.balanced .atom-chip { box-shadow: 0 0 0 3px #2a9d8f; }
    .bi-actions { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
    .bi-hint { text-align: center; color: var(--text-muted); font-size: 0.9rem; }
  `);
  document.head.appendChild(style);
}

export function render(container) {
  injectStyles();
  container.innerHTML = '';

  let round = 1;
  let score = 0;
  let mistakes = 0;
  let timeLeft = TIME_LIMIT;
  let timerId = null;
  let ended = false;
  let selectedTile = null; // { value, tileEl } for click-to-place fallback
  let blanks = []; // { index, value, el }
  let tilePool = [];

  const wrap = el('div', { class: 'bi-wrap' });
  const hud = el('div', { class: 'bi-hud' });
  const roundStat = el('div', { class: 'bi-stat' }, `Round ${round} / ${TOTAL_ROUNDS}`);
  const scoreStat = el('div', { class: 'bi-stat' }, `Score: ${score}`);
  const clockStat = el('div', { class: 'bi-stat bi-clock' }, `⏱ ${timeLeft}s`);
  hud.append(roundStat, scoreStat, clockStat);

  const hint = el('p', { class: 'bi-hint' }, 'Drag a tile onto a blank, or click a tile then click a blank. Balance every round before time runs out!');

  const equationEl = el('div', { class: 'bi-equation', role: 'group', 'aria-label': 'Photosynthesis equation to balance' });
  const tilesEl = el('div', { class: 'bi-tiles', role: 'group', 'aria-label': 'Coefficient tiles' });
  const countersEl = el('div', { class: 'bi-counters' });
  const actionsEl = el('div', { class: 'bi-actions' });

  wrap.append(hud, hint, equationEl, tilesEl, countersEl, actionsEl);
  container.appendChild(wrap);

  function buildEquation() {
    equationEl.innerHTML = '';
    blanks = [];

    const makeBlank = (idx) => {
      const b = el('button', {
        class: 'bi-blank',
        type: 'button',
        'aria-label': `Coefficient blank for ${ROUND.labels[idx]}`,
        onclick: () => handleBlankClick(idx),
      }, '?');
      makeDropzone(b, {
        accepts: () => !ended,
        onDrop: (dragId) => placeTile(idx, dragId),
      });
      blanks.push({ index: idx, value: null, el: b });
      return b;
    };

    equationEl.append(
      el('span', { class: 'bi-term' }, [makeBlank(0), document.createTextNode('CO₂')]),
      document.createTextNode('+'),
      el('span', { class: 'bi-term' }, [makeBlank(1), document.createTextNode('H₂O')]),
      document.createTextNode('→'),
      el('span', { class: 'bi-term' }, [document.createTextNode('C₆H₁₂O₆')]),
      document.createTextNode('+'),
      el('span', { class: 'bi-term' }, [makeBlank(3), document.createTextNode('O₂')])
    );
  }

  function buildTiles() {
    tilesEl.innerHTML = '';
    // Correct solve needs three coefficient-6 tiles (CO2=6, H2O=6, O2=6); the rest are distractors.
    tilePool = shuffle([6, 6, 6, 1, 2, 3, 4, 5]).map((v, i) => ({ id: `tile-${i}`, value: v, used: false }));
    tilePool.forEach((tile) => {
      const t = el('button', {
        class: 'bi-tile',
        type: 'button',
        'data-drag-id': tile.id,
        'aria-label': `Coefficient tile ${tile.value}`,
        onclick: () => handleTileClick(tile, t),
      }, String(tile.value));
      makeDraggable(t);
      tile.el = t;
      tilesEl.appendChild(t);
    });
  }

  function handleTileClick(tile, tileEl) {
    if (ended || tile.used) return;
    if (selectedTile && selectedTile.tile === tile) {
      // deselect
      tileEl.classList.remove('picked');
      selectedTile = null;
      return;
    }
    if (selectedTile) selectedTile.tileEl.classList.remove('picked');
    selectedTile = { tile, tileEl };
    tileEl.classList.add('picked');
  }

  function handleBlankClick(idx) {
    if (ended) return;
    if (!selectedTile) {
      showFeedback('Pick a coefficient tile first, then click a blank.', 'info', 1800);
      return;
    }
    placeTile(idx, selectedTile.tile.id);
  }

  function placeTile(idx, dragId) {
    if (ended) return;
    const tile = tilePool.find((t) => t.id === dragId && !t.used);
    if (!tile) return;
    const blank = blankAt(idx);
    // free a previously placed tile in this blank, if any
    if (blank.value !== null) {
      const prev = tilePool.find((t) => t.value === blank.value && t.usedAt === idx);
      if (prev) { prev.used = false; prev.usedAt = null; prev.el.disabled = false; }
    }
    tile.used = true;
    tile.usedAt = idx;
    tile.el.disabled = true;
    if (selectedTile && selectedTile.tile === tile) {
      selectedTile.tileEl.classList.remove('picked');
      selectedTile = null;
    }
    blank.value = tile.value;
    blank.el.textContent = String(tile.value);
    blank.el.classList.add('filled');
    blank.el.classList.remove('correct', 'wrong');
    updateCounters();
    checkComplete();
  }

  function blankAt(idx) {
    return blanks.find((b) => b.index === idx);
  }

  function atomTotals(coeffs) {
    // coeffs = [co2, h2o, glucose(fixed 1 always for this equation), o2]
    const [co2, h2o, glu, o2] = coeffs;
    const left = {
      C: co2 * 1,
      H: h2o * 2,
      O: co2 * 2 + h2o * 1,
    };
    const right = {
      C: glu * 6,
      H: glu * 12,
      O: glu * 6 + o2 * 2,
    };
    return { left, right };
  }

  function updateCounters() {
    const coeffs = [blankAt(0).value || 0, blankAt(1).value || 0, 1, blankAt(3).value || 0];
    const { left, right } = atomTotals(coeffs);
    countersEl.innerHTML = '';
    ['C', 'H', 'O'].forEach((elSym) => {
      const balanced = left[elSym] === right[elSym] && left[elSym] > 0;
      const col = el('div', { class: 'bi-counter-col' }, [
        el('h4', {}, `${elSym} atoms`),
        el('div', { class: `bi-counter-row${balanced ? ' balanced' : ''}` }, [
          atomChip(elSym, left[elSym]),
          document.createTextNode('='),
          atomChip(elSym, right[elSym]),
        ]),
      ]);
      countersEl.appendChild(col);
    });
  }

  function checkComplete() {
    if (blanks.some((b) => b.value === null)) return;
    const isCorrect = blanks.every((b) => b.value === ROUND.answer[b.index]);
    blanks.forEach((b) => {
      const correct = b.value === ROUND.answer[b.index];
      b.el.classList.toggle('correct', correct);
      b.el.classList.toggle('wrong', !correct);
    });
    if (isCorrect) {
      const timeBonus = Math.max(0, Math.round(timeLeft / 3));
      const roundPoints = 20 + timeBonus;
      score += roundPoints;
      scoreStat.textContent = `Score: ${score}`;
      showFeedback(`Balanced! +${roundPoints} points`, 'success', 1800);
      nextRound(true);
    } else {
      mistakes += 1;
      showFeedback('Not balanced yet — check the atom counts below.', 'error', 2000);
      setTimeout(() => {
        if (!ended) resetBlanksForRetry();
      }, 900);
    }
  }

  function resetBlanksForRetry() {
    blanks.forEach((b) => {
      b.value = null;
      b.el.textContent = '?';
      b.el.classList.remove('filled', 'correct', 'wrong');
    });
    tilePool.forEach((t) => { t.used = false; t.usedAt = null; t.el.disabled = false; });
    updateCounters();
  }

  function nextRound(wasCorrect) {
    if (round >= TOTAL_ROUNDS) {
      finishGame(wasCorrect);
      return;
    }
    round += 1;
    roundStat.textContent = `Round ${round} / ${TOTAL_ROUNDS}`;
    buildEquation();
    buildTiles();
    updateCounters();
  }

  function tick() {
    timeLeft -= 1;
    clockStat.textContent = `⏱ ${timeLeft}s`;
    clockStat.classList.toggle('low', timeLeft <= 15);
    if (timeLeft <= 0) {
      finishGame(false);
    }
  }

  function finishGame(lastRoundCorrect) {
    if (ended) return;
    ended = true;
    clearInterval(timerId);
    tilesEl.querySelectorAll('.bi-tile').forEach((t) => (t.disabled = true));
    blanks.forEach((b) => (b.el.disabled = true));

    const roundsCompleted = lastRoundCorrect ? round : round - 1;
    const maxScore = TOTAL_ROUNDS * (20 + Math.round(TIME_LIMIT / 3));
    const normalized = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
    const perfectRun = roundsCompleted >= TOTAL_ROUNDS && mistakes === 0;

    recordGameScore('balanceIt', normalized);

    actionsEl.innerHTML = '';
    hint.textContent = '';
    equationEl.setAttribute('aria-hidden', 'true');

    const summary = el('div', { class: 'card mt-2', role: 'status' }, [
      el('h2', {}, perfectRun ? 'Perfect balance! 🎉' : 'Time!'),
      el('p', {}, `You balanced ${roundsCompleted} of ${TOTAL_ROUNDS} rounds with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.`),
      el('p', {}, `Final score: ${normalized} / 100`),
    ]);
    wrap.appendChild(summary);

    if (perfectRun || normalized >= 85) {
      confettiBurst();
      awardBadge('balanceItGold');
      showFeedback('Balance It! Champion badge earned!', 'success', 3000);
    } else {
      showFeedback(`Game over — final score ${normalized}/100`, 'info', 3000);
    }

    actionsEl.appendChild(el('button', {
      class: 'btn btn-primary',
      type: 'button',
      onclick: () => render(container),
    }, 'Play again'));
  }

  buildEquation();
  buildTiles();
  updateCounters();
  timerId = setInterval(tick, 1000);
}
