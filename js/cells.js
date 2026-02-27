'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 5 — CELL MANAGEMENT (functions)
// ─────────────────────────────────────────────────────────────

function addCell(type = 'math', initialLatex = '', initialRaw = '', initialMathJson = null, i18nKeys = null, opts = {}) {
  cellCounter++;
  const id = 'cell-' + cellCounter;
  const nb = document.getElementById('notebook');
  const div = document.createElement('div');
  div.className = 'cell'; div.id = id; div.dataset.type = type;
  div.dataset.cellId = id; div.dataset.defines = ''; div.dataset.references = '';
  if (i18nKeys) div.dataset.i18nContent = i18nKeys;

  // Cell control states (default false)
  var isHidden   = opts.hidden   === true;
  var isDisabled = opts.disabled === true;
  var isLocked   = opts.locked   === true;
  div.dataset.hidden   = isHidden   ? 'true' : 'false';
  div.dataset.disabled = isDisabled ? 'true' : 'false';
  div.dataset.locked   = isLocked   ? 'true' : 'false';
  if (isHidden)   div.classList.add('cell-hidden');
  if (isDisabled) div.classList.add('cell-disabled');
  if (isLocked)   div.classList.add('cell-locked');

  const badge = { math:'cellMath', raw:'cellRaw', text:'cellText', slider:'cellSlider' }[type] || 'cellRaw';
  const idx   = type === 'slider' ? `Slider[${cellCounter}]` : type === 'text' ? `Txt[${cellCounter}]` : `In[${cellCounter}]`;

  div.innerHTML = `
    <div class="cell-insert-zone" onclick="insertCellAt('${id}',-1)" title="${t('insertAbove')}"><span>+</span></div>
    <div class="cell-head">
      <span class="drag-handle" title="${t('dragToReorder')}">⠿</span>
      <span class="cell-idx">${idx}</span>
      <span class="cell-badge ${type}" data-i18n="${badge}" onclick="cycleCellType('${id}')" title="${t('changeType')}">${t(badge)}</span>
      ${type === 'math' ? `<div class="mode-toggle">
        <button class="active" onclick="setCellMode('${id}','math')" title="${t('modeVisual')}">𝑓(𝑥)</button>
        <button onclick="setCellMode('${id}','raw')" title="${t('modeRaw')}">{ }</button>
      </div>` : ''}
      <div class="cell-controls">
        <button onclick="toggleCellHidden('${id}')" title="${isHidden ? t('showCode') : t('hideCode')}" class="${isHidden ? 'active' : ''}">👁</button>
        <button onclick="toggleCellDisabled('${id}')" title="${isDisabled ? t('enableCell') : t('disableCell')}" class="${isDisabled ? 'active' : ''}">⊘</button>
        <button onclick="toggleCellLocked('${id}')" title="${isLocked ? t('unlockCell') : t('lockCell')}" class="${isLocked ? 'active' : ''}">🔒</button>
      </div>
      <div class="cell-actions">
        <button onclick="runSingleCell('${id}')" title="${t('runCell')}">▶</button>
        <button onclick="moveCell('${id}',-1)" title="${t('moveUp')}">↑</button>
        <button onclick="moveCell('${id}',1)" title="${t('moveDown')}">↓</button>
        <button class="del" onclick="deleteCell('${id}')" title="${t('deleteCell')}">✕</button>
      </div>
    </div>
    <div class="cell-input"></div>
    <div class="cell-debug ${showDebug?'visible':''}"></div>
    <div class="cell-output" id="${id}-output"></div>
    <div class="cell-insert-zone" onclick="insertCellAt('${id}',1)" title="${t('insertBelow')}"><span>+</span></div>`;

  var footer = document.getElementById('notebook-footer');
  if (footer) nb.insertBefore(div, footer); else nb.appendChild(div);
  const inp = div.querySelector('.cell-input');

  if (type === 'slider') {
    div.dataset.expression = opts.expression || '';
    div.dataset.plotType = opts.plotType || 'plot';
    var sliderParams = opts.params || [];
    var sliderArea = document.createElement('div');
    sliderArea.className = 'slider-params';

    if (customElements.get('slider-param')) {
      sliderParams.forEach(function(p) {
        var sp = document.createElement('slider-param');
        sp.setAttribute('name', p.name);
        sp.setAttribute('label', t(p.label) || p.label);
        sp.setAttribute('min', p.min);
        sp.setAttribute('max', p.max);
        sp.setAttribute('step', p.step);
        sp.setAttribute('value', p.value);
        sliderArea.appendChild(sp);
      });
    } else {
      var warn = document.createElement('div');
      warn.className = 'slider-fallback';
      warn.textContent = t('sliderUnavailable');
      sliderArea.appendChild(warn);
      sliderParams.forEach(function(p) {
        var d = document.createElement('div');
        d.className = 'slider-static';
        d.textContent = (t(p.label) || p.label) + ': ' + p.value;
        sliderArea.appendChild(d);
      });
    }
    inp.appendChild(sliderArea);

    // Code display area — shows the Giac expression with current param values
    var codeArea = document.createElement('div');
    codeArea.className = 'slider-code';
    inp.appendChild(codeArea);

    // Evaluate and render the slider expression
    var sliderCellId = id;
    var sliderExpression = opts.expression || '';
    function updateCodeDisplay() {
      var exprDisplay = sliderExpression;
      sliderParams.forEach(function(p) {
        var re = new RegExp('\\b' + p.name + '\\b', 'g');
        exprDisplay = exprDisplay.replace(re, p.value);
      });
      codeArea.innerHTML = '<code class="slider-expr-template">' + esc(sliderExpression) + '</code>' +
        '<code class="slider-expr-resolved">' + esc(exprDisplay) + '</code>';
    }
    function evaluateSliderCell() {
      var assigns = sliderParams.map(function(p) {
        var sp = sliderArea.querySelector('slider-param[name="' + p.name + '"]');
        var val = sp ? sp.value : p.value;
        p.value = val;
        return p.name + ':=' + val;
      }).join('; ');
      try { caseval(assigns); } catch(e) { /* ignore */ }
      updateCodeDisplay();
      var out = document.getElementById(sliderCellId + '-output');
      if (!out) return;
      if (typeof cleanupJSXGraphInElement === 'function') cleanupJSXGraphInElement(out);
      out.innerHTML = '';
      try {
        if (typeof jsxGraphAvailable === 'function' && jsxGraphAvailable() && typeof tryDirectJSXGraph === 'function' && tryDirectJSXGraph(sliderExpression, out)) {
          // plot rendered
        } else {
          var raw = caseval(sliderExpression);
          var plotFmt = typeof detectPlotFormat === 'function' ? detectPlotFormat(raw) : 'text';
          if (plotFmt === 'svg') {
            renderSvgPlot(out, stripQuotes(raw));
          } else if (plotFmt === 'gr2d') {
            var jsxDone = false;
            if (typeof jsxGraphAvailable === 'function' && jsxGraphAvailable()) {
              try {
                var plotData = parseGr2dLogoData(raw);
                if (plotData && plotData.curves.length > 0) { renderJSXGraphPlot(out, plotData); jsxDone = true; }
              } catch(e) {}
            }
            if (!jsxDone) renderGr2dPlot(out, raw);
          } else {
            out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>';
          }
        }
      } catch(err) {
        out.innerHTML = '<span class="err">' + esc(String(err)) + '</span>';
      }
    }

    // Listen for slider changes with debounce
    var _sliderTimer = null;
    sliderArea.addEventListener('slider-change', function(e) {
      var param = sliderParams.find(function(p) { return p.name === e.detail.name; });
      if (param) param.value = e.detail.value;
      // Register/update the param in Observable DAG
      if (typeof registerSliderParam === 'function') {
        registerSliderParam(sliderCellId, e.detail.name, e.detail.value);
      }
      if (_sliderTimer) cancelAnimationFrame(_sliderTimer);
      _sliderTimer = requestAnimationFrame(evaluateSliderCell);
    });

    // Store evaluation function on the cell element for later use
    div._evaluateSlider = evaluateSliderCell;
    div._sliderParams = sliderParams;
  } else if (type === 'math') {
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

  // Apply locked state to input elements
  if (isLocked) {
    var lockMf = div.querySelector('math-field');
    var lockTa = div.querySelector('textarea');
    if (lockMf) lockMf.readOnly = true;
    if (lockTa) lockTa.readOnly = true;
  }

  // Hidden placeholder: show a clickable bar when hidden and no output
  if (isHidden) {
    var ph = document.createElement('div');
    ph.className = 'cell-hidden-placeholder';
    ph.innerHTML = '<span>' + t('showCode') + '</span>';
    ph.onclick = function() { toggleCellHidden(id); };
    div.querySelector('.cell-input').insertAdjacentElement('afterend', ph);
  }

  // Drag-and-drop reordering
  initCellDrag(div);

  // Dependency highlighting on focus/blur
  div.addEventListener('focusin', function() { if (reactiveMode) highlightDeps(id); });
  div.addEventListener('focusout', function() { clearDepHighlights(); });

  cells.push({ id, type, element: div });
  updateEmptyState();
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
  // Cell control shortcuts
  if (e.ctrlKey && e.shiftKey && (e.key === 'H' || e.key === 'h')) { e.preventDefault(); toggleCellHidden(id); }
  if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) { e.preventDefault(); toggleCellDisabled(id); }
  if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) { e.preventDefault(); toggleCellLocked(id); }
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
    // Reapply lock state after mode switch
    if (cell.dataset.locked === 'true') ta.readOnly = true;
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
    // Reapply lock state after mode switch
    if (cell.dataset.locked === 'true') mf.readOnly = true;
    setTimeout(() => updateDebug(cellId), 100);
  }
}
