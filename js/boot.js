'use strict';

// SECTION 12 — BOOT
// ─────────────────────────────────────────────────────────────

var APP_VERSION = '0.1.0';

/** Set up MathLive virtual keyboard layouts with localized tooltips */
function setupMathKeyboard() {
  if (typeof mathVirtualKeyboard === 'undefined') return;
  mathVirtualKeyboard.layouts = [
    "numeric",
    {
      label: "½",
      tooltip: t('kbFractions'),
      rows: [
        [
          { latex: "\\frac{#@}{#?}", label: "<span><sup>a</sup>⁄<sub>b</sub></span>", tooltip: t('kbFraction') },
          { latex: "\\frac{1}{2}", label: "½", tooltip: t('kbHalf') },
          { latex: "\\frac{1}{3}", label: "⅓", tooltip: t('kbThird') },
          { latex: "\\frac{1}{4}", label: "¼", tooltip: t('kbQuarter') },
          { latex: "\\frac{d}{dx}", label: "<span style='font-size:.85em'>d/dx</span>", tooltip: t('kbDerivative') },
          { latex: "\\frac{\\partial}{\\partial x}", label: "∂/∂x", tooltip: t('kbPartialDeriv') },
          { class: "separator w5" },
          { latex: "\\sqrt{#@}", label: "√", tooltip: t('kbSqrt') },
          { latex: "\\sqrt[3]{#@}", label: "∛", tooltip: t('kbCubeRoot') },
          { latex: "\\sqrt[n]{#@}", label: "<span><sup>n</sup>√</span>", tooltip: t('kbNthRoot') }
        ],
        [
          { latex: "#@^{#?}", label: "<span>x<sup>□</sup></span>", tooltip: t('kbExponent') },
          { latex: "#@^{2}", label: "<span>x<sup>2</sup></span>", tooltip: t('kbSquare') },
          { latex: "#@^{3}", label: "<span>x<sup>3</sup></span>", tooltip: t('kbCube') },
          { latex: "#@^{n}", label: "<span>x<sup>n</sup></span>", tooltip: t('kbPowerN') },
          { latex: "#@^{-1}", label: "<span>x<sup>−1</sup></span>", tooltip: t('kbInverse') },
          { latex: "#@_{#?}", label: "<span>x<sub>□</sub></span>", tooltip: t('kbSubscript') },
          { latex: "#@^{#?}_{#?}", label: "<span>x<sup>□</sup><sub>□</sub></span>", tooltip: t('kbExponentSubscript') },
          { class: "separator w5" },
          { latex: "\\left(#@\\right)", label: "( )", tooltip: t('kbParentheses') },
          { latex: "\\left[#@\\right]", label: "[ ]", tooltip: t('kbBrackets') }
        ],
        [
          { latex: "\\sin", label: "sin" },
          { latex: "\\cos", label: "cos" },
          { latex: "\\tan", label: "tan" },
          { latex: "\\arcsin", label: "<span style='font-size:.8em'>arcsin</span>" },
          { latex: "\\arccos", label: "<span style='font-size:.8em'>arccos</span>" },
          { latex: "\\arctan", label: "<span style='font-size:.8em'>arctan</span>" },
          { class: "separator w5" },
          { latex: "\\ln", label: "ln" },
          { latex: "\\log", label: "log" },
          { latex: "\\exp", label: "exp" }
        ],
        [
          "[undo]", "[redo]",
          { class: "separator w5" },
          "[left]", "[right]", "[up]", "[down]",
          { class: "separator w5" },
          "[backspace]", "[return]"
        ]
      ]
    },
    {
      label: "∫",
      tooltip: t('kbOperators'),
      rows: [
        [
          { latex: "\\int", label: "∫", tooltip: t('kbIndefiniteIntegral') },
          { latex: "\\int_{#?}^{#?}", label: "<span>∫<sup>b</sup><sub>a</sub></span>", tooltip: t('kbDefiniteIntegral') },
          { latex: "\\iint", label: "∬", tooltip: t('kbDoubleIntegral') },
          { latex: "\\iiint", label: "∭", tooltip: t('kbTripleIntegral') },
          { latex: "\\oint", label: "∮", tooltip: t('kbLineIntegral') },
          { class: "separator w5" },
          { latex: "\\sum", label: "∑", tooltip: t('kbSum') },
          { latex: "\\sum_{k=1}^{n}", label: "<span>∑<sup>n</sup><sub>k=1</sub></span>", tooltip: t('kbBoundedSum') },
          { latex: "\\prod_{k=1}^{n}", label: "<span>∏<sup>n</sup><sub>k=1</sub></span>", tooltip: t('kbBoundedProduct') },
          { latex: "\\lim_{#?\\to #?}#?", label: "lim", tooltip: t('kbLimit') }
        ],
        [
          { latex: "\\leq", label: "≤" },
          { latex: "\\geq", label: "≥" },
          { latex: "\\neq", label: "≠" },
          { latex: "\\approx", label: "≈" },
          { latex: "\\equiv", label: "≡" },
          { latex: "\\pm", label: "±" },
          { latex: "\\times", label: "×" },
          { latex: "\\div", label: "÷" },
          { latex: "\\cdot", label: "·" },
          { latex: "\\infty", label: "∞" }
        ],
        [
          { latex: "\\mathbb{R}", label: "ℝ", tooltip: t('kbReals') },
          { latex: "\\mathbb{N}", label: "ℕ", tooltip: t('kbNaturals') },
          { latex: "\\mathbb{Z}", label: "ℤ", tooltip: t('kbIntegers') },
          { latex: "\\mathbb{Q}", label: "ℚ", tooltip: t('kbRationals') },
          { class: "separator w5" },
          { latex: "\\in", label: "∈" },
          { latex: "\\notin", label: "∉" },
          { latex: "\\subset", label: "⊂" },
          { latex: "\\cup", label: "∪" },
          { latex: "\\cap", label: "∩" }
        ],
        [
          { latex: "\\to", label: "→" },
          { latex: "\\Rightarrow", label: "⇒" },
          { latex: "\\Leftrightarrow", label: "⟺" },
          { latex: "\\forall", label: "∀", tooltip: t('kbForAll') },
          { latex: "\\exists", label: "∃", tooltip: t('kbExists') },
          { latex: "\\land", label: "∧", tooltip: t('kbLogicalAnd') },
          { latex: "\\lor", label: "∨", tooltip: t('kbLogicalOr') },
          { latex: "\\neg", label: "¬", tooltip: t('kbNegation') },
          { class: "separator w5" },
          "[undo]", "[backspace]"
        ]
      ]
    },
    "alphabetic",
    "greek"
  ];
}

