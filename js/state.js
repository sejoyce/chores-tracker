/**
 * state.js
 * --------
 * Single source of truth for app data.
 * Handles localStorage persistence and Firebase sync (via hooks set by index.html).
 */

const COLORS = [
  '#8a9e7e', '#c2714a', '#c9a09a', '#c8a84b',
  '#6b9ec2', '#9e8ac2', '#7eab9e', '#b07878'
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}`;
}

// ─── Default Data ────────────────────────────────────────────────────────────

function makeDefaultFreqs(prefix) {
  if (prefix === 'shared') {
    return [
      {
        id: `${prefix}_quarterly`, name: 'Quarterly', color: '#c2714a', intervalDays: 91,
        lastReset: todayStr(), chores: [
          { id: `${prefix}c1`, text: 'Refresh litter boxes',      done: false },
          { id: `${prefix}c2`, text: 'Wash Leia linens',           done: false },
          { id: `${prefix}c3`, text: 'Clean car',                  done: false },
          { id: `${prefix}c4`, text: 'Clean dishwasher',           done: false },
          { id: `${prefix}c5`, text: 'Clean lamps & baseboards',   done: false },
          { id: `${prefix}c6`, text: 'Wash duvet cover',           done: false },
        ],
      },
      {
        id: `${prefix}_monthly`, name: 'Monthly', color: '#8a9e7e', intervalDays: 30,
        lastReset: todayStr(), chores: [
          { id: `${prefix}c7`,  text: 'Wash sheets',               done: false },
          { id: `${prefix}c8`,  text: 'Clean out & wipe fridge',   done: false },
          { id: `${prefix}c9`,  text: 'Vacuum',                    done: false },
          { id: `${prefix}c10`, text: 'Clean stove + microwave',   done: false },
        ],
      },
      {
        id: `${prefix}_weekly`, name: 'Weekly', color: '#c9a09a', intervalDays: 7,
        lastReset: todayStr(), chores: [
          { id: `${prefix}c11`, text: 'Sweep',                        done: false },
          { id: `${prefix}c12`, text: 'Trash & recycling',            done: false },
          { id: `${prefix}c13`, text: 'Meal plan & prep',             done: false },
          { id: `${prefix}c14`, text: 'Grocery shopping',             done: false },
          { id: `${prefix}c15`, text: 'Wipe counters, sinks, mirror', done: false },
        ],
      },
    ];
  }

  if (prefix === 'p1') {
    return [
      {
        id: `${prefix}_monthly`, name: 'Monthly', color: '#8a9e7e', intervalDays: 30,
        lastReset: todayStr(), chores: [
          { id: `${prefix}c1`, text: 'Wash bras',     done: false },
          { id: `${prefix}c2`, text: 'Clean toilet',  done: false },
          { id: `${prefix}c3`, text: 'Clean shower',  done: false },
        ],
      },
      {
        id: `${prefix}_weekly`, name: 'Weekly', color: '#c9a09a', intervalDays: 7,
        lastReset: todayStr(), chores: [
          { id: `${prefix}c4`, text: 'Feed sourdough starter', done: false },
        ],
      },
    ];
  }

  // p2 — starts empty
  return [
    {
      id: `${prefix}_monthly`, name: 'Monthly', color: '#c8a84b', intervalDays: 30,
      lastReset: todayStr(), chores: [],
    },
    {
      id: `${prefix}_weekly`, name: 'Weekly', color: '#6b9ec2', intervalDays: 7,
      lastReset: todayStr(), chores: [],
    },
  ];
}

const DEFAULT_STATE = {
  names: { p1: 'Person 1', p2: 'Person 2' },
  tabs: {
    shared: makeDefaultFreqs('shared'),
    p1:     makeDefaultFreqs('p1'),
    p2:     makeDefaultFreqs('p2'),
  },
};

// ─── Load / Save ─────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem('chore-tracker-v3');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load state from localStorage:', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem('chore-tracker-v3', JSON.stringify(state));

  // Firebase sync — hook is injected by the <script type="module"> in index.html
  if (typeof window._firebaseSave === 'function') {
    window._lastSavedState = state;
    window._firebaseSave(state).catch(err =>
      console.warn('Firebase save failed:', err)
    );
  }
}

/**
 * Called by the Firebase onSnapshot listener when a partner makes a change.
 * Exposed on window so the module script in index.html can reach it.
 */
function loadRemoteState(remote) {
  state = remote;
  localStorage.setItem('chore-tracker-v3', JSON.stringify(state));
  renderAll();          // defined in render.js
  updateTabLabels();    // defined in modals.js
}
window.loadRemoteState = loadRemoteState;

// ─── Auto-reset ───────────────────────────────────────────────────────────────

function autoReset() {
  const today = new Date();
  Object.values(state.tabs).forEach(freqs => {
    freqs.forEach(f => {
      const last = new Date(f.lastReset);
      const diffDays = (today - last) / (1000 * 60 * 60 * 24);
      if (diffDays >= f.intervalDays) {
        f.chores.forEach(c => (c.done = false));
        f.lastReset = todayStr();
      }
    });
  });
  saveState();
}

function daysUntilReset(f) {
  const last = new Date(f.lastReset);
  const next = new Date(last.getTime() + f.intervalDays * 86400000);
  return Math.ceil((next - new Date()) / 86400000);
}

// ─── Convenience ──────────────────────────────────────────────────────────────

function currentFreqs() {
  return state.tabs[activeTab];
}

// ─── Chore Mutations ──────────────────────────────────────────────────────────

function toggleChore(freqId, choreId) {
  const f = currentFreqs().find(f => f.id === freqId);
  const c = f && f.chores.find(c => c.id === choreId);
  if (c) { c.done = !c.done; saveState(); renderAll(); }
}

function deleteChore(freqId, choreId) {
  const f = currentFreqs().find(f => f.id === freqId);
  if (f) {
    f.chores = f.chores.filter(c => c.id !== choreId);
    saveState();
    renderAll();
  }
}

function addChore(freqId) {
  const inp = document.getElementById('inp-' + freqId);
  const text = inp.value.trim();
  if (!text) return;
  const f = currentFreqs().find(f => f.id === freqId);
  if (f) {
    f.chores.push({ id: makeId('c'), text, done: false });
    saveState();
    renderAll();
    setTimeout(() => {
      const el = document.getElementById('inp-' + freqId);
      if (el) el.focus();
    }, 0);
  }
}

// ─── Frequency Mutations ──────────────────────────────────────────────────────

function manualReset(freqId) {
  const f = currentFreqs().find(f => f.id === freqId);
  if (!f) return;
  f.chores.forEach(c => (c.done = false));
  f.lastReset = todayStr();
  saveState();
  renderAll();
}

function resetAll() {
  Object.values(state.tabs).forEach(freqs => {
    freqs.forEach(f => {
      if (daysUntilReset(f) <= 0) {
        f.chores.forEach(c => (c.done = false));
        f.lastReset = todayStr();
      }
    });
  });
  saveState();
  renderAll();
}

function deleteFrequency(freqId) {
  if (!confirm('Delete this category and all its chores?')) return;
  state.tabs[activeTab] = state.tabs[activeTab].filter(f => f.id !== freqId);
  saveState();
  renderAll();
}

function addFrequency({ name, intervalDays, color }) {
  state.tabs[activeTab].push({
    id: makeId(activeTab + '_freq'),
    name,
    color,
    intervalDays,
    lastReset: todayStr(),
    chores: [],
  });
  saveState();
  renderAll();
}

// ─── Initialise ───────────────────────────────────────────────────────────────

let state     = loadState();
let activeTab = 'shared';
