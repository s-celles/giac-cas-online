'use strict';

// SECTION 9 — GLOBAL ACTIONS
// ─────────────────────────────────────────────────────────────

function updateEmptyState() {
  var el = document.getElementById('empty-notebook');
  if (el) el.style.display = cells.length === 0 ? '' : 'none';
  var ft = document.getElementById('notebook-footer');
  if (ft) ft.style.display = cells.length > 0 ? '' : 'none';
}

function runAll() {
  if (reactiveMode) {
    runAllReactive();
  } else {
    cells.forEach(function(c) { runSingleCell(c.id); });
  }
}
function clearAllOutputs() { cells.forEach(c => { const o = document.getElementById(c.id+'-output'); if(o) o.innerHTML=''; }); }
function deleteCell(id) {
  // Unregister from reactive graph before removing
  if (reactiveMode && observableModule) {
    var downstreamIds = getDownstreamCells(id);
    unregisterCell(id);
    // Mark downstream cells as having broken dependency
    downstreamIds.forEach(function(did) {
      var dout = document.getElementById(did + '-output');
      if (dout) {
        var warn = document.createElement('div');
        warn.className = 'dep-warning broken';
        warn.textContent = t('brokenDependency') + ' (' + id + ')';
        dout.prepend(warn);
      }
      var del = document.getElementById(did);
      if (del) del.classList.add('cell-stale');
    });
  }
  document.getElementById(id)?.remove();
  cells = cells.filter(c => c.id !== id);
  updateEmptyState();
}
// ─────────────────────────────────────────────────────────────
// CELL CONTROL TOGGLES (hide, disable, lock, report view)
// ─────────────────────────────────────────────────────────────

function toggleCellHidden(id) {
  var cell = document.getElementById(id);
  if (!cell) return;
  var isHidden = cell.dataset.hidden === 'true';
  cell.dataset.hidden = isHidden ? 'false' : 'true';
  cell.classList.toggle('cell-hidden', !isHidden);
  // Update toggle button
  var btn = cell.querySelector('.cell-controls button:nth-child(1)');
  if (btn) {
    btn.title = !isHidden ? t('showCode') : t('hideCode');
    btn.classList.toggle('active', !isHidden);
  }
  // Manage placeholder
  var ph = cell.querySelector('.cell-hidden-placeholder');
  if (!isHidden) {
    // Now hidden — add placeholder if not present
    if (!ph) {
      ph = document.createElement('div');
      ph.className = 'cell-hidden-placeholder';
      ph.innerHTML = '<span>' + t('showCode') + '</span>';
      ph.onclick = function() { toggleCellHidden(id); };
      cell.querySelector('.cell-input').insertAdjacentElement('afterend', ph);
    }
    // Show placeholder only if output is empty
    var out = document.getElementById(id + '-output');
    ph.style.display = (!out || !out.innerHTML.trim()) ? '' : 'none';
  } else {
    // Now visible — remove placeholder
    if (ph) ph.remove();
  }
}

function toggleCellDisabled(id) {
  var cell = document.getElementById(id);
  if (!cell) return;
  var isDisabled = cell.dataset.disabled === 'true';
  cell.dataset.disabled = isDisabled ? 'false' : 'true';
  cell.classList.toggle('cell-disabled', !isDisabled);
  // Update toggle button
  var btn = cell.querySelector('.cell-controls button:nth-child(2)');
  if (btn) {
    btn.title = !isDisabled ? t('enableCell') : t('disableCell');
    btn.classList.toggle('active', !isDisabled);
  }
  // Reactive DAG integration
  if (!isDisabled) {
    // Disabling — unregister from Observable graph
    if (typeof unregisterCell === 'function') unregisterCell(id);
  } else {
    // Re-enabling — re-register if reactive mode is active
    if (reactiveMode && observableModule) {
      var expr = getXcasExpr(id);
      if (expr && typeof registerCell === 'function') registerCell(id, expr);
    }
  }
}

