'use strict';

// SECTION 10 — EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────

function exportNotebook() {
  const data = {
    version: 4,
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
      if (mode === 'math' && mf) {
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
  a.download = 'xcas-notebook.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importNotebook() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json';
  inp.onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.locale && LOCALES[data.locale]) setLocale(data.locale);
        // Clear reactive graph
        cellVariableMap.forEach(function(info, cid) { unregisterCell(cid); });
        cellVariableMap.clear();
        variableOwnerMap.clear();
        document.getElementById('notebook').innerHTML = '';
        cells = []; cellCounter = 0;
        if (data.reactiveMode !== undefined) toggleReactiveMode(data.reactiveMode);
        var fileVersion = data.version || 1;
        var cellItems = Array.isArray(data) ? data : data.cells;
        cellItems.forEach(item => {
          var cid;
          // Cell state flags (v4+, default false for older formats)
          var cellOpts = {
            hidden: item.hidden === true,
            disabled: item.disabled === true,
            locked: item.locked === true
          };
          if (item.type === 'math') {
            if (item.mathjson && fileVersion >= 3) {
              // v3+: MathJSON is the canonical representation
              cid = addCell('math', '', '', item.mathjson, null, cellOpts);
            } else if (item.content) {
              // v2/v1: LaTeX content — convert to MathJSON
              try {
                var mjson = ce.parse(item.content, { canonical: false }).json;
                cid = addCell('math', '', '', mjson, null, cellOpts);
              } catch (e) {
                // Fallback: unparseable LaTeX → import as raw cell with warning
                console.warn('v2 import: unparseable LaTeX, importing as raw cell:', item.content, e);
                cid = addCell('raw', '', item.content, null, null, cellOpts);
              }
            } else {
              cid = addCell('math', '', '', null, null, cellOpts);
            }
          } else {
            cid = addCell(item.type, '', item.content, null, null, cellOpts);
          }
          // Register in reactive graph if needed
          if (reactiveMode && observableModule && item.type !== 'text') {
            var expr = getXcasExpr(cid);
            if (expr) registerCell(cid, expr);
          }
        });
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
