'use strict';

// SECTION 10 — EXPORT / IMPORT
// ─────────────────────────────────────────────────────────────

function exportNotebook() {
  const data = {
    version: 2,
    locale: currentLocale,
    reactiveMode: reactiveMode,
    cells: cells.map(c => {
      const el = c.element;
      const mode = el.dataset.mode || el.dataset.type;
      const mf = el.querySelector('math-field');
      const ta = el.querySelector('textarea');
      const cellInfo = cellVariableMap.get(c.id);
      return {
        type: el.dataset.type,
        mode,
        content: (mode === 'math' && mf) ? mf.value : (ta ? ta.value : ''),
        defines: cellInfo ? cellInfo.defines : [],
        references: cellInfo ? cellInfo.references : []
      };
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
        var cellItems = Array.isArray(data) ? data : data.cells;
        cellItems.forEach(item => {
          var cid = item.type === 'math' ? addCell('math', item.content) : addCell(item.type, '', item.content);
          // v1 migration: extract deps if not present
          if (reactiveMode && observableModule && item.type !== 'text') {
            var expr = item.type === 'math' ? '' : (item.content || '');
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
