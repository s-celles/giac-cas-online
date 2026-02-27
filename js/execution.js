'use strict';

// SECTION 8 — EXECUTION
// ─────────────────────────────────────────────────────────────

function getXcasExpr(cellId) {
  const cell = document.getElementById(cellId);
  if (!cell || cell.dataset.type === 'text') return '';
  const mode = cell.dataset.mode || cell.dataset.type;
  if (cell.dataset.type === 'raw' || mode === 'raw') {
    return cell.querySelector('textarea')?.value.trim() || '';
  }
  const mf = cell.querySelector('math-field');
  return mf ? latexToXcas(mf.value) : '';
}

function runSingleCell(cellId, forceManual) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  if (cell.dataset.type === 'text') { renderTextCell(cellId); return; }

  const expr = getXcasExpr(cellId);
  const out  = document.getElementById(cellId + '-output');
  if (!expr) { out.innerHTML = ''; return; }
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
            var pcw = Math.min(out.clientWidth || 600, 600);
            preGl3dCanvas.width = pcw;
            preGl3dCanvas.height = Math.round(pcw * 2 / 3);
            preGl3dContainer.appendChild(preGl3dCanvas);
            out.appendChild(preGl3dContainer);
            savedModuleCanvas = Module.canvas;
            Module.canvas = preGl3dCanvas;
          }
        }

        // Fall back to caseval + format-based pipeline
        const raw = caseval(expr);
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
        } else {
          // Text/LaTeX path
          let latex = '';
          try { latex = caseval('latex(' + expr + ')').replace(/^"|"$/g, ''); } catch(e) {}
          if (latex && typeof katex !== 'undefined') {
            const d = document.createElement('div');
            try {
              katex.render(latex, d, { displayMode: true, throwOnError: false, trust: true });
              out.appendChild(d);
            } catch(e) { out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>'; }
          } else {
            out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>';
          }
        }
        // Show raw result beneath — but not for plot outputs (too verbose)
        if (plotFmt === 'text') {
          const r = document.createElement('div');
          r.className = 'raw-res'; r.textContent = '→ ' + raw;
          out.appendChild(r);
        }
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
  }, 10);
}

function renderTextCell(cellId) {
  const cell = document.getElementById(cellId);
  if (!cell) return;
  const ta = cell.querySelector('textarea');
  const out = document.getElementById(cellId + '-output');
  if (!ta || !ta.value.trim()) { out.innerHTML = ''; return; }
  let h = esc(ta.value)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  out.innerHTML = '<div class="md-out"><p>' + h + '</p></div>';
}
