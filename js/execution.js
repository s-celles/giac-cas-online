'use strict';

// SECTION 8 — EXECUTION
// ─────────────────────────────────────────────────────────────

// ── Giac message capture ─────────────────────────────────────
// Module.print / Module.printErr buffer messages during caseval()
// so we can display warnings/info in the cell output.
function giacCaptureStart() {
  Module._giacMessages = [];
  Module._giacCapture = true;
}

function giacCaptureFlush() {
  Module._giacCapture = false;
  var msgs = Module._giacMessages;
  Module._giacMessages = [];
  return msgs;
}

/** Render captured giac messages as a warning/info block inside a cell output.
 *  If msgs is provided, render those instead of flushing the capture buffer. */
function renderGiacMessages(outEl, msgs) {
  if (!msgs) msgs = giacCaptureFlush();
  if (!msgs || msgs.length === 0) return;
  var div = document.createElement('div');
  div.className = 'giac-messages';
  msgs.forEach(function(m) {
    var line = document.createElement('div');
    line.className = 'giac-msg giac-msg-' + m.type;
    line.textContent = m.text;
    div.appendChild(line);
  });
  outEl.appendChild(div);
}

function getGiacExpr(cellId) {
  const cell = document.getElementById(cellId);
  if (!cell || cell.dataset.type === 'text') return '';
  if (cell.dataset.disabled === 'true') return '';
  const mode = cell.dataset.mode || cell.dataset.type;
  if (cell.dataset.type === 'raw' || mode === 'raw') {
    return cell.querySelector('textarea')?.value.trim() || '';
  }
  const mf = cell.querySelector('math-field');
  if (!mf) return '';
  // For CAS functions (\operatorname{...}), use LaTeX pipeline with normalization
  // because CortexJS may not parse them correctly from MathJSON
  const latex = mf.value;
  // Intercept help queries from math fields — MathLive may not recognize help()
  // as a function and could mangle it (e.g. h·e·l·p implicit multiplication,
  // or frac → \frac{}{})
  if (latex) {
    var helpLatex = latex.match(/^\\operatorname\{help\}\\left\((.*)\\right\)$/);
    if (!helpLatex) helpLatex = latex.match(/^help\\left\((.*)\\right\)$/);
    if (!helpLatex) helpLatex = latex.match(/^help\((\w*)\)$/);
    if (helpLatex) {
      var helpArg = helpLatex[1] || '';
      // Extract command name from LaTeX: \frac{}{} → frac, \sin → sin, plain word → word
      if (helpArg.match(/^\\(\w+)/)) helpArg = helpArg.match(/^\\(\w+)/)[1];
      // \operatorname{name}... → name
      else if (helpArg.match(/^\\operatorname\{(\w+)\}/)) helpArg = helpArg.match(/^\\operatorname\{(\w+)\}/)[1];
      return 'help(' + helpArg + ')';
    }
    if (/^\?(\w+)$/.test(latex)) return latex;
    // ?\ command in math mode: ?\frac → ?frac
    var qLatex = latex.match(/^\?\\(\w+)/);
    if (qLatex) return '?' + qLatex[1];
  }
  if (latex && /\\operatorname/.test(latex)) {
    return latexToGiac(latex);
  }
  const json = mf.expression.json;
  return mathJsonToGiac(json);
}

