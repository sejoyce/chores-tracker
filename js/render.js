/**
 * render.js
 * ---------
 * Builds and updates the DOM from app state.
 * Depends on: state.js, drag.js
 */

// ─── Main Render ──────────────────────────────────────────────────────────────

function renderAll() {
  autoReset();
  // Always sync tab labels from current state — prevents stale localStorage
  // names from persisting after Firebase loads the real values.
  if (typeof updateTabLabels === 'function') updateTabLabels();

  const container = document.getElementById('columns');
  container.innerHTML = '';

  if (activeTab === 'todo') {
    renderTodo(container);
    return;
  }

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

  // Wire up chore item drag listeners
  container.querySelectorAll('.chore-item').forEach(el => {
    el.addEventListener('dragstart', onDragStart);
    el.addEventListener('dragend',   onDragEnd);
  });

  // Wire up column drag via the handle
  container.querySelectorAll('.col-drag-handle').forEach(handle => {
    const col = handle.closest('.column');
    handle.addEventListener('mousedown', () => { col.draggable = true; });
    col.addEventListener('dragend', () => { col.draggable = false; });
    col.addEventListener('dragstart', onColDragStart);
    col.addEventListener('dragend',   onColDragEnd);
  });
}

// ─── To Do Tab ────────────────────────────────────────────────────────────────

function renderTodo(container) {
  // Collect all unchecked chores across all tabs and frequency columns,
  // tagging each with its owner and days-until-reset for sorting.
  const items = [];

  const tabLabels = {
    shared: '🏠 Shared',
    p1:     (state.names.p1emoji || '👤') + ' ' + (state.names.p1 || 'Person 1'),
    p2:     (state.names.p2emoji || '👤') + ' ' + (state.names.p2 || 'Person 2'),
  };

  Object.entries(state.tabs).forEach(([tabId, freqs]) => {
    freqs.forEach(f => {
      const days = daysUntilReset(f);
      f.chores.forEach(c => {
        if (!c.done) {
          items.push({ tabId, freqId: f.id, freqName: f.name, freqColor: f.color, chore: c, days });
        }
      });
    });
  });

  // Sort: overdue first (days <= 0), then soonest reset, then alphabetical
  items.sort((a, b) => {
    if (a.days !== b.days) return a.days - b.days;
    return a.chore.text.localeCompare(b.chore.text);
  });

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'todo-empty';
    empty.innerHTML = '<span>🎉</span><p>All caught up!</p>';
    container.appendChild(empty);
    return;
  }

  // Group by days-until-reset so urgency is visually clear
  const groups = [];
  let lastKey = null;
  items.forEach(item => {
    const key = item.days <= 0 ? 'overdue'
              : item.days === 1 ? 'due-tomorrow'
              : `due-in-${item.days}`;
    if (key !== lastKey) {
      groups.push({ key, days: item.days, items: [] });
      lastKey = key;
    }
    groups[groups.length - 1].items.push(item);
  });

  groups.forEach(group => {
    const section = document.createElement('div');
    section.className = 'todo-section';

    const label = group.days <= 0  ? 'Overdue'
                : group.days === 1 ? 'Due tomorrow'
                : `Due in ${group.days} day${group.days !== 1 ? 's' : ''}`;

    const isOverdue = group.days <= 0;
    section.innerHTML = `<div class="todo-group-label ${isOverdue ? 'overdue' : ''}">${label}</div>`;

    group.items.forEach(({ tabId, freqId, freqName, freqColor, chore }) => {
      const row = document.createElement('div');
      row.className = 'todo-row';
      row.innerHTML = `
        <div class="chore-check ${chore.done ? 'checked' : ''}"
             onclick="toggleChoreGlobal('${tabId}','${freqId}','${chore.id}')"></div>
        <div class="todo-row-text">
          <span class="todo-chore-name">${escHtml(chore.text)}</span>
          <span class="todo-meta">
            <span class="todo-dot" style="background:${freqColor}"></span>
            ${escHtml(freqName)} &middot; ${escHtml(tabLabels[tabId])}
          </span>
        </div>
      `;
      section.appendChild(row);
    });

    container.appendChild(section);
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
  // draggable is toggled on/off by the handle mousedown to avoid
  // interfering with clicking, scrolling, and chore drags.
  col.draggable = false;

  col.innerHTML = `
    <div class="col-header">
      <div class="col-header-left">
        <div class="col-dot" style="background:${f.color}"></div>
        <div class="col-title">${escHtml(f.name)}</div>
      </div>
      <div class="col-header-right">
        <span class="col-drag-handle" title="Drag to reorder">⠿</span>
        <button class="btn-ghost" onclick="deleteFrequency('${f.id}')" title="Delete category">✕</button>
      </div>
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