/** Show About dialog */
function showAboutDialog() {
  if (document.getElementById('about-overlay')) return;
  var libs = [
    { name: 'Giac/Xcas', author: 'Bernard Parisse', license: 'GPL-3.0', url: 'https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac.html' },
    { name: 'MathLive', author: 'Arno Gourdol', license: 'MIT', url: 'https://mathlive.io/' },
    { name: 'CortexJS Compute Engine', author: 'Arno Gourdol', license: 'MIT', url: 'https://cortexjs.io/compute-engine/' },
    { name: 'KaTeX', author: 'Khan Academy', license: 'MIT', url: 'https://katex.org/' },
    { name: 'JSXGraph', author: 'Alfred Wassermann et al.', license: 'LGPL/MIT', url: 'https://jsxgraph.org/' },
    { name: 'Observable Runtime', author: 'Observable Inc.', license: 'ISC', url: 'https://github.com/observablehq/runtime' },
    { name: 'Lit', author: 'Google', license: 'BSD-3-Clause', url: 'https://lit.dev/' }
  ];
  var rows = libs.map(function(l) {
    return '<tr><td><a href="' + l.url + '" target="_blank" rel="noopener">' + l.name + '</a></td><td>' + l.author + '</td><td>' + l.license + '</td></tr>';
  }).join('');
  var overlay = document.createElement('div');
  overlay.id = 'about-overlay';
  overlay.className = 'about-overlay';
  overlay.innerHTML =
    '<div class="about-dialog">' +
      '<button class="about-close" onclick="hideAboutDialog()">&times;</button>' +
      '<h2>' + t('aboutTitle') + '</h2>' +
      '<p class="about-version">v' + APP_VERSION + '</p>' +
      '<p class="about-author">' + t('aboutAuthor') + '</p>' +
      '<p>' + t('aboutDesc') + '</p>' +
      '<h3>' + t('aboutLibraries') + '</h3>' +
      '<table><thead><tr><th>' + t('aboutColLib') + '</th><th>' + t('aboutColAuthor') + '</th><th>' + t('aboutColLicense') + '</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<h3>' + t('aboutCredits') + '</h3>' +
      '<p>' + t('aboutKeyboardCredit') + '</p>' +
      '<h3>' + t('aboutLicense') + '</h3>' +
      '<p>' + t('aboutLicenseText') + '</p>' +
    '</div>';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) hideAboutDialog();
  });
  document.body.appendChild(overlay);
  document.addEventListener('keydown', _aboutEscHandler);
}
function hideAboutDialog() {
  var el = document.getElementById('about-overlay');
  if (el) el.remove();
  document.removeEventListener('keydown', _aboutEscHandler);
}
function _aboutEscHandler(e) {
  if (e.key === 'Escape') hideAboutDialog();
}

document.addEventListener('DOMContentLoaded', () => {
  setLocale(detectLocale());
  initGiac();

  // Custom virtual keyboard layouts (inspired by B. Parisse's math2d.html)
  setupMathKeyboard();

  // Minimal default notebook: just a welcome cell
  addCell('text', '', t('welcomeTitle') + '\n\n' + t('welcomeBody'), null, 'welcomeTitle,welcomeBody', { hidden: true });
  cells.forEach(function(c) { if (c.type === 'text') renderTextCell(c.id); });

  // Global keyboard shortcut for report view toggle
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
      e.preventDefault();
      toggleReportView();
    }
  });

  // Show reactive consent banner on boot (reactive mode is default)
  var notebook = document.getElementById('notebook');
  var banner = document.createElement('div');
  banner.id = 'reactive-banner';
  banner.className = 'stale-banner';
  banner.innerHTML = '<span>' + t('reactiveReady') + '</span>' +
    '<button onclick="runAllReactive()">' + t('runAllReactive') + '</button>' +
    '<button onclick="toggleReactiveMode(false)">' + t('cancelCascade') + '</button>';
  notebook.parentNode.insertBefore(banner, notebook);
});
