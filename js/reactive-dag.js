'use strict';

// SECTION 14 — REACTIVE DAG (Observable Runtime)
//
// Dependency tracking and automatic re-evaluation using
// Observable Runtime. Each cell becomes a reactive variable
// in a DAG. When an upstream cell changes, all downstream
// cells re-evaluate automatically in topological order.
// ─────────────────────────────────────────────────────────────

// Known Giac built-in functions and keywords — NOT notebook variables
var GIAC_BUILTINS = new Set([
  'sin','cos','tan','asin','acos','atan','atan2','exp','ln','log','log10',
  'sqrt','abs','ceil','floor','round','sign','max','min','gcd','lcm','mod',
  'pi','e','i','true','false','inf','infinity','undef',
  'solve','fsolve','linsolve','factor','expand','simplify','normal','collect',
  'diff','integrate','limit','sum','product','series','taylor','laplace','ilaplace',
  'matrix','det','eigenvalues','eigenvectors','transpose','inv','rref','rank','ker',
  'plot','plotfunc','plotimplicit','plotfield','plotcontour','plotode','plotseq',
  'plotparam','plotpolar','plotparam3d','plot3d',
  'histogram','barplot','camembert','boxwhisker','scatterplot',
  'circle','segment','point','triangle','line','polygon','arc',
  'seq','rand','randint','randn','sort','size','length','dim','append','remove',
  'evalf','latex','lname','VARS','string','expr','subst','assume','purge',
  'if','then','else','for','while','do','od','fi','proc','return','local',
  'print','input','nops','op','head','tail','map','apply','select','zip',
  're','im','conj','arg','real','imag',
  'irem','iquo','isprime','ifactor','euler','nextprime','prevprime',
  'quo','rem','gcdex','hermite','smith',
  'pmin','pmax','fMin','fMax','extrema','implicitplot'
]);

/** Extract variable definitions (:=) and references from a cell expression.
 *  Uses pure syntactic analysis (regex) — NOT lname() which is state-dependent. */
function extractCellDependencies(expr) {
  var defines = [];
  var references = [];
  if (!expr || !expr.trim()) return { defines: defines, references: references };

  // Extract `:=` assignments (Giac assignment operator)
  var assignRe = /(\w+)\s*:=/g;
  var m;
  while ((m = assignRe.exec(expr)) !== null) {
    if (defines.indexOf(m[1]) === -1) defines.push(m[1]);
  }

  // Extract all identifiers via regex (state-independent)
  var idRe = /\b([a-zA-Z_]\w*)\b/g;
  while ((m = idRe.exec(expr)) !== null) {
    var name = m[1];
    if (!GIAC_BUILTINS.has(name)
        && defines.indexOf(name) === -1
        && references.indexOf(name) === -1
        && !/^\d/.test(name)) {
      references.push(name);
    }
  }

  return { defines: defines, references: references };
}

/** Check if Observable Runtime is available */
function observableAvailable() {
  return window._ObservableRuntime != null && typeof window._ObservableRuntime === 'function';
}

/** Initialize the Observable runtime and module (async — waits for CDN load) */
function initReactiveRuntime() {
  window._observableReady.then(function() {
    if (!observableAvailable()) {
      console.warn('Observable Runtime not loaded — reactive mode disabled');
      reactiveMode = false;
      var toggle = document.getElementById('reactive-toggle');
      if (toggle) { toggle.checked = false; toggle.disabled = true; }
      return;
    }
    try {
      observableRuntime = new window._ObservableRuntime();
      observableModule = observableRuntime.module();
      console.log('Reactive DAG runtime initialized');
    } catch(e) {
      console.error('Failed to init reactive runtime:', e);
      reactiveMode = false;
    }
  });
}

