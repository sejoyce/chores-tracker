/**
 * drag.js
 * -------
 * Handles HTML5 drag-and-drop for chore items between frequency columns.
 * Depends on: state.js (state, currentFreqs, saveState, renderAll)
 */

let dragSrc = null; // { freqId, choreId }

// ─── Event Handlers ───────────────────────────────────────────────────────────

function onDragStart(e) {
  const el = e.currentTarget;
  dragSrc = { freqId: el.dataset.freq, choreId: el.dataset.chore };
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.drag-placeholder').forEach(p => p.remove());
  document.querySelectorAll('.column').forEach(c => c.classList.remove('drag-over'));
  dragSrc = null;
}

// ─── Drop Target Setup ────────────────────────────────────────────────────────

function setupDrop(col, freqId) {
  col.addEventListener('dragover', e => {
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
      col.classList.remove('drag-over');
      col.querySelector('.drag-placeholder')?.remove();
    }
  });

  col.addEventListener('drop', e => {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the chore element that the dragged item should be inserted before,
 * based on the cursor's vertical position.
 */
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
