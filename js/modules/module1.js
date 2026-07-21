// Module 1: The Big Idea
// An animated, clickable intro diagram (sunlight, CO2, water, glucose, oxygen)
// followed by a short mini-quiz. Grade 10 intro level only — no biochemistry.

import { completeModule, visitModule } from '../state.js';
import { el, speak, quizQuestion, showFeedback, confettiBurst, clearContainer } from '../utils.js';

const STYLE_ID = 'module1-styles';

const STYLES = `
.m1-scene {
  position: relative;
  min-height: 440px;
  overflow: hidden;
  margin: 1.25rem 0;
  background: linear-gradient(180deg, var(--sky-300) 0%, var(--sky-500) 45%, var(--green-100) 100%);
}
:root[data-theme='dark'] .m1-scene {
  background: linear-gradient(180deg, #0d1f2d 0%, #0f2b2b 45%, var(--green-900) 100%);
}

.m1-plant { position: absolute; bottom: 0; left: 0; right: 0; height: 220px; z-index: 1; }
.m1-roots {
  position: absolute;
  bottom: -8px;
  left: 42%;
  width: 0; height: 0;
  border-left: 44px solid transparent;
  border-right: 44px solid transparent;
  border-top: 24px solid var(--soil-700);
  opacity: 0.85;
}

.m1-object {
  position: absolute;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 84px;
  background: var(--bg-elevated);
  border: 3px solid var(--green-700);
  border-radius: 999px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.m1-object:hover, .m1-object:focus-visible { transform: translateY(-4px) scale(1.06); box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28); }
.m1-object.explored { border-style: solid; border-color: var(--green-500); }
.m1-object.explored .m1-object-check { display: inline-flex; }

.m1-object-icon { font-size: 1.6rem; line-height: 1; }
.m1-object-label { font-size: 0.72rem; font-weight: 700; white-space: nowrap; }
.m1-object-check {
  display: none;
  position: absolute;
  top: -8px;
  right: -8px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: var(--green-700);
  color: #fff;
  font-size: 0.62rem;
  align-items: center;
  justify-content: center;
}

@keyframes m1SunPulse {
  0%, 100% { filter: drop-shadow(0 0 0 rgba(255, 183, 3, 0)); transform: scale(1); }
  50% { filter: drop-shadow(0 0 16px rgba(255, 183, 3, 0.95)); transform: scale(1.18); }
}
.m1-anim-sunlight { animation: m1SunPulse 0.9s ease; }

@keyframes m1Drift {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(10px, -6px) rotate(-6deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
.m1-anim-co2 { animation: m1Drift 0.9s ease; }

@keyframes m1Drip {
  0% { transform: translateY(0); }
  30% { transform: translateY(7px); }
  60% { transform: translateY(-3px); }
  100% { transform: translateY(0); }
}
.m1-anim-water { animation: m1Drip 0.9s ease; }

@keyframes m1Glow {
  0%, 100% { box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2); }
  50% { box-shadow: 0 0 22px 6px rgba(255, 183, 3, 0.65); }
}
.m1-anim-glucose { animation: m1Glow 0.9s ease; }

@keyframes m1Rise {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-16px); opacity: 0.55; }
}
.m1-anim-oxygen { animation: m1Rise 0.9s ease; }

@keyframes m1FadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.m1-detail { border-left: 5px solid var(--green-500); animation: m1FadeIn 0.4s ease; }
.m1-funfact {
  background: var(--green-100);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-style: italic;
}
:root[data-theme='dark'] .m1-funfact { color: var(--text); }

.m1-progress-note { font-size: 0.9rem; color: var(--text-muted); }

.m1-equation {
  font-size: 1.4rem;
  font-weight: 700;
  text-align: center;
  color: var(--green-700);
  background: var(--green-100);
  border-radius: 8px;
  padding: 0.85rem;
  letter-spacing: 0.02em;
}
:root[data-theme='dark'] .m1-equation { color: var(--green-300); }

.m1-quiz-score { font-weight: 700; font-size: 1.05rem; }

@media (max-width: 640px) {
  .m1-scene { min-height: 520px; }
  .m1-object { min-width: 68px; padding: 0.4rem 0.5rem; }
  .m1-object-icon { font-size: 1.3rem; }
  .m1-object-label { font-size: 0.62rem; }
}

@media (prefers-reduced-motion: reduce) {
  .m1-anim-sunlight, .m1-anim-co2, .m1-anim-water, .m1-anim-glucose, .m1-anim-oxygen, .m1-detail {
    animation: none;
  }
}
`;

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  document.head.appendChild(el('style', { id: STYLE_ID }, STYLES));
}

