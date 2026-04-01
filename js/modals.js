/**
 * modals.js
 * ---------
 * Manages all modal dialogs (setup, add-frequency, rename-tab)
 * and the tab switching UI.
 * Depends on: state.js, render.js
 */

let editingFreqId = null;
let renamingTab   = null;
let selectedColor = COLORS[0];

// ─── Setup Modal ──────────────────────────────────────────────────────────────

function checkSetup() {
  const isDefault =
    state.names.p1 === 'Person 1' &&
    state.names.p2 === 'Person 2';

  if (isDefault) {
    document.getElementById('setup-modal').classList.add('open');
  }
  updateTabLabels();
}

function saveSetup() {
  const p1 = document.getElementById('setup-p1').value.trim() || 'Person 1';
  const p2 = document.getElementById('setup-p2').value.trim() || 'Person 2';
  state.names = { p1, p2 };
  saveState();
  document.getElementById('setup-modal').classList.remove('open');
  updateTabLabels();
}

// ─── Tab UI ───────────────────────────────────────────────────────────────────

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  renderAll();
}

function updateTabLabels() {
  document.getElementById('tab-p1-label').textContent = state.names.p1;
  document.getElementById('tab-p2-label').textContent = state.names.p2;
}

// ─── Rename Tab Modal ─────────────────────────────────────────────────────────

function openRename(tabId, e) {
  e.stopPropagation();
  renamingTab = tabId;
  document.getElementById('rename-input').value = state.names[tabId];
  document.getElementById('rename-modal').classList.add('open');
  setTimeout(() => document.getElementById('rename-input').focus(), 50);
}

function closeRename() {
  document.getElementById('rename-modal').classList.remove('open');
  renamingTab = null;
}

function saveRename() {
  const val = document.getElementById('rename-input').value.trim();
  if (val && renamingTab) {
    state.names[renamingTab] = val;
    saveState();
    updateTabLabels();
  }
  closeRename();
}

// ─── Add Frequency Modal ──────────────────────────────────────────────────────

function openAddFreq() {
  editingFreqId = null;
  document.getElementById('modal-title').textContent = 'Add Frequency';
  document.getElementById('freq-name').value  = '';
  document.getElementById('freq-days').value  = '';
  document.getElementById('freq-unit').value  = '1';
  selectedColor = COLORS[0];
  buildSwatches();
  document.getElementById('modal').classList.add('open');
  setTimeout(() => document.getElementById('freq-name').focus(), 50);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function saveFrequency() {
  const name = document.getElementById('freq-name').value.trim();
  const days = parseInt(document.getElementById('freq-days').value, 10);
  const unit = parseInt(document.getElementById('freq-unit').value, 10);

  if (!name || isNaN(days) || days < 1) {
    alert('Please enter a name and a valid number of days.');
    return;
  }

  addFrequency({ name, intervalDays: days * unit, color: selectedColor });
  closeModal();
}

// ─── Color Swatches ───────────────────────────────────────────────────────────

function buildSwatches() {
  const container = document.getElementById('color-swatches');
  container.innerHTML = '';

  COLORS.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (color === selectedColor ? ' selected' : '');
    swatch.style.background = color;
    swatch.onclick = () => {
      selectedColor = color;
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    };
    container.appendChild(swatch);
  });
}

// ─── Global Event Listeners ───────────────────────────────────────────────────

// Close modals when clicking the backdrop
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
document.getElementById('rename-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('rename-modal')) closeRename();
});
document.getElementById('setup-modal').addEventListener('click', e => {
  // Prevent closing setup modal by clicking backdrop — names are required
});

// Keyboard shortcuts inside modals
document.getElementById('rename-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveRename();
  if (e.key === 'Escape') closeRename();
});
document.getElementById('freq-name').addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
document.getElementById('setup-p2').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveSetup();
});
