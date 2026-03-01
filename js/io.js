'use strict';

// SECTION 10 — EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────

function buildNotebookData() {
  return {
    version: 5,
    type: 'cascad-notebook',
    kernel: (typeof KernelRegistry !== 'undefined' && KernelRegistry.active) ? KernelRegistry.active.id : currentKernel,
    created: new Date().toISOString(),
    locale: currentLocale,
    reactiveMode: reactiveMode,
    cells: cells.map(c => {
      const el = c.element;
      const mode = el.dataset.mode || el.dataset.type;
      const mf = el.querySelector('math-field');
      const ta = el.querySelector('textarea');
      const cellInfo = cellVariableMap.get(c.id);
      const cell = {
        type: el.dataset.type,
        mode,
        defines: cellInfo ? cellInfo.defines : [],
        references: cellInfo ? cellInfo.references : [],
        hidden: el.dataset.hidden === 'true',
        disabled: el.dataset.disabled === 'true',
        locked: el.dataset.locked === 'true'
      };
      if (el.dataset.type === 'slider') {
        cell.params = (el._sliderParams || []).map(function(p) {
          var sp = el.querySelector('slider-param[name="' + p.name + '"]');
          return { name: p.name, label: p.label, min: p.min, max: p.max, step: p.step, value: sp ? sp.value : p.value };
        });
        cell.expression = el.dataset.expression || '';
        cell.plotType = el.dataset.plotType || 'plot';
      } else if (mode === 'math' && mf) {
        cell.mathjson = mf.expression.json;
      } else {
        cell.content = ta ? ta.value : '';
      }
      return cell;
    })
  };
}

function exportNotebook() {
  var data = buildNotebookData();
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'notebook.cascad.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function _shareAsURL() {
  return compressNotebook().then(function(compressed) {
    var url = generateNotebookURL(compressed, false);
    return navigator.share({ title: 'CAScad Notebook', url: url });
  });
}

function shareNotebook() {
  if (!navigator.share) return;
  var data = buildNotebookData();
  var json = JSON.stringify(data, null, 2);
  var file = new File([json], 'notebook.cascad.json', { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ title: 'CAScad Notebook', files: [file] }).catch(function(err) {
      if (err.name === 'AbortError') return;
      // File sharing denied — fall back to URL sharing
      _shareAsURL().catch(function() {});
    });
  } else {
    _shareAsURL().catch(function() {});
  }
}

function loadNotebookData(data, opts) {
  opts = opts || {};
  // Restore kernel from notebook data (v5+), default to giac-js
  var notebookKernel = data.kernel || 'giac-js';
  if (typeof KernelRegistry !== 'undefined') {
    var k = KernelRegistry.get(notebookKernel);
    if (k && k.available) {
      KernelRegistry.setActive(notebookKernel);
    }
  }
  if (data.locale && LOCALES[data.locale]) setLocale(data.locale);
  // Clear reactive graph
  cellVariableMap.forEach(function(info, cid) { unregisterCell(cid); });
  cellVariableMap.clear();
  variableOwnerMap.clear();
  // Preserve empty-notebook and notebook-footer elements
  var nb = document.getElementById('notebook');
  var empty = document.getElementById('empty-notebook');
  var footer = document.getElementById('notebook-footer');
  nb.innerHTML = '';
  if (empty) nb.appendChild(empty);
  if (footer) nb.appendChild(footer);
  cells = []; cellCounter = 0;
  if (!opts.keepReactiveMode && data.reactiveMode !== undefined) toggleReactiveMode(data.reactiveMode);
  var fileVersion = data.version || 1;
  var cellItems = Array.isArray(data) ? data : data.cells;
  cellItems.forEach(function(item) {
    var cid;
    // Cell state flags (v4+, default false for older formats)
    var cellOpts = {
      hidden: item.hidden === true,
      disabled: item.disabled === true,
      locked: item.locked === true
    };
    if (item.type === 'slider') {
      cid = addCell('slider', '', '', null, null, Object.assign(cellOpts, {
        params: item.params || [],
        expression: item.expression || '',
        plotType: item.plotType || 'plot'
      }));
    } else if (item.type === 'math') {
      if (item.mathjson && fileVersion >= 3) {
        cid = addCell('math', '', '', item.mathjson, null, cellOpts);
      } else if (item.content) {
        // Pass LaTeX directly to math-field (mf.value) instead of going
        // through ce.parse() which corrupts some expressions (e.g. 0^+)
        cid = addCell('math', item.content, '', null, null, cellOpts);
      } else {
        cid = addCell('math', '', '', null, null, cellOpts);
      }
    } else {
      cid = addCell(item.type, '', item.content, null, null, cellOpts);
    }
    if (reactiveMode && observableModule && item.type !== 'text') {
      var expr = getGiacExpr(cid);
      if (expr) registerCell(cid, expr);
    }
  });
  updateEmptyState();
  // Auto-render text cells
  cells.forEach(function(c) { if (c.type === 'text') renderTextCell(c.id); });
}

function importNotebook() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,.giac.json,.cascad.json,.xcas.json';
  inp.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        var parsed = JSON.parse(ev.target.result);
        var validTypes = ['giac-notebook', 'xcas-notebook', 'cascad-notebook'];
        if (parsed.type && validTypes.indexOf(parsed.type) === -1) {
          alert(t('invalidJson'));
          return;
        }
        loadNotebookData(parsed);
      } catch(err) { alert(t('invalidJson')); }
    };
    r.readAsText(f);
  };
  inp.click();
}


// ─────────────────────────────────────────────────────────────
// SECTION 11 — UTILITIES
// ─────────────────────────────────────────────────────────────

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