function runSingleCell(cellId, forceManual) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  // Skip disabled cells
  if (cell.dataset.disabled === 'true') return;
  if (cell.dataset.type === 'text') { renderTextCell(cellId); return; }

  const expr = getGiacExpr(cellId);
  const out  = document.getElementById(cellId + '-output');
  if (!expr) { out.innerHTML = ''; return; }

  // Intercept help queries before GIAC evaluation
  if (typeof isHelpQuery === 'function') {
    const helpCmd = isHelpQuery(expr);
    if (helpCmd !== null) {
      if (helpCmd === '') { showGeneralHelp(cellId); }
      else { showHelpInCell(cellId, helpCmd); }
      return;
    }
  }

  if (!giacReady) { out.innerHTML = '<span class="err">' + t('giacNotReady') + '</span>'; return; }

  // Reactive mode: register/update in Observable graph (unless forced manual)
  if (reactiveMode && observableModule && !forceManual) {
    // The observer's pending() callback shows the spinner.
    // updateCell → registerCell → variable.define() triggers
    // Observable to (re-)evaluate this cell and all downstream dependents.
    try {
      updateCell(cellId, expr);
    } catch(err) {
      out.innerHTML = '<span class="err">' + t('errorPrefix') + ' ' + esc(String(err)) + '</span>';
      cell.classList.add('cell-error');
    }
    return;
  }

  cell.classList.add('running');
  out.innerHTML = '<span class="spinner"></span> ' + t('computing');

  setTimeout(() => {
    try {
      // Clean up any previous JSXGraph boards in this output
      cleanupJSXGraphInElement(out);
      out.innerHTML = '';

      // Try direct JSXGraph rendering from the input expression (no SVG parsing)
      if (jsxGraphAvailable() && tryDirectJSXGraph(expr, out)) {
        // Successfully rendered directly — done
      } else {
        // For potential 3D commands, pre-create canvas so Emscripten's SDL
        // initializes WebGL on the right canvas (not the hidden default)
        var preGl3dCanvas = null, preGl3dContainer = null, savedModuleCanvas = null;
        if (/\b(plotfunc|plotparam3d|plot3d)\s*\(/.test(expr)) {
          if (webglAvailable() && getGiacRenderer()) {
            preGl3dContainer = document.createElement('div');
            preGl3dContainer.className = 'gl3d-container';
            preGl3dCanvas = document.createElement('canvas');
            preGl3dCanvas.id = 'gl3d_pre_' + Date.now();
            var pcw = Math.min(out.clientWidth || 700, 700);
            preGl3dCanvas.width = pcw;
            preGl3dCanvas.height = Math.round(pcw * 2 / 3);
            preGl3dContainer.appendChild(preGl3dCanvas);
            out.appendChild(preGl3dContainer);
            savedModuleCanvas = Module.canvas;
            Module.canvas = preGl3dCanvas;
          }
        }

        // Fall back to caseval + format-based pipeline
        giacCaptureStart();
        const raw = caseval(expr);
        // Flush messages now so the latex() re-evaluation doesn't duplicate them
        const giacMsgs = giacCaptureFlush();
        const plotFmt = detectPlotFormat(raw);

        // Clean up pre-created gl3d canvas immediately if output is not gl3d
        if (plotFmt !== 'gl3d' && preGl3dCanvas && preGl3dContainer) {
          preGl3dContainer.remove();
          if (savedModuleCanvas) Module.canvas = savedModuleCanvas;
          preGl3dCanvas = null;
        }

        if (plotFmt === 'svg') {
          renderSvgPlot(out, stripQuotes(raw));
        } else if (plotFmt === 'gr2d') {
          var jsxDone = false;
          if (jsxGraphAvailable()) {
            try {
              var plotData = parseGr2dLogoData(raw);
              if (plotData && plotData.curves.length > 0) {
                renderJSXGraphPlot(out, plotData);
                jsxDone = true;
              }
            } catch(e) { console.warn('JSXGraph gr2d parse failed, falling back:', e); }
          }
          if (!jsxDone) renderGr2dPlot(out, raw);
        } else if (plotFmt === 'gl3d') {
          var sceneId = raw.substr(5).trim();
          if (preGl3dCanvas) {
            // Use pre-created canvas (Module.canvas already set)
            preGl3dCanvas.id = 'gl3d_' + sceneId;
            var gr = getGiacRenderer();
            try { gr(sceneId); } catch(e) {
              preGl3dContainer.innerHTML = '<div class="plot-3d-msg">' + t('plot3dNotSupported') + '</div>';
            }
            // Mouse interaction
            var pushed = false, lastX = 0, lastY = 0;
            preGl3dCanvas.addEventListener('mousedown', function(e) { pushed = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault(); });
            preGl3dCanvas.addEventListener('mouseup', function() { pushed = false; });
            preGl3dCanvas.addEventListener('mouseleave', function() { pushed = false; });
            preGl3dCanvas.addEventListener('mousemove', function(e) {
              if (!pushed) return;
              var dx = e.clientX - lastX, dy = e.clientY - lastY;
              if (Math.abs(dx) > 2) gr((dx > 0 ? 'r' : 'l') + sceneId);
              if (Math.abs(dy) > 2) gr((dy > 0 ? 'd' : 'u') + sceneId);
              lastX = e.clientX; lastY = e.clientY; e.preventDefault();
            });
            // Cleanup SDL listeners
            try {
              var kle = Module['keyboardListeningElement'] || document;
              if (typeof SDL !== 'undefined' && SDL.receiveEvent) {
                kle.removeEventListener('keydown', SDL.receiveEvent);
                kle.removeEventListener('keyup', SDL.receiveEvent);
                kle.removeEventListener('keypress', SDL.receiveEvent);
              }
            } catch(e) {}
            preGl3dCanvas = null; // Mark as used
          } else {
            renderGl3dPlot(out, sceneId);
          }
        } else if (isGiacError(raw)) {
          // GIAC error — display as styled error, not as LaTeX
          out.innerHTML = '<span class="err">' + t('errorPrefix') + ' ' + esc(raw) + '</span>';
          cell.classList.add('cell-error');
        } else {
          // Text/LaTeX path
          let latex = '';
          try { latex = caseval('latex(' + expr + ')').replace(/^"|"$/g, ''); } catch(e) {}
          // GIAC wraps multi-line results (function defs, blocks) in \parbox — KaTeX can't render those
          if (latex && /\\parbox|\\symbol/.test(latex)) { latex = ''; }
          if (latex && typeof katex !== 'undefined') {
            const d = document.createElement('div');
            try {
              katex.render(latex, d, { displayMode: true, throwOnError: false, trust: true });
              out.appendChild(d);
            } catch(e) { out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>'; }
          } else {
            out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>';
          }
          // Show raw result beneath — but not for plot outputs (too verbose)
          if (plotFmt === 'text') {
            const r = document.createElement('div');
            r.className = 'raw-res'; r.textContent = '→ ' + raw;
            out.appendChild(r);
          }
        }
        // Show giac warnings/info messages from the main evaluation only
        renderGiacMessages(out, giacMsgs);
        // Clean up pre-created gl3d canvas if it wasn't used
        if (preGl3dCanvas && preGl3dContainer) {
          preGl3dContainer.remove();
          if (savedModuleCanvas) Module.canvas = savedModuleCanvas;
        }
      }
    } catch (err) {
      out.innerHTML = '<span class="err">' + t('errorPrefix') + ' ' + esc(String(err)) + '</span>';
    }
    cell.classList.remove('running');
    // Hide placeholder if cell is hidden and now has output
    var ph = cell.querySelector('.cell-hidden-placeholder');
    if (ph && out.innerHTML.trim()) ph.style.display = 'none';
  }, 10);
}

function renderTextCell(cellId) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  const ta = cell.querySelector('textarea');
  const out = document.getElementById(cellId + '-output');
  if (!ta || !ta.value.trim()) { out.innerHTML = ''; return; }
  var raw = ta.value;

  // ── @bind directives ──────────────────────────────────────
  // Syntax: @bind(name, min, max, step, value)
  //     or: @bind(name, min, max, step, value, "label")
  var bindDirectives = [];
  var BIND_PH = '\u0003BIND';
  raw = raw.replace(/@bind\(([^)]+)\)/g, function(match, args) {
    var idx = bindDirectives.length;
    var parts = [];
    var remaining = args;
    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (!remaining) break;
      if (remaining[0] === '"') {
        var end = remaining.indexOf('"', 1);
        if (end > 0) {
          parts.push(remaining.substring(1, end));
          remaining = remaining.substring(end + 1).replace(/^\s*,?\s*/, '');
        } else break;
      } else {
        var comma = remaining.indexOf(',');
        if (comma >= 0) {
          parts.push(remaining.substring(0, comma).trim());
          remaining = remaining.substring(comma + 1);
        } else {
          parts.push(remaining.trim());
          remaining = '';
        }
      }
    }
    // parts: [name, min, max, step, value] or [name, min, max, step, value, label]
    if (parts.length >= 5) {
      var labelKey = parts[5] || parts[0];
      bindDirectives.push({
        name: parts[0],
        min: parseFloat(parts[1]),
        max: parseFloat(parts[2]),
        step: parseFloat(parts[3]),
        value: parseFloat(parts[4]),
        label: t(labelKey) || labelKey
      });
    }
    return BIND_PH + idx + BIND_PH;
  });

  // ── LaTeX blocks ──────────────────────────────────────────
  var latexBlocks = [];
  var PH = '\u0002LATEX';
  // Display math $$...$$ (must come before inline $...$)
  raw = raw.replace(/\$\$([\s\S]+?)\$\$/g, function(_, tex) {
    var idx = latexBlocks.length;
    try { latexBlocks.push(katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false, trust: true })); }
    catch(e) { latexBlocks.push('<code>' + esc(tex) + '</code>'); }
    return PH + idx + PH;
  });
  // Inline math $...$
  raw = raw.replace(/\$([^\$\n]+?)\$/g, function(_, tex) {
    var idx = latexBlocks.length;
    try { latexBlocks.push(katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false, trust: true })); }
    catch(e) { latexBlocks.push('<code>' + esc(tex) + '</code>'); }
    return PH + idx + PH;
  });

  // ── Markdown processing ───────────────────────────────────
  let h = esc(raw)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  // Restore LaTeX blocks
  var phRe = new RegExp(PH + '(\\d+)' + PH, 'g');
  h = h.replace(phRe, function(_, idx) { return latexBlocks[parseInt(idx)]; });

  // ── Restore @bind → <slider-param> elements ───────────────
  if (bindDirectives.length > 0) {
    var bindRe = new RegExp(BIND_PH + '(\\d+)' + BIND_PH, 'g');
    h = h.replace(bindRe, function(_, idx) {
      var b = bindDirectives[parseInt(idx)];
      if (!b) return '';
      if (customElements.get('slider-param')) {
        return '</p><slider-param name="' + esc(b.name) + '" label="' + esc(b.label) +
          '" min="' + b.min + '" max="' + b.max + '" step="' + b.step +
          '" value="' + b.value + '"></slider-param><p>';
      }
      // Graceful fallback when Lit.js unavailable
      return '</p><div class="bind-fallback">' + esc(b.label) + ': ' + b.value + '</div><p>';
    });
    // Clean up empty <p></p> tags produced by block-level insertion
    h = h.replace(/<p>\s*<\/p>/g, '');
  }

  out.innerHTML = '<div class="md-out"><p>' + h + '</p></div>';

  // ── Set up @bind event delegation ─────────────────────────
  if (bindDirectives.length > 0) {
    // Remove previous handler if re-rendering
    if (out._bindHandler) {
      out.removeEventListener('slider-change', out._bindHandler);
    }
    out._bindHandler = function(e) {
      var name = e.detail.name;
      var value = e.detail.value;
      // Sync all other slider-param elements bound to the same variable
      document.querySelectorAll('slider-param[name="' + name + '"]').forEach(function(sp) {
        if (sp !== e.target && parseFloat(sp.value) !== value) {
          sp.value = value;
        }
      });
      // Update Giac variable
      try { caseval(name + ':=' + value); } catch(err) { /* ignore */ }
      // Register/update in Observable DAG
      if (typeof registerSliderParam === 'function') {
        registerSliderParam(cellId, name, value);
      }
    };
    out.addEventListener('slider-change', out._bindHandler);

    // Initialize variables with default values
    bindDirectives.forEach(function(b) {
      try { caseval(b.name + ':=' + b.value); } catch(err) { /* ignore */ }
      if (typeof registerSliderParam === 'function') {
        registerSliderParam(cellId, b.name, b.value);
      }
    });

    // Store bind info on cell for export and DAG
    cell._bindDirectives = bindDirectives;
  } else {
    cell._bindDirectives = null;
  }

  // Hide placeholder if cell is hidden and now has output
  var ph = cell.querySelector('.cell-hidden-placeholder');
  if (ph && out.innerHTML.trim()) ph.style.display = 'none';
}
