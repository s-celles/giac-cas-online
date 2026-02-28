'use strict';

// SECTION 10 — EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────

function exportNotebook() {
  const data = {
    version: 4,
    type: 'giac-notebook',
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
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'notebook.giac.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function loadNotebookData(data, opts) {
  opts = opts || {};
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
  inp.type = 'file'; inp.accept = '.json,.giac.json,.xcas.json';
  inp.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        var parsed = JSON.parse(ev.target.result);
        if (parsed.type && parsed.type !== 'giac-notebook' && parsed.type !== 'xcas-notebook') {
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
