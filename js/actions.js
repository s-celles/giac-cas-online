'use strict';

// SECTION 9 — GLOBAL ACTIONS
// ─────────────────────────────────────────────────────────────

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

function moveCell(id, dir) {
  const i = cells.findIndex(c => c.id === id);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= cells.length) return;
  [cells[i], cells[j]] = [cells[j], cells[i]];
  const nb = document.getElementById('notebook');
  nb.innerHTML = '';
  cells.forEach(c => nb.appendChild(c.element));
}