function toggleCellLocked(id) {
  var cell = document.getElementById(id);
  if (!cell) return;
  var isLocked = cell.dataset.locked === 'true';
  cell.dataset.locked = isLocked ? 'false' : 'true';
  cell.classList.toggle('cell-locked', !isLocked);
  // Update toggle button
  var btn = cell.querySelector('.cell-controls button:nth-child(3)');
  if (btn) {
    btn.title = !isLocked ? t('unlockCell') : t('lockCell');
    btn.classList.toggle('active', !isLocked);
  }
  // Apply readOnly to input elements
  var mf = cell.querySelector('math-field');
  var ta = cell.querySelector('textarea');
  if (mf) mf.readOnly = !isLocked;
  if (ta) ta.readOnly = !isLocked;
}

function toggleReportView() {
  var nb = document.getElementById('notebook');
  if (!nb) return;
  viewMode = (viewMode === 'code') ? 'report' : 'code';
  nb.classList.toggle('report-view', viewMode === 'report');
  // Update toolbar button text
  var btn = document.getElementById('report-view-btn');
  if (btn) {
    btn.textContent = viewMode === 'report' ? t('codeView') : t('reportView');
    btn.setAttribute('data-i18n', viewMode === 'report' ? 'codeView' : 'reportView');
  }
}

// ─────────────────────────────────────────────────────────────
// CELL TYPE SWITCHING
// ─────────────────────────────────────────────────────────────

var _cellTypeOrder = ['math', 'raw', 'text'];

function cycleCellType(id) {
  var cell = document.getElementById(id);
  if (!cell) return;
  var current = cell.dataset.type;
  var idx = _cellTypeOrder.indexOf(current);
  var next = _cellTypeOrder[(idx + 1) % _cellTypeOrder.length];
  setCellType(id, next);
}

function setCellType(id, newType) {
  var cell = document.getElementById(id);
  if (!cell) return;
  var oldType = cell.dataset.type;
  if (oldType === newType) return;

  // Extract current content
  var content = '';
  var mf = cell.querySelector('math-field');
  var ta = cell.querySelector('textarea');
  if (oldType === 'math' && mf) {
    try { content = mathJsonToXcas(mf.expression.json); } catch(e) { content = mf.value; }
  } else if (ta) {
    content = ta.value;
  }

  // Update type
  cell.dataset.type = newType;
  var cellObj = cells.find(function(c) { return c.id === id; });
  if (cellObj) cellObj.type = newType;

  // Update badge
  var badgeKey = { math:'cellMath', raw:'cellRaw', text:'cellText' }[newType];
  var badge = cell.querySelector('.cell-badge');
  if (badge) {
    badge.className = 'cell-badge ' + newType;
    badge.setAttribute('data-i18n', badgeKey);
    badge.textContent = t(badgeKey);
  }

  // Show/hide mode toggle (only for math cells)
  var modeToggle = cell.querySelector('.mode-toggle');
  if (newType === 'math') {
    if (!modeToggle) {
      modeToggle = document.createElement('div');
      modeToggle.className = 'mode-toggle';
      modeToggle.innerHTML =
        '<button class="active" onclick="setCellMode(\'' + id + '\',\'math\')" title="' + t('modeVisual') + '">𝑓(𝑥)</button>' +
        '<button onclick="setCellMode(\'' + id + '\',\'raw\')" title="' + t('modeRaw') + '">{ }</button>';
      badge.insertAdjacentElement('afterend', modeToggle);
    }
    modeToggle.style.display = '';
  } else if (modeToggle) {
    modeToggle.style.display = 'none';
  }

  // Swap input element
  var inp = cell.querySelector('.cell-input');
  inp.innerHTML = '';
  if (newType === 'math') {
    var newMf = document.createElement('math-field');
    newMf.value = content || '';
    newMf.setAttribute('virtual-keyboard-mode', 'onfocus');
    newMf.addEventListener('input', function() { updateDebug(id); });
    newMf.addEventListener('keydown', function(e) { cellKey(e, id, 'math'); });
    inp.appendChild(newMf);
    if (cell.dataset.locked === 'true') newMf.readOnly = true;
    cell.dataset.mode = 'math';
    setTimeout(function() { updateDebug(id); }, 100);
  } else {
    var ph = newType === 'raw' ? t('placeholderRaw') : t('placeholderText');
    var newTa = mkTextarea(ph, content);
    newTa.rows = newType === 'text' ? 3 : 2;
    newTa.addEventListener('keydown', function(e) { cellKey(e, id, newType); });
    inp.appendChild(newTa);
    if (cell.dataset.locked === 'true') newTa.readOnly = true;
    delete cell.dataset.mode;
  }

  // Update debug panel visibility
  var dbg = cell.querySelector('.cell-debug');
  if (dbg) dbg.classList.toggle('visible', newType === 'math' && showDebug);
}