/** Create an Observable observer that renders a cell's output */
function makeCellObserver(cellId) {
  return {
    pending: function() {
      var el = document.getElementById(cellId);
      if (el) el.classList.add('cell-pending');
      var out = document.getElementById(cellId + '-output');
      if (out) out.innerHTML = '<span class="spinner"></span> ' + t('pendingEvaluation');
    },
    fulfilled: function() {
      // Rendering is done inside the define function via scheduleCellRender
      var el = document.getElementById(cellId);
      if (el) el.classList.remove('cell-pending', 'running');
    },
    rejected: function(err) {
      var el = document.getElementById(cellId);
      if (el) { el.classList.remove('cell-pending', 'running'); el.classList.add('cell-error'); }
      var out = document.getElementById(cellId + '-output');
      if (out) {
        var msg = (err && err.message) ? err.message : String(err);
        // Check if it's a dependency error (upstream rejected)
        if (msg.indexOf('RuntimeError') !== -1 || err instanceof Error) {
          out.innerHTML = '<div class="dep-warning cycle">' + t('dependencyError') + ': ' + esc(msg) + '</div>';
        } else {
          out.innerHTML = '<span class="err">' + t('errorPrefix') + ' ' + esc(msg) + '</span>';
        }
      }
    }
  };
}

/** Register a cell in the Observable module */
function registerCell(cellId, expr) {
  if (!observableModule || !expr || !expr.trim()) return null;
  var cell = document.getElementById(cellId);
  if (!cell) return null;

  var deps = extractCellDependencies(expr);
  var definedName = deps.defines.length > 0 ? deps.defines[0] : null;

  // Update DOM data attributes
  cell.dataset.defines = deps.defines.join(',');
  cell.dataset.references = deps.references.join(',');

  // Check for duplicate variable definitions
  deps.defines.forEach(function(varName) {
    var existingOwner = variableOwnerMap.get(varName);
    if (existingOwner && existingOwner !== cellId) {
      showDuplicateWarning(cellId, varName, existingOwner);
    }
    variableOwnerMap.set(varName, cellId);
  });

  // Reuse existing variable instance, or create a new one
  var prev = cellVariableMap.get(cellId);
  var variable;

  // If the defined name changed (e.g. cell was `a:=5` now `b:=10`),
  // we must delete the old variable and create a fresh one.
  var prevName = prev ? (prev.defines && prev.defines[0]) || null : null;
  var nameChanged = prev && prevName !== definedName;

  if (nameChanged && prev && prev.variable) {
    try { prev.variable.delete(); } catch(e) {}
    if (prev.defines) {
      prev.defines.forEach(function(v) {
        if (variableOwnerMap.get(v) === cellId) variableOwnerMap.delete(v);
      });
    }
    deps.defines.forEach(function(v) { variableOwnerMap.set(v, cellId); });
    variable = null; // force creation below
  } else if (prev && prev.variable) {
    variable = prev.variable; // reuse — just redefine
  }

  // Observable variables are LAZY — they only evaluate when observed.
  // We must pass an observer so the runtime actually calls our define function.
  if (!variable) {
    variable = observableModule.variable(makeCellObserver(cellId));
  }

  // Build the definition function that evaluates the expression
  var evalCellId = cellId;
  var evalExpr = expr;
  var evalDefinedName = definedName;

  // Only depend on references that are actually defined by another cell.
  // Symbolic variables (x, y, t…) that no cell defines are NOT Observable inputs.
  var activeInputs = deps.references.filter(function(name) {
    return variableOwnerMap.has(name);
  });

  if (definedName) {
    variable.define(definedName, activeInputs, function() {
      var result = caseval(evalExpr);
      scheduleCellRender(evalCellId, evalExpr, result);
      // Return the assigned value for downstream cells
      try { return caseval(evalDefinedName); } catch(e) { return result; }
    });
  } else {
    // Anonymous cell — observes references but doesn't define a name
    variable.define(null, activeInputs, function() {
      var result = caseval(evalExpr);
      scheduleCellRender(evalCellId, evalExpr, result);
      return result;
    });
  }

  cellVariableMap.set(cellId, {
    variable: variable,
    defines: deps.defines,
    references: deps.references,
    expr: expr
  });

  // When a new variable name is defined, re-register any existing cells
  // that reference it but didn't list it as an Observable input (because
  // it wasn't defined yet when they were first registered).
  if (deps.defines.length > 0) {
    deps.defines.forEach(function(newVar) {
      cellVariableMap.forEach(function(info, otherCellId) {
        if (otherCellId === cellId) return;
        if (info.references && info.references.indexOf(newVar) !== -1) {
          // This cell references our new variable — check if it was wired
          var otherInputs = info.references.filter(function(n) { return variableOwnerMap.has(n); });
          // Re-register if the active inputs have changed
          var prevInputs = info._activeInputs || [];
          if (otherInputs.length !== prevInputs.length || otherInputs.some(function(n, i) { return n !== prevInputs[i]; })) {
            // Schedule re-registration (avoid recursion)
            setTimeout(function() { registerCell(otherCellId, info.expr); }, 0);
          }
        }
      });
    });
  }

  // Store active inputs for change detection
  cellVariableMap.get(cellId)._activeInputs = activeInputs;

  return variable;
}

