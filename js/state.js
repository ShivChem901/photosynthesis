// Shared progress/state store, backed by localStorage.
// Every module/game/assessment reads and writes through this API only.

const KEY = 'photosynthesis-progress-v1';

const MODULE_IDS = ['module1', 'module2', 'module3', 'module4', 'module5', 'module6', 'module7'];
const GAME_IDS = ['balanceIt', 'atomTracker', 'plantBuilder', 'energyQuest', 'escapeGreenhouse'];

const BADGES = {
  module1: { id: 'module1', label: 'Big Idea Explorer', icon: '🌱' },
  module2: { id: 'module2', label: 'Model Builder', icon: '🧩' },
  module3: { id: 'module3', label: 'Equation Balancer', icon: '⚖️' },
  module4: { id: 'module4', label: 'Atom Tracker', icon: '🔬' },
  module5: { id: 'module5', label: 'Energy Explorer', icon: '⚡' },
  module6: { id: 'module6', label: 'Model Scientist', icon: '🧪' },
  module7: { id: 'module7', label: 'Investigator', icon: '🔎' },
  streak3: { id: 'streak3', label: '3-Day Streak', icon: '🔥' },
  finalPass: { id: 'finalPass', label: 'Photosynthesis Master', icon: '🏆' },
  balanceItGold: { id: 'balanceItGold', label: 'Balance It! Champion', icon: '🥇' },
};

function getDefaultState() {
  const modules = {};
  MODULE_IDS.forEach((id) => { modules[id] = { completed: false, score: null, visited: false }; });
  const games = {};
  GAME_IDS.forEach((id) => { games[id] = { highScore: 0, completed: false, attempts: 0 }; });
  const assessments = {};
  MODULE_IDS.forEach((id) => { assessments[id] = { score: null, attempts: 0 }; });
  assessments.final = { score: null, passed: false, date: null, attempts: 0 };

  return {
    version: 1,
    studentName: '',
    darkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
    modules,
    games,
    assessments,
    badges: [],
    streak: { lastDate: null, count: 0 },
    createdAt: new Date().toISOString(),
    timeOnTaskSeconds: 0,
    misconceptions: {},
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    // shallow-merge with defaults so new fields introduced later don't break old saves
    const defaults = getDefaultState();
    return {
      ...defaults,
      ...parsed,
      modules: { ...defaults.modules, ...(parsed.modules || {}) },
      games: { ...defaults.games, ...(parsed.games || {}) },
      assessments: { ...defaults.assessments, ...(parsed.assessments || {}) },
      streak: { ...defaults.streak, ...(parsed.streak || {}) },
    };
  } catch (e) {
    console.warn('Could not load saved progress, starting fresh.', e);
    return getDefaultState();
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent('state:changed', { detail: state }));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function bumpStreak() {
  const today = todayStr();
  if (state.streak.lastDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.streak.count = state.streak.lastDate === yesterday ? state.streak.count + 1 : 1;
  state.streak.lastDate = today;
  if (state.streak.count >= 3) awardBadge('streak3');
}

export function getState() {
  return state;
}

export function resetState() {
  state = getDefaultState();
  persist();
}

export function setStudentName(name) {
  state.studentName = name;
  persist();
}

export function toggleDarkMode(force) {
  state.darkMode = typeof force === 'boolean' ? force : !state.darkMode;
  persist();
  return state.darkMode;
}

export function visitModule(moduleId) {
  if (!state.modules[moduleId]) return;
  state.modules[moduleId].visited = true;
  bumpStreak();
  persist();
}

export function completeModule(moduleId, score = null) {
  if (!state.modules[moduleId]) return;
  state.modules[moduleId].completed = true;
  if (score !== null) state.modules[moduleId].score = score;
  bumpStreak();
  awardBadge(moduleId);
  persist();
}

export function recordGameScore(gameId, score) {
  const g = state.games[gameId];
  if (!g) return;
  g.attempts += 1;
  g.highScore = Math.max(g.highScore, score);
  g.completed = true;
  bumpStreak();
  persist();
}

export function recordAssessment(assessmentId, score, passed) {
  const a = state.assessments[assessmentId];
  if (!a) return;
  a.attempts += 1;
  a.score = score;
  if (assessmentId === 'final') {
    a.passed = !!passed;
    a.date = new Date().toISOString();
    if (a.passed) awardBadge('finalPass');
  }
  persist();
}

export function awardBadge(badgeId) {
  if (!BADGES[badgeId]) return;
  if (!state.badges.includes(badgeId)) {
    state.badges.push(badgeId);
    persist();
  }
}

export function getBadgeDefs() {
  return BADGES;
}

export function getModuleIds() {
  return MODULE_IDS.slice();
}

export function getGameIds() {
  return GAME_IDS.slice();
}

export function overallProgressPercent() {
  const total = MODULE_IDS.length;
  const done = MODULE_IDS.filter((id) => state.modules[id].completed).length;
  return Math.round((done / total) * 100);
}

export function addTimeOnTask(seconds) {
  state.timeOnTaskSeconds = (state.timeOnTaskSeconds || 0) + seconds;
  persist();
}

export function recordMisconception(topicLabel) {
  if (!topicLabel) return;
  state.misconceptions[topicLabel] = (state.misconceptions[topicLabel] || 0) + 1;
  persist();
}

export function getMisconceptions() {
  return { ...state.misconceptions };
}

export function exportReport() {
  return JSON.stringify(state, null, 2);
}

export function masteryLevel() {
  const pct = overallProgressPercent();
  const finalScore = state.assessments.final.score;
  if (finalScore !== null && finalScore >= 85) return 5;
  if (pct >= 100) return 4;
  if (pct >= 60) return 3;
  if (pct >= 30) return 2;
  return 1;
}