function rebuildNotebookDOM() {
  var nb = document.getElementById('notebook');
  var empty = document.getElementById('empty-notebook');
  var footer = document.getElementById('notebook-footer');
  nb.innerHTML = '';
  if (empty) nb.appendChild(empty);
  cells.forEach(function(c) { nb.appendChild(c.element); });
  if (footer) nb.appendChild(footer);
}

function insertCellAt(refId, dir) {
  // dir: -1 = above, 1 = below
  var idx = cells.findIndex(function(c) { return c.id === refId; });
  if (idx < 0) return;
  var newId = addCell('math');
  // addCell appends at end — move the new cell to the right position
  var newCell = cells.pop();
  var insertIdx = dir < 0 ? idx : idx + 1;
  cells.splice(insertIdx, 0, newCell);
  rebuildNotebookDOM();
  // Focus the new cell
  var mf = document.getElementById(newId)?.querySelector('math-field');
  if (mf) setTimeout(function() { mf.focus(); }, 50);
}

function moveCell(id, dir) {
  const i = cells.findIndex(c => c.id === id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= cells.length) return;
  [cells[i], cells[j]] = [cells[j], cells[i]];
  rebuildNotebookDOM();
}

// ─────────────────────────────────────────────────────────────
// DRAG-AND-DROP CELL REORDERING
// ─────────────────────────────────────────────────────────────

var _draggedCellId = null;

function initCellDrag(cellDiv) {
  var handle = cellDiv.querySelector('.drag-handle');
  if (!handle) return;

  handle.setAttribute('draggable', 'true');

  handle.addEventListener('dragstart', function(e) {
    _draggedCellId = cellDiv.id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cellDiv.id);
    e.dataTransfer.setDragImage(cellDiv, 20, 20);
    setTimeout(function() { cellDiv.classList.add('cell-dragging'); }, 0);
  });

  handle.addEventListener('dragend', function() {
    cellDiv.classList.remove('cell-dragging');
    _draggedCellId = null;
    document.querySelectorAll('.cell-drag-over-top,.cell-drag-over-bottom').forEach(function(el) {
      el.classList.remove('cell-drag-over-top', 'cell-drag-over-bottom');
    });
  });

  cellDiv.addEventListener('dragover', function(e) {
    if (!_draggedCellId || _draggedCellId === cellDiv.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var rect = cellDiv.getBoundingClientRect();
    var midY = rect.top + rect.height / 2;
    cellDiv.classList.toggle('cell-drag-over-top', e.clientY < midY);
    cellDiv.classList.toggle('cell-drag-over-bottom', e.clientY >= midY);
  });

  cellDiv.addEventListener('dragleave', function() {
    cellDiv.classList.remove('cell-drag-over-top', 'cell-drag-over-bottom');
  });

  cellDiv.addEventListener('drop', function(e) {
    e.preventDefault();
    cellDiv.classList.remove('cell-drag-over-top', 'cell-drag-over-bottom');
    if (!_draggedCellId || _draggedCellId === cellDiv.id) return;

    var fromIdx = cells.findIndex(function(c) { return c.id === _draggedCellId; });
    var toIdx = cells.findIndex(function(c) { return c.id === cellDiv.id; });
    if (fromIdx < 0 || toIdx < 0) return;

    // Determine insert position based on cursor half
    var rect = cellDiv.getBoundingClientRect();
    var insertAfter = e.clientY >= rect.top + rect.height / 2;
    var targetIdx = insertAfter ? toIdx : toIdx;

    // Remove from old position and insert at new
    var moved = cells.splice(fromIdx, 1)[0];
    // Recalculate target after splice (index may have shifted)
    var newIdx = cells.findIndex(function(c) { return c.id === cellDiv.id; });
    if (insertAfter) newIdx++;
    cells.splice(newIdx, 0, moved);

    rebuildNotebookDOM();
    _draggedCellId = null;
  });
}
