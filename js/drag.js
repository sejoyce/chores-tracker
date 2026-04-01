/**
 * drag.js
 * -------
 * Handles two kinds of drag-and-drop:
 *   1. Chore items  — dragged between frequency columns (vertical)
 *   2. Freq columns — dragged to reorder left-to-right (horizontal)
 *
 * Depends on: state.js (state, currentFreqs, saveState, renderAll)
 */

// ─── Shared State ─────────────────────────────────────────────────────────────

let dragSrc    = null; // chore drag  → { freqId, choreId }
let colDragSrc = null; // column drag → freqId string

// ─── Chore Drag Handlers ──────────────────────────────────────────────────────

function onDragStart(e) {
  e.stopPropagation();
  const el = e.currentTarget;
  dragSrc = { freqId: el.dataset.freq, choreId: el.dataset.chore };
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('dragtype', 'chore');
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
  document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  dragSrc = null;
}

// ─── Column Drag Handlers ─────────────────────────────────────────────────────

function onColDragStart(e) {
  colDragSrc = e.currentTarget.dataset.freqId;
  e.currentTarget.classList.add('col-dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('dragtype', 'column');
}

function onColDragEnd(e) {
  e.currentTarget.classList.remove('col-dragging');
  document.querySelectorAll('.col-drag-over-left, .col-drag-over-right')
    .forEach(el => el.classList.remove('col-drag-over-left', 'col-drag-over-right'));
  colDragSrc = null;
}

// ─── Drop Target Setup ────────────────────────────────────────────────────────

function setupDrop(col, freqId) {

  col.addEventListener('dragover', e => {
    const isColDrag = colDragSrc && !dragSrc;

    if (isColDrag) {
      if (colDragSrc === freqId) return;
      e.preventDefault();
      e.stopPropagation();

      const rect   = col.getBoundingClientRect();
      const isLeft = e.clientX < rect.left + rect.width / 2;
      document.querySelectorAll('.col-drag-over-left, .col-drag-over-right')
        .forEach(el => el.classList.remove('col-drag-over-left', 'col-drag-over-right'));
      col.classList.add(isLeft ? 'col-drag-over-left' : 'col-drag-over-right');
      return;
    }

    // Chore drag
    if (!dragSrc) return;
    e.preventDefault();
    col.classList.add('drag-over');

    const list     = document.getElementById('list-' + freqId);
    const existing = list.querySelector('.drag-placeholder');
    const afterEl  = getDragAfterEl(list, e.clientY);

    if (!existing) {
      const ph = document.createElement('div');
      ph.className = 'drag-placeholder';
      afterEl ? list.insertBefore(ph, afterEl) : list.appendChild(ph);
    } else {
      afterEl ? list.insertBefore(existing, afterEl) : list.appendChild(existing);
    }
  });

  col.addEventListener('dragleave', e => {
    if (!col.contains(e.relatedTarget)) {
      col.classList.remove('drag-over', 'col-drag-over-left', 'col-drag-over-right');
      col.querySelector('.drag-placeholder')?.remove();
    }
  });

  col.addEventListener('drop', e => {
    const isColDrag = colDragSrc && !dragSrc;

    // ── Column reorder ────────────────────────────────────────────────────────
    if (isColDrag) {
      e.preventDefault();
      e.stopPropagation();

      document.querySelectorAll('.col-drag-over-left, .col-drag-over-right')
        .forEach(el => el.classList.remove('col-drag-over-left', 'col-drag-over-right'));

      if (!colDragSrc || colDragSrc === freqId) return;

      const freqs   = currentFreqs();
      const fromIdx = freqs.findIndex(f => f.id === colDragSrc);
      const toIdx   = freqs.findIndex(f => f.id === freqId);
      if (fromIdx === -1 || toIdx === -1) return;

      const rect     = col.getBoundingClientRect();
      const dropLeft = e.clientX < rect.left + rect.width / 2;

      const [moved] = freqs.splice(fromIdx, 1);
      // After splice, recalculate target index
      const newToIdx = freqs.findIndex(f => f.id === freqId);
      freqs.splice(dropLeft ? newToIdx : newToIdx + 1, 0, moved);

      saveState();
      renderAll();
      return;
    }

    // ── Chore drop ────────────────────────────────────────────────────────────
    e.preventDefault();
    col.classList.remove('drag-over');
    col.querySelector('.drag-placeholder')?.remove();

    if (!dragSrc) return;

    const { freqId: srcFreq, choreId } = dragSrc;
    const freqs      = currentFreqs();
    const srcFreqObj = freqs.find(f => f.id === srcFreq);
    const tgtFreqObj = freqs.find(f => f.id === freqId);
    if (!srcFreqObj || !tgtFreqObj) return;

    const choreIdx = srcFreqObj.chores.findIndex(c => c.id === choreId);
    if (choreIdx === -1) return;
    const [chore] = srcFreqObj.chores.splice(choreIdx, 1);

    const list    = document.getElementById('list-' + freqId);
    const afterEl = getDragAfterEl(list, e.clientY);
    let insertIdx = tgtFreqObj.chores.length;

    if (afterEl?.dataset.chore) {
      const targetIdx = tgtFreqObj.chores.findIndex(c => c.id === afterEl.dataset.chore);
      if (targetIdx !== -1) insertIdx = targetIdx;
    }

    tgtFreqObj.chores.splice(insertIdx, 0, chore);
    saveState();
    renderAll();
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getDragAfterEl(container, y) {
  const draggables = [...container.querySelectorAll('.chore-item:not(.dragging)')];
  return draggables.reduce((closest, child) => {
    const box    = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    return offset < 0 && offset > closest.offset
      ? { offset, el: child }
      : closest;
  }, { offset: -Infinity }).el;
}
