/**
 * render.js
 * ---------
 * Builds and updates the DOM from app state.
 * Depends on: state.js, drag.js
 */

// ─── Main Render ──────────────────────────────────────────────────────────────

function renderAll() {
  autoReset();

  const container = document.getElementById('columns');
  container.innerHTML = '';

  currentFreqs().forEach(f => {
    const col = buildColumn(f);
    setupDrop(col, f.id);
    container.appendChild(col);
  });

  // "Add Frequency" card at the end of the row
  const addBtn = document.createElement('button');
  addBtn.className  = 'add-col-btn';
  addBtn.innerHTML  = '<span>＋</span>New Frequency';
  addBtn.onclick    = openAddFreq;
  container.appendChild(addBtn);

  // Wire up drag listeners on every chore item
  container.querySelectorAll('.chore-item').forEach(el => {
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend',   onDragEnd);
  });
}

// ─── Column Builder ───────────────────────────────────────────────────────────

function buildColumn(f) {
  const done  = f.chores.filter(c => c.done).length;
  const total = f.chores.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const days       = daysUntilReset(f);
  const overdue    = days <= 0;
  const resetLabel = overdue
    ? 'Overdue — click to reset'
    : days === 1 ? 'Resets tomorrow'
    : `Resets in ${days}d`;

  const col = document.createElement('div');
  col.className      = 'column';
  col.dataset.freqId = f.id;

  col.innerHTML = `
    <div class="col-header">
      <div class="col-header-left">
        <div class="col-dot" style="background:${f.color}"></div>
        <div class="col-title">${escHtml(f.name)}</div>
      </div>
      <button class="btn-ghost" onclick="deleteFrequency('${f.id}')" title="Delete category">✕</button>
    </div>

    <div class="col-meta">
      <span class="reset-badge ${overdue ? 'overdue' : ''}" onclick="manualReset('${f.id}')">
        ↺ ${resetLabel}
      </span>
    </div>

    <div class="chores-list" id="list-${f.id}">
      ${f.chores.map(c => choreHTML(f.id, c)).join('')}
    </div>

    <div class="add-chore-row">
      <input
        class="add-chore-input"
        id="inp-${f.id}"
        placeholder="Add a chore…"
        onkeydown="if(event.key==='Enter') addChore('${f.id}')"
      >
      <button class="btn-add-chore" onclick="addChore('${f.id}')">+</button>
    </div>

    <div class="col-footer">
      <span class="progress-text">${done}/${total} done</span>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
    </div>
  `;

  return col;
}

// ─── Chore Item HTML ──────────────────────────────────────────────────────────

function choreHTML(freqId, c) {
  return `
    <div
      class="chore-item"
      draggable="true"
      data-freq="${freqId}"
      data-chore="${c.id}"
      id="chore-${c.id}"
    >
      <div
        class="chore-check ${c.done ? 'checked' : ''}"
        onclick="toggleChore('${freqId}', '${c.id}')"
      ></div>
      <span class="chore-label ${c.done ? 'done' : ''}">${escHtml(c.text)}</span>
      <button class="chore-delete btn-ghost" onclick="deleteChore('${freqId}', '${c.id}')">✕</button>
    </div>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}
