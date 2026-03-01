'use strict';

// ─────────────────────────────────────────────────────────────
// EXAMPLE NOTEBOOK LIBRARY
//
// Text cells use i18n keys (resolved at load time via t()).
// Math/raw cells are language-independent.
//
// Individual notebook data is loaded on demand from examples/<kernel>/*.json
// ─────────────────────────────────────────────────────────────

var EXAMPLES = [
  // GIAC JS examples
  { id: 'arithmetic',            i18nName: 'exampleArithmetic',       kernel: 'giac-js' },
  { id: 'algebra',               i18nName: 'exampleAlgebra',          kernel: 'giac-js' },
  { id: 'calculus',              i18nName: 'exampleCalculus',         kernel: 'giac-js' },
  { id: 'sums-series',           i18nName: 'exampleSumsSeries',       kernel: 'giac-js' },
  { id: 'fourier-series',        i18nName: 'exampleFourier',          kernel: 'giac-js' },
  { id: 'linear-algebra',        i18nName: 'exampleLinearAlgebra',    kernel: 'giac-js' },
  { id: 'plots',                 i18nName: 'examplePlots',            kernel: 'giac-js' },
  { id: 'reactive-dag',          i18nName: 'exampleReactive',         kernel: 'giac-js' },
  { id: 'quadratic-equation',    i18nName: 'exampleQuadratic',        kernel: 'giac-js' },
  { id: '3d-surface',            i18nName: 'example3dSurface',        kernel: 'giac-js' },
  { id: '3d-parametric',         i18nName: 'example3dParametric',     kernel: 'giac-js' },
  { id: '3d-curve',              i18nName: 'example3dCurve',          kernel: 'giac-js' },
  { id: '3d-sliders',            i18nName: 'example3dSliders',        kernel: 'giac-js' },
  { id: '3d-vectorfield',        i18nName: 'example3dVectorfield',    kernel: 'giac-js' },
  { id: 'amplitude-modulation',  i18nName: 'exampleAM',              kernel: 'giac-js' },
  { id: 'frequency-modulation',  i18nName: 'exampleFM',              kernel: 'giac-js' },
  { id: 'physics-mechanics',     i18nName: 'exampleMechanics',        kernel: 'giac-js' },
  { id: 'physics-waves',         i18nName: 'exampleWaves',            kernel: 'giac-js' },
  { id: 'signal-processing',     i18nName: 'exampleSignal',           kernel: 'giac-js' },
  { id: 'programming',           i18nName: 'exampleProgramming',      kernel: 'giac-js' },
  { id: 'full-demo',             i18nName: 'exampleFullDemo',         kernel: 'giac-js' },
  // Compute Engine examples
  { id: 'basic-algebra',         i18nName: 'ceExampleAlgebra',        kernel: 'compute-engine' },
  { id: 'calculus',              i18nName: 'ceExampleCalculus',       kernel: 'compute-engine' },
  { id: 'simplification',        i18nName: 'ceExampleSimplification', kernel: 'compute-engine' }
];

function loadExample(id, kernel) {
  if (cells.length > 0 && !confirm(t('loadExampleConfirm'))) return;
  hideExamplesMenu();

  // Set the kernel before loading (FR-009)
  if (kernel && typeof KernelRegistry !== 'undefined') {
    KernelRegistry.setActive(kernel);
  }

  var dir = kernel || 'giac-js';
  fetch('examples/' + dir + '/' + id + '.json?v=' + Date.now())
    .then(function(res) {
      if (!res.ok) throw new Error('Failed to load example: ' + res.status);
      return res.json();
    })
    .then(function(data) {
      // Resolve i18n keys in text cells; append @bind suffix if present
      data.cells.forEach(function(item) {
        if (item.i18n) {
          item.content = t(item.i18n) + (item.suffix || '');
          delete item.i18n;
          delete item.suffix;
        }
      });
      // If example has @bind directives, wait for Lit.js slider-param component
      var hasBinds = data.cells.some(function(c) {
        return c.type === 'text' && c.content && c.content.indexOf('@bind(') >= 0;
      });
      function doLoad() {
        try {
          loadNotebookData(data);
        } catch (err) {
          console.error('Failed to load example:', err);
          alert(err.message);
        }
      }
      if (hasBinds && window._litReady) {
        window._litReady.then(doLoad);
      } else {
        doLoad();
      }
    })
    .catch(function(err) {
      console.error('Failed to fetch example:', err);
      alert(t('errorPrefix') + ' ' + err.message);
    });
}

function showExamplesMenu() {
  var existing = document.getElementById('examples-menu');
  if (existing) { hideExamplesMenu(); return; }
  var menu = document.createElement('div');
  menu.id = 'examples-menu';
  menu.className = 'examples-menu';

  // Group examples by kernel
  var groups = {};
  EXAMPLES.forEach(function(ex) {
    var k = ex.kernel || 'giac-js';
    if (!groups[k]) groups[k] = [];
    groups[k].push(ex);
  });

  // Render grouped menu with section headings
  var kernelOrder = ['giac-js', 'compute-engine'];
  kernelOrder.forEach(function(kernelId) {
    var items = groups[kernelId];
    if (!items || items.length === 0) return;

    // Section heading
    var heading = document.createElement('div');
    heading.className = 'examples-menu-heading';
    heading.textContent = typeof t === 'function' ?
      (kernelId === 'giac-js' ? t('kernelGiac') : t('kernelComputeEngine')) :
      kernelId;
    menu.appendChild(heading);

    items.forEach(function(ex) {
      var btn = document.createElement('button');
      btn.textContent = t(ex.i18nName);
      btn.onclick = function() { loadExample(ex.id, ex.kernel); };
      menu.appendChild(btn);
    });
  });

  var anchor = document.getElementById('examples-btn');
  if (anchor) {
    anchor.parentNode.style.position = 'relative';
    anchor.parentNode.appendChild(menu);
  }
  setTimeout(function() {
    document.addEventListener('click', _closeExamplesMenu);
  }, 0);
}

function hideExamplesMenu() {
  var menu = document.getElementById('examples-menu');
  if (menu) menu.remove();
  document.removeEventListener('click', _closeExamplesMenu);
}

function _closeExamplesMenu(e) {
  var menu = document.getElementById('examples-menu');
  var btn = document.getElementById('examples-btn');
  if (menu && !menu.contains(e.target) && e.target !== btn) {
    hideExamplesMenu();
  }
}