/** Unregister a cell from the reactive graph */
function unregisterCell(cellId) {
  var info = cellVariableMap.get(cellId);
  if (!info) return;
  if (info.variable) {
    try { info.variable.delete(); } catch(e) {}
  }
  // Clean up variable ownership
  if (info.defines) {
    info.defines.forEach(function(v) {
      if (variableOwnerMap.get(v) === cellId) variableOwnerMap.delete(v);
    });
  }
  cellVariableMap.delete(cellId);
}

/** Update a cell's expression in the reactive graph */
function updateCell(cellId, newExpr) {
  // Re-register with new expression — reuses variable instance to keep
  // downstream wiring intact, triggering automatic cascade via .define()
  return registerCell(cellId, newExpr);
}

/** Render a cell's output after reactive evaluation */
function scheduleCellRender(cellId, expr, rawResult) {
  var cell = document.getElementById(cellId);
  if (!cell) return;
  var out = document.getElementById(cellId + '-output');
  if (!out) return;

  cell.classList.remove('cell-pending', 'cell-error');
  cell.classList.add('running');

  // Clean up previous output
  cleanupJSXGraphInElement(out);
  out.innerHTML = '';

  try {
    // Try direct JSXGraph rendering
    if (jsxGraphAvailable() && tryDirectJSXGraph(expr, out)) {
      // Done
    } else {
      var raw = rawResult;
      var plotFmt = detectPlotFormat(raw);

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
          } catch(e) {}
        }
        if (!jsxDone) renderGr2dPlot(out, raw);
      } else if (plotFmt === 'gl3d') {
        var sceneId = raw.substr(5).trim();
        renderGl3dPlot(out, sceneId);
      } else {
        // Text/LaTeX path
        var latex = '';
        try { latex = caseval('latex(' + expr + ')').replace(/^"|"$/g, ''); } catch(e) {}
        if (latex && typeof katex !== 'undefined') {
          var d = document.createElement('div');
          try {
            katex.render(latex, d, { displayMode: true, throwOnError: false, trust: true });
            out.appendChild(d);
          } catch(e) { out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>'; }
        } else {
          out.innerHTML = '<div class="raw-res">' + esc(raw) + '</div>';
        }
        if (plotFmt === 'text') {
          var r = document.createElement('div');
          r.className = 'raw-res'; r.textContent = '→ ' + raw;
          out.appendChild(r);
        }
      }
    }
  } catch(err) {
    out.innerHTML = '<span class="err">' + t('errorPrefix') + ' ' + esc(String(err)) + '</span>';
    cell.classList.add('cell-error');
  }
  cell.classList.remove('running');
}

/** Show a duplicate variable warning */
function showDuplicateWarning(cellId, varName, existingCellId) {
  var cell = document.getElementById(cellId);
  if (!cell) return;
  var out = document.getElementById(cellId + '-output');
  if (!out) return;
  var warn = document.createElement('div');
  warn.className = 'dep-warning duplicate';
  warn.textContent = t('duplicateVariable') + ': ' + varName + ' (' + existingCellId + ')';
  out.prepend(warn);
}

/** Get upstream cell IDs (transitive) */
function getUpstreamCells(cellId) {
  var result = [];
  var visited = new Set();
  function traverse(id) {
    if (visited.has(id)) return;
    visited.add(id);
    var info = cellVariableMap.get(id);
    if (!info || !info.references) return;
    info.references.forEach(function(varName) {
      var owner = variableOwnerMap.get(varName);
      if (owner && owner !== cellId && result.indexOf(owner) === -1) {
        result.push(owner);
        traverse(owner);
      }
    });
  }
  traverse(cellId);
  return result;
}

