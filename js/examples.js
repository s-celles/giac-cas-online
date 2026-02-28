'use strict';

// ─────────────────────────────────────────────────────────────
// EXAMPLE NOTEBOOK LIBRARY
//
// Text cells use i18n keys (resolved at load time via t()).
// Math/raw cells are language-independent.
//
// Individual notebook data is loaded on demand from examples/*.json
// ─────────────────────────────────────────────────────────────

var EXAMPLES = [
  { id: 'arithmetic',            i18nName: 'exampleArithmetic' },
  { id: 'algebra',               i18nName: 'exampleAlgebra' },
  { id: 'calculus',              i18nName: 'exampleCalculus' },
  { id: 'sums-series',           i18nName: 'exampleSumsSeries' },
  { id: 'fourier-series',        i18nName: 'exampleFourier' },
  { id: 'linear-algebra',        i18nName: 'exampleLinearAlgebra' },
  { id: 'plots',                 i18nName: 'examplePlots' },
  { id: 'reactive-dag',          i18nName: 'exampleReactive' },
  { id: 'quadratic-equation',    i18nName: 'exampleQuadratic' },
  { id: '3d-surface',             i18nName: 'example3dSurface' },
  { id: '3d-parametric',          i18nName: 'example3dParametric' },
  { id: '3d-curve',                i18nName: 'example3dCurve' },
  { id: '3d-sliders',             i18nName: 'example3dSliders' },
  { id: '3d-vectorfield',        i18nName: 'example3dVectorfield' },
  { id: 'amplitude-modulation',  i18nName: 'exampleAM' },
  { id: 'frequency-modulation',  i18nName: 'exampleFM' },
  { id: 'physics-mechanics',     i18nName: 'exampleMechanics' },
  { id: 'physics-waves',         i18nName: 'exampleWaves' },
  { id: 'signal-processing',     i18nName: 'exampleSignal' },
  { id: 'programming',           i18nName: 'exampleProgramming' },
  { id: 'full-demo',             i18nName: 'exampleFullDemo' }
];

function loadExample(id) {
  if (cells.length > 0 && !confirm(t('loadExampleConfirm'))) return;
  hideExamplesMenu();

  fetch('examples/' + id + '.json')
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
  EXAMPLES.forEach(function(ex) {
    var btn = document.createElement('button');
    btn.textContent = t(ex.i18nName);
    btn.onclick = function() { loadExample(ex.id); };
    menu.appendChild(btn);
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
