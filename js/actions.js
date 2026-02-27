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