const OBJECTS = [
  {
    id: 'sunlight',
    label: 'Sunlight',
    icon: '☀️',
    style: 'top:3%; right:7%;',
    animClass: 'm1-anim-sunlight',
    definition: 'Sunlight is radiant energy that travels from the sun to Earth.',
    role: 'Sunlight provides the energy a plant needs to convert carbon dioxide and water into glucose. Light energy becomes stored chemical energy.',
    funFact: 'Only a small slice of the sunlight hitting a leaf actually gets used — the rest is reflected or passes through, which is part of why leaves look green.',
  },
  {
    id: 'co2',
    label: 'Carbon Dioxide',
    icon: '💨',
    style: 'top:10%; left:6%;',
    animClass: 'm1-anim-co2',
    definition: 'Carbon dioxide (CO₂) is a gas in the air made of one carbon atom and two oxygen atoms.',
    role: 'CO₂ enters the leaf through tiny pores and supplies the carbon atoms that become part of glucose.',
    funFact: 'A single mature tree can absorb roughly 21 kilograms of CO₂ in a year — about what a car produces driving 42 miles.',
  },
  {
    id: 'water',
    label: 'Water',
    icon: '💧',
    style: 'bottom:6%; left:18%;',
    animClass: 'm1-anim-water',
    definition: 'Water (H₂O) is made of hydrogen and oxygen atoms and is absorbed from the soil.',
    role: 'Water travels up from the roots through the stem to the leaves, supplying hydrogen atoms used to build glucose.',
    funFact: 'A tall tree can lift hundreds of liters of water a day from its roots to its leaves without any kind of pump.',
  },
  {
    id: 'glucose',
    label: 'Glucose',
    icon: '🍬',
    style: 'top:38%; left:42%;',
    animClass: 'm1-anim-glucose',
    definition: 'Glucose (C₆H₁₂O₆) is a simple sugar molecule that stores chemical energy.',
    role: 'Glucose is the food the plant makes. It can be used right away for energy and growth, or converted and stored for later.',
    funFact: 'The glucose a plant makes is the same sugar that fuels nearly every other living thing on Earth, once it moves through the food chain — including you.',
  },
  {
    id: 'oxygen',
    label: 'Oxygen',
    icon: '🫧',
    style: 'top:6%; left:58%;',
    animClass: 'm1-anim-oxygen',
    definition: 'Oxygen (O₂) is a gas made of two oxygen atoms.',
    role: 'Oxygen is released from the leaf as a byproduct of the process and diffuses out into the air.',
    funFact: 'Almost all the oxygen you just breathed in was originally released by a plant or alga through photosynthesis.',
  },
];

const QUESTIONS = [
  {
    question: 'What is the source of energy that powers photosynthesis?',
    choices: ['Sunlight', 'Soil nutrients', 'Oxygen gas', 'Glucose'],
    correctIndex: 0,
  },
  {
    question: 'Which gas do leaves take in from the air to help build sugar?',
    choices: ['Nitrogen', 'Carbon dioxide', 'Oxygen', 'Helium'],
    correctIndex: 1,
  },
  {
    question: 'Where does a plant usually absorb the water used in photosynthesis?',
    choices: ['Leaves only', 'Flowers', 'Roots', 'Stem tips'],
    correctIndex: 2,
  },
  {
    question: 'What is the sugar molecule that plants produce and can use as stored energy?',
    choices: ['Oxygen', 'Carbon dioxide', 'Glucose', 'Water'],
    correctIndex: 2,
  },
  {
    question: 'What gas is released into the air as a byproduct of photosynthesis?',
    choices: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Water vapor'],
    correctIndex: 1,
  },
];

