// Shared DOM/UI helpers used across modules, games, and assessments.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c === null || c === undefined) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

// CPK-style atom coloring, standard in chemistry education.
export const ATOM_COLORS = {
  C: '#3a3a3a',
  H: '#e8e8e8',
  O: '#e63946',
};

export const ATOM_TEXT_COLORS = {
  C: '#ffffff',
  H: '#1a1a1a',
  O: '#ffffff',
};

export function atomChip(element, count = 1) {
  return el('span', { class: `atom-chip atom-${element}` }, `${count > 1 ? count : ''}${element}`);
}

let toastTimer = null;
export function showFeedback(message, type = 'info', duration = 3200) {
  let host = document.getElementById('feedback-toast');
  if (!host) {
    host = el('div', { id: 'feedback-toast', class: 'feedback-toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(host);
  }
  host.textContent = message;
  host.className = `feedback-toast feedback-${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => host.classList.remove('show'), duration);
}

export function confettiBurst(container = document.body, count = 40) {
  const colors = ['#ffb703', '#2a9d8f', '#e76f51', '#e9c46a', '#264653'];
  for (let i = 0; i < count; i++) {
    const piece = el('span', { class: 'confetti-piece' });
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(piece);
    setTimeout(() => piece.remove(), 2600);
  }
}

let speechEnabled = true;
export function setNarrationEnabled(on) {
  speechEnabled = on;
  if (!on) window.speechSynthesis && window.speechSynthesis.cancel();
}
export function isNarrationEnabled() {
  return speechEnabled;
}
export function speak(text) {
  if (!speechEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clearContainer(container) {
  container.innerHTML = '';
}

// Simple accessible drag-and-drop helper: works with mouse, touch, and keyboard.
// draggableEl gets tabindex + keyboard "pick up / move / drop" semantics via arrow keys + enter,
// in addition to native HTML5 drag events for pointer users.
export function makeDraggable(draggableEl, { onDropInto } = {}) {
  draggableEl.setAttribute('draggable', 'true');
  draggableEl.classList.add('draggable');
  draggableEl.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', draggableEl.dataset.dragId || '');
    e.dataTransfer.effectAllowed = 'move';
    draggableEl.classList.add('dragging');
  });
  draggableEl.addEventListener('dragend', () => draggableEl.classList.remove('dragging'));
}

export function makeDropzone(zoneEl, { accepts, onDrop } = {}) {
  zoneEl.classList.add('dropzone');
  zoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    zoneEl.classList.add('drag-over');
  });
  zoneEl.addEventListener('dragleave', () => zoneEl.classList.remove('drag-over'));
  zoneEl.addEventListener('drop', (e) => {
    e.preventDefault();
    zoneEl.classList.remove('drag-over');
    const dragId = e.dataTransfer.getData('text/plain');
    if (!accepts || accepts(dragId)) onDrop && onDrop(dragId, e);
  });
}

export function quizQuestion({ question, choices, correctIndex, onAnswer }) {
  const wrap = el('div', { class: 'quiz-question', role: 'group', 'aria-label': question });
  wrap.appendChild(el('p', { class: 'quiz-prompt' }, question));
  const list = el('div', { class: 'quiz-choices' });
  choices.forEach((choice, i) => {
    const btn = el('button', {
      class: 'quiz-choice',
      type: 'button',
      onclick: () => {
        const correct = i === correctIndex;
        [...list.children].forEach((c) => (c.disabled = true));
        btn.classList.add(correct ? 'correct' : 'incorrect');
        if (!correct) list.children[correctIndex].classList.add('correct');
        onAnswer && onAnswer(correct);
      },
    }, choice);
    list.appendChild(btn);
  });
  wrap.appendChild(list);
  return wrap;
}
