'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 5 — CELL MANAGEMENT (functions)
// ─────────────────────────────────────────────────────────────

function addCell(type = 'math', initialLatex = '', initialRaw = '', initialMathJson = null, i18nKeys = null) {
  cellCounter++;
  const id = 'cell-' + cellCounter;
  const nb = document.getElementById('notebook');
  const div = document.createElement('div');
  div.className = 'cell'; div.id = id; div.dataset.type = type;
  div.dataset.cellId = id; div.dataset.defines = ''; div.dataset.references = '';
  if (i18nKeys) div.dataset.i18nContent = i18nKeys;

  const badge = { math:'cellMath', raw:'cellRaw', text:'cellText' }[type];
  const idx   = type === 'text' ? `Txt[${cellCounter}]` : `In[${cellCounter}]`;

  div.innerHTML = `
    <div class="cell-head">
      <span class="cell-idx">${idx}</span>
      <span class="cell-badge ${type}" data-i18n="${badge}">${t(badge)}</span>
      ${type === 'math' ? `<div class="mode-toggle">
        <button class="active" onclick="setCellMode('${id}','math')" title="${t('modeVisual')}">𝑓(𝑥)</button>
        <button onclick="setCellMode('${id}','raw')" title="${t('modeRaw')}">{ }</button>
      </div>` : ''}
      <div class="cell-actions">
        <button onclick="runSingleCell('${id}')" title="${t('runCell')}">▶</button>
        <button onclick="moveCell('${id}',-1)" title="${t('moveUp')}">↑</button>
        <button onclick="moveCell('${id}',1)" title="${t('moveDown')}">↓</button>
        <button class="del" onclick="deleteCell('${id}')" title="${t('deleteCell')}">✕</button>
      </div>
    </div>
    <div class="cell-input"></div>
    <div class="cell-debug ${showDebug?'visible':''}"></div>
    <div class="cell-output" id="${id}-output"></div>`;

  nb.appendChild(div);
  const inp = div.querySelector('.cell-input');

  if (type === 'math') {
    const mf = document.createElement('math-field');
    if (initialMathJson) {
      inp.appendChild(mf);
      mf.expression = initialMathJson;
    } else {
      mf.value = initialLatex || '';
      inp.appendChild(mf);
    }
    mf.setAttribute('virtual-keyboard-mode', 'onfocus');
    mf.addEventListener('input', () => updateDebug(id));
    mf.addEventListener('keydown', (e) => cellKey(e, id, 'math'));
    setTimeout(() => updateDebug(id), 100);
  } else {
    const ph = type === 'raw' ? t('placeholderRaw') : t('placeholderText');
    const ta = mkTextarea(ph, initialRaw);
    ta.rows = type === 'text' ? 3 : 2;
    ta.addEventListener('keydown', (e) => cellKey(e, id, type));
    inp.appendChild(ta);
  }

  // Dependency highlighting on focus/blur
  div.addEventListener('focusin', function() { if (reactiveMode) highlightDeps(id); });
  div.addEventListener('focusout', function() { clearDepHighlights(); });

  cells.push({ id, type, element: div });
  return id;
}

function mkTextarea(ph, val) {
  const ta = document.createElement('textarea');
  ta.placeholder = ph; ta.value = val || '';
  ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; });
  return ta;
}

function cellKey(e, id, type) {
  if (e.key === 'Enter' && e.ctrlKey && e.shiftKey) { e.preventDefault(); runSingleCell(id, true); return; }
  if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); runSingleCell(id); }
  if (e.key === 'Enter' && e.ctrlKey)  { e.preventDefault(); runSingleCell(id); addCell(type === 'text' ? 'text' : 'math'); }
}


// ─────────────────────────────────────────────────────────────
// SECTION 6 — DEBUG PANEL
// ─────────────────────────────────────────────────────────────

function updateDebug(cellId) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  const dbg = cell.querySelector('.cell-debug');
  const mf  = cell.querySelector('math-field');
  if (!mf || !dbg) return;
  try {
    const json = mf.expression.json;
    const xcas = mathJsonToXcas(json);
    dbg.innerHTML =
      '<span class="lbl">MathJSON:</span><code>' + esc(JSON.stringify(json)) + '</code>' +
      '<span class="xcas-out">→ Xcas: <code>' + esc(xcas) + '</code></span>';
  } catch (e) {
    dbg.innerHTML = '<span class="lbl">Error:</span> ' + esc(e.message);
  }
}

function toggleAllDebug(show) {
  showDebug = show;
  document.querySelectorAll('.cell-debug').forEach(d => d.classList.toggle('visible', show));
}


// ─────────────────────────────────────────────────────────────
// SECTION 7 — MODE SWITCHING (math ↔ raw)
// ─────────────────────────────────────────────────────────────

function setCellMode(cellId, mode) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  const inp  = cell.querySelector('.cell-input');
  const btns = cell.querySelectorAll('.mode-toggle button');

  if (mode === 'raw') {
    const mf = cell.querySelector('math-field');
    const xcas = mf ? mathJsonToXcas(mf.expression.json) : '';
    inp.innerHTML = '';
    const ta = mkTextarea(t('placeholderRaw'), xcas);
    ta.addEventListener('keydown', (e) => cellKey(e, cellId, 'raw'));
    inp.appendChild(ta);
    cell.dataset.mode = 'raw';
    btns[0].classList.remove('active'); btns[1].classList.add('active');
  } else {
    const ta = cell.querySelector('textarea');
    inp.innerHTML = '';
    const mf = document.createElement('math-field');
    mf.value = ta ? ta.value : '';
    mf.setAttribute('virtual-keyboard-mode', 'onfocus');
    mf.addEventListener('input', () => updateDebug(cellId));
    mf.addEventListener('keydown', (e) => cellKey(e, cellId, 'math'));
    inp.appendChild(mf);
    cell.dataset.mode = 'math';
    btns[0].classList.add('active'); btns[1].classList.remove('active');
    setTimeout(() => updateDebug(cellId), 100);
  }
}
