// Certificate of Mastery — unlocked once the Final Challenge is passed.
// Injects its own scoped <style> (rather than editing css/styles.css) so it
// can add print-only rules that hide the site chrome for a clean printout.

import { getState, setStudentName } from './state.js';
import { el, clearContainer } from './utils.js';

function ensureCertificateStyles() {
  if (document.getElementById('certificate-styles')) return;
  const style = document.createElement('style');
  style.id = 'certificate-styles';
  style.textContent = `
    .certificate-border {
      position: relative;
      max-width: 720px;
      margin: 0 auto;
      padding: 3rem 2.25rem;
      border-radius: 18px;
      border: 6px double var(--sun-500);
      background: linear-gradient(160deg, var(--bg-elevated), var(--green-100));
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .certificate-border::before {
      content: '';
      position: absolute;
      inset: 10px;
      border: 1px solid var(--green-500);
      border-radius: 12px;
      pointer-events: none;
      opacity: 0.6;
    }
    .certificate-eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--green-700);
      margin: 0;
    }
    :root[data-theme='dark'] .certificate-eyebrow { color: var(--green-300); }
    .certificate-title {
      font-size: 2.1rem;
      margin: 0.4rem 0 0.75rem;
      color: var(--green-900);
      font-family: Georgia, 'Times New Roman', serif;
    }
    :root[data-theme='dark'] .certificate-title { color: var(--green-100); }
    .certificate-sub {
      margin: 0;
      color: var(--text-muted);
      font-style: italic;
    }
    .certificate-name {
      font-size: 2rem;
      font-weight: 700;
      margin: 0.6rem 0;
      color: var(--green-700);
      font-family: Georgia, 'Times New Roman', serif;
      border-bottom: 3px solid var(--sun-500);
      display: inline-block;
      padding: 0 0.5rem 0.3rem;
    }
    :root[data-theme='dark'] .certificate-name { color: var(--green-300); }
    .certificate-body {
      max-width: 520px;
      margin: 0.75rem auto 1.5rem;
      line-height: 1.5;
    }
    .certificate-meta {
      margin-bottom: 1.5rem;
    }
    .certificate-meta-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 140px;
    }
    .certificate-meta-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
    }
    .certificate-meta-value {
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--green-700);
    }
    :root[data-theme='dark'] .certificate-meta-value { color: var(--green-300); }
    .certificate-seal {
      font-size: 2.6rem;
      margin: 0.25rem 0 1rem;
    }
    .certificate-footer {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 0;
    }
    .certificate-edit-link {
      background: none;
      border: none;
      color: var(--text-muted);
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.85rem;
      padding: 0.25rem;
    }

    @media print {
      .site-header, .site-footer, #feedback-toast, .no-print { display: none !important; }
      html, body { background: #ffffff !important; }
      main { max-width: none !important; padding: 0 !important; margin: 0 !important; min-height: 0 !important; }
      .card { box-shadow: none !important; border: none !important; padding: 0 !important; }
      .certificate-border {
        box-shadow: none !important;
        border-color: #b8860b !important;
        background: #ffffff !important;
        page-break-inside: avoid;
      }
      .certificate-title, .certificate-name, .certificate-meta-value { color: #1b4332 !important; }
    }
  `;
  document.head.appendChild(style);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return iso;
  }
}

function lockedView() {
  return el('div', { class: 'card mt-2 center' }, [
    el('div', { style: 'font-size:2.5rem;', 'aria-hidden': 'true' }, '🔒'),
    el('h1', { class: 'section-title' }, 'Certificate Locked'),
    el('p', {}, 'Complete the Final Challenge with 85%+ to unlock your certificate.'),
    el('a', { class: 'btn btn-primary mt-2', href: '#/final-assessment' }, '🏆 Go to the Final Challenge'),
  ]);
}

function nameEntryView(container) {
  const card = el('div', { class: 'card mt-2 center' });
  card.appendChild(el('h1', { class: 'section-title' }, '🎉 You unlocked your certificate!'));
  card.appendChild(el('p', {}, 'Enter your name exactly as you would like it to appear on your certificate.'));

  const labelId = 'student-name-label';
  const label = el('label', { for: 'student-name-input', id: labelId }, 'Your full name');
  const input = el('input', {
    type: 'text',
    id: 'student-name-input',
    'aria-labelledby': labelId,
    placeholder: 'e.g., Jordan Lee',
    maxlength: '60',
  });

  let saved = false;
  function commit() {
    const val = input.value.trim();
    if (!val || saved) return;
    saved = true;
    setStudentName(val);
    render(container);
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
  });
  const saveBtn = el('button', {
    class: 'btn btn-primary',
    type: 'button',
    // preventDefault on mousedown stops the input from blurring first,
    // so this and the blur handler above can never both fire for one click.
    onmousedown: (e) => { e.preventDefault(); commit(); },
  }, 'Save Name & View Certificate');

  const formRow = el('div', { class: 'flex flex-wrap gap-1 mt-2', style: 'justify-content:center; align-items:center;' }, [
    label, input, saveBtn,
  ]);
  card.appendChild(formRow);
  return card;
}

function certificateView(state, container) {
  const wrap = el('div', { class: 'card mt-2 center', id: 'certificate-wrap' });

  const cert = el('div', { class: 'certificate-border' }, [
    el('p', { class: 'certificate-eyebrow' }, '🌿 Photosynthesis Lab'),
    el('h1', { class: 'certificate-title' }, 'Certificate of Mastery'),
    el('p', { class: 'certificate-sub' }, 'This certifies that'),
    el('p', { class: 'certificate-name' }, state.studentName),
    el('p', { class: 'certificate-body' },
      'has demonstrated mastery of how photosynthesis transforms light energy into stored chemical energy — and how matter is conserved throughout the process.'),
    el('div', { class: 'certificate-meta flex flex-wrap gap-2', style: 'justify-content:center;' }, [
      el('div', { class: 'certificate-meta-item' }, [
        el('span', { class: 'certificate-meta-label' }, 'Final Score'),
        el('span', { class: 'certificate-meta-value' }, `${state.assessments.final.score}%`),
      ]),
      el('div', { class: 'certificate-meta-item' }, [
        el('span', { class: 'certificate-meta-label' }, 'Date'),
        el('span', { class: 'certificate-meta-value' }, formatDate(state.assessments.final.date)),
      ]),
    ]),
    el('div', { class: 'certificate-seal', 'aria-hidden': 'true' }, '🏆'),
    el('p', { class: 'certificate-footer' },
      'NYS Regents Biology & Chemistry · NGSS: Use a model to illustrate how photosynthesis transforms light energy into stored chemical energy.'),
  ]);
  wrap.appendChild(cert);

  const actions = el('div', { class: 'flex gap-1 mt-3 no-print', style: 'justify-content:center; flex-wrap:wrap;' }, [
    el('button', { class: 'btn btn-sun', type: 'button', onclick: () => window.print() }, '🖨️ Print / Save as PDF'),
    el('button', {
      class: 'certificate-edit-link',
      type: 'button',
      'aria-label': 'Edit your name',
      onclick: () => { setStudentName(''); render(container); },
    }, 'Not you? Edit name'),
  ]);
  wrap.appendChild(actions);
  return wrap;
}

export function render(container) {
  ensureCertificateStyles();
  clearContainer(container);
  const state = getState();

  if (!state.assessments.final.passed) {
    container.appendChild(lockedView());
    return;
  }

  if (!state.studentName) {
    container.appendChild(nameEntryView(container));
    return;
  }

  container.appendChild(certificateView(state, container));
}