/** Get downstream cell IDs (transitive) */
function getDownstreamCells(cellId) {
  var result = [];
  var visited = new Set();
  var info = cellVariableMap.get(cellId);
  if (!info || !info.defines) return result;

  function traverse(defines) {
    defines.forEach(function(varName) {
      cellVariableMap.forEach(function(cellInfo, cid) {
        if (visited.has(cid) || cid === cellId) return;
        if (cellInfo.references && cellInfo.references.indexOf(varName) !== -1) {
          visited.add(cid);
          result.push(cid);
          if (cellInfo.defines) traverse(cellInfo.defines);
        }
      });
    });
  }
  traverse(info.defines);
  return result;
}

/** Highlight dependency cells on focus */
function highlightDeps(cellId) {
  clearDepHighlights();
  getUpstreamCells(cellId).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('dep-upstream');
  });
  getDownstreamCells(cellId).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('dep-downstream');
  });
}

/** Clear all dependency highlights */
function clearDepHighlights() {
  document.querySelectorAll('.dep-upstream').forEach(function(el) { el.classList.remove('dep-upstream'); });
  document.querySelectorAll('.dep-downstream').forEach(function(el) { el.classList.remove('dep-downstream'); });
}

/** Mark downstream cells as pending before cascade */
function markDownstreamPending(cellId) {
  getDownstreamCells(cellId).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.classList.add('cell-pending');
      var out = document.getElementById(id + '-output');
      if (out) out.innerHTML = '<span class="spinner"></span> ' + t('pendingEvaluation');
    }
  });
}

/** Toggle reactive mode */
function toggleReactiveMode(enabled) {
  reactiveMode = enabled;
  var toggle = document.getElementById('reactive-toggle');
  if (toggle) toggle.checked = enabled;

  // Remove any existing reactive banner
  var oldBanner = document.getElementById('reactive-banner');
  if (oldBanner) oldBanner.remove();

  if (enabled) {
    // Show consent banner — do NOT auto-register/evaluate cells
    var notebook = document.getElementById('notebook');
    var banner = document.createElement('div');
    banner.id = 'reactive-banner';
    banner.className = 'stale-banner';
    banner.innerHTML = '<span>' + t('reactiveReady') + '</span>' +
      '<button onclick="runAllReactive()">' + t('runAllReactive') + '</button>' +
      '<button onclick="toggleReactiveMode(false)">' + t('cancelCascade') + '</button>';
    notebook.parentNode.insertBefore(banner, notebook);
  } else {
    // Switching to manual mode — dispose Observable runtime state
    if (observableModule) {
      cellVariableMap.forEach(function(entry) {
        try { entry.variable.delete(); } catch(e) {}
      });
      cellVariableMap.clear();
      variableOwnerMap.clear();
    }
    if (observableRuntime) {
      try { observableRuntime.dispose(); } catch(e) {}
      observableRuntime = null;
      observableModule = null;
    }
  }
}

/** Run all cells in reactive mode — builds the DAG and evaluates */
function runAllReactive() {
  // Remove the consent banner
  var banner = document.getElementById('reactive-banner');
  if (banner) banner.remove();

  // Initialize Observable runtime if needed
  window._observableReady.then(function() {
    if (!observableAvailable()) {
      reactiveMode = false;
      var tog = document.getElementById('reactive-toggle');
      if (tog) tog.checked = false;
      // Fall back to sequential run
      cells.forEach(function(c) { runSingleCell(c.id); });
      return;
    }
    if (!observableModule) {
      try {
        observableRuntime = new window._ObservableRuntime();
        observableModule = observableRuntime.module();
      } catch(e) {
        reactiveMode = false;
        var tog = document.getElementById('reactive-toggle');
        if (tog) tog.checked = false;
        cells.forEach(function(c) { runSingleCell(c.id); });
        return;
      }
    }
    // Register all cells in the DAG — Observable will evaluate them
    cells.forEach(function(c) {
      if (c.type !== 'text') {
        var expr = getXcasExpr(c.id);
        if (expr) registerCell(c.id, expr);
      }
    });
  });
}