export function render(container) {
  injectStyles();
  visitModule('module1');

  const explored = new Set();

  // ---------- Intro ----------
  const intro = el('section', { class: 'card' }, [
    el('h1', {}, '🌞 Module 1: The Big Idea'),
    el('p', { class: 'essential-question' }, 'How do plants turn sunlight, air, and water into food?'),
    el('p', {}, 'Every leaf is a tiny factory. Below is a living scene with five clickable parts — sunlight, carbon dioxide, water, glucose, and oxygen. Click each one (or tab to it and press Enter or Space) to learn what it is, its role in photosynthesis, and a fun fact.'),
  ]);

  // ---------- Detail panel (updates on click) ----------
  const detailHost = el('div', { class: 'card m1-detail mt-2', 'aria-live': 'polite' }, [
    el('p', { class: 'text-muted' }, 'Click any glowing object above to reveal what it is, its role in photosynthesis, and a fun fact.'),
  ]);

  const progressNote = el('p', { class: 'm1-progress-note mt-1' }, 'Explored 0 of 5 objects.');

  function updateProgressNote() {
    const n = explored.size;
    progressNote.textContent = n >= 5
      ? 'Explored 5 of 5 objects. Great work — scroll down for the mini-quiz!'
      : `Explored ${n} of 5 objects.`;
  }

  function selectObject(obj, btn) {
    explored.add(obj.id);
    btn.classList.add('explored');
    btn.setAttribute('aria-label', `${obj.label} (explored). Click to review it again.`);

    btn.classList.remove(obj.animClass);
    // eslint-disable-next-line no-unused-expressions
    btn.offsetWidth; // restart animation
    btn.classList.add(obj.animClass);
    setTimeout(() => btn.classList.remove(obj.animClass), 900);

    clearContainer(detailHost);
    detailHost.append(
      el('h3', {}, `${obj.icon} ${obj.label}`),
      el('p', {}, [el('strong', {}, 'What it is: '), obj.definition]),
      el('p', {}, [el('strong', {}, 'Its role in photosynthesis: '), obj.role]),
      el('p', { class: 'm1-funfact' }, [el('strong', {}, 'Fun fact: '), obj.funFact])
    );

    updateProgressNote();
    speak(`${obj.label}. ${obj.definition} ${obj.role} Fun fact: ${obj.funFact}`);
  }

  const objectButtons = OBJECTS.map((obj) => {
    const btn = el('button', {
      type: 'button',
      class: 'm1-object',
      style: obj.style,
      'aria-label': `${obj.label}. Click to learn its role in photosynthesis.`,
      onclick: () => selectObject(obj, btn),
    }, [
      el('span', { class: 'm1-object-icon', 'aria-hidden': 'true' }, obj.icon),
      el('span', { class: 'm1-object-label' }, obj.label),
      el('span', { class: 'm1-object-check', 'aria-hidden': 'true' }, '✓'),
    ]);
    return btn;
  });

  const plant = el('div', { class: 'm1-plant', 'aria-hidden': 'true' }, [
    el('div', { class: 'plant-stem', style: 'left:47%;' }),
    el('div', { class: 'plant-leaf', style: 'left:35%; bottom:70px; animation-delay:0.2s;' }),
    el('div', { class: 'plant-leaf', style: 'left:51%; bottom:105px; animation-delay:0.5s; transform-origin:left;' }),
    el('div', { class: 'm1-roots' }),
  ]);

  const scene = el('div', {
    class: 'm1-scene card',
    role: 'group',
    'aria-label': 'Interactive photosynthesis diagram with five clickable parts: sunlight, carbon dioxide, water, glucose, and oxygen.',
  }, [plant, ...objectButtons]);

  // ---------- Equation / big idea recap ----------
  const equationCard = el('section', { class: 'card mt-3' }, [
    el('h2', { class: 'section-title' }, 'The Big Idea'),
    el('p', {}, 'Photosynthesis is the process plants use to capture light energy and store it as chemical energy in a sugar called glucose. Carbon dioxide and water are the raw ingredients that go in; glucose and oxygen are what come out.'),
    el('p', {
      class: 'm1-equation',
      'aria-label': 'Six carbon dioxide plus six water, using light energy, yields glucose plus six oxygen.',
    }, '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂'),
    el('p', { class: 'text-muted' }, 'Notice that every atom on the left shows up again on the right — matter is conserved, it just gets rearranged into new molecules.'),
  ]);

  // ---------- Mini-quiz ----------
  const quizSection = el('section', { class: 'card mt-3' }, [
    el('h2', { class: 'section-title' }, 'Check Your Understanding'),
    el('p', { class: 'text-muted' }, 'Answer these five quick questions about the parts you just explored.'),
  ]);
  const quizHost = el('div', { class: 'm1-quiz-host mt-2' });
  quizSection.appendChild(quizHost);

  function finishQuiz(answers, resultBox) {
    const correctCount = answers.filter(Boolean).length;
    const score = Math.round((correctCount / answers.length) * 100);
    completeModule('module1', score);

    const message = score >= 80
      ? 'Excellent work! You really understand the big idea of photosynthesis.'
      : score >= 60
        ? 'Good job! Review the parts you missed, then try again anytime.'
        : 'Nice try! Revisit the diagram above, then retake the quiz to improve your score.';

    clearContainer(resultBox);
    resultBox.append(
      el('p', { class: 'm1-quiz-score' }, `You scored ${score}% (${correctCount} of ${answers.length} correct).`),
      el('p', {}, message),
      el('button', {
        class: 'btn btn-primary mt-1',
        type: 'button',
        onclick: () => renderQuiz(),
      }, '🔄 Retake Quiz')
    );

    showFeedback(
      score >= 80 ? `Great job on Module 1 — ${score}%!` : `Module 1 complete — ${score}%. Keep practicing!`,
      score >= 60 ? 'success' : 'info'
    );
    if (score >= 80) confettiBurst();
    speak(`${message} You scored ${score} percent.`);
  }

  function renderQuiz() {
    clearContainer(quizHost);
    const answers = new Array(QUESTIONS.length).fill(null);
    const resultBox = el('div', { class: 'm1-quiz-result mt-2', 'aria-live': 'polite' });

    QUESTIONS.forEach((q, i) => {
      const qEl = quizQuestion({
        question: `${i + 1}. ${q.question}`,
        choices: q.choices,
        correctIndex: q.correctIndex,
        onAnswer: (correct) => {
          answers[i] = correct;
          if (answers.every((a) => a !== null)) {
            finishQuiz(answers, resultBox);
          }
        },
      });
      quizHost.appendChild(qEl);
    });

    quizHost.appendChild(resultBox);
  }

  container.append(intro, scene, progressNote, detailHost, equationCard, quizSection);
  renderQuiz();

  speak('Module 1, The Big Idea. Click each glowing object in the scene to explore how plants make their own food, then try the mini quiz.');
}
