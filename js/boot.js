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
    {
      label: "ℒ𝒵",
      tooltip: t('kbPhysicsSignal'),
      rows: [
        [
          { latex: "\\operatorname{laplace}(#?)", label: "ℒ", tooltip: t('kbLaplace') },
          { latex: "\\operatorname{ilaplace}(#?)", label: "ℒ⁻¹", tooltip: t('kbInverseLaplace') },
          { latex: "\\operatorname{ztrans}(#?)", label: "𝒵", tooltip: t('kbZTransform') },
          { latex: "\\operatorname{invztrans}(#?)", label: "𝒵⁻¹", tooltip: t('kbInverseZTransform') },
          { latex: "\\operatorname{fourier}(#?)", label: "ℱ", tooltip: t('kbFourier') },
          { latex: "\\operatorname{ifourier}(#?)", label: "ℱ⁻¹", tooltip: t('kbInverseFourier') },
          { class: "separator w5" },
          { latex: "H(s)=\\frac{#?}{#?}", label: "H(s)", tooltip: t('kbTransferFunctionS') },
          { latex: "H(z)=\\frac{#?}{#?}", label: "H(z)", tooltip: t('kbTransferFunctionZ') }
        ],
        [
          { latex: "c", label: "c", tooltip: t('kbSpeedOfLight') },
          { latex: "\\hbar", label: "ℏ", tooltip: t('kbPlanckConstant') },
          { latex: "k_B", label: "kB", tooltip: t('kbBoltzmannConstant') },
          { latex: "G", label: "G", tooltip: t('kbGravitationalConstant') },
          { latex: "e", label: "e", tooltip: t('kbElementaryCharge') },
          { class: "separator w5" },
          { latex: "\\operatorname{Heaviside}(#?)", label: "H(t)", tooltip: t('kbHeaviside') },
          { latex: "\\operatorname{Dirac}(#?)", label: "δ(t)", tooltip: t('kbDirac') }
        ],
        [
          { latex: "\\nabla", label: "∇", tooltip: t('kbNabla') },
          { latex: "\\operatorname{div}(#?)", label: "div", tooltip: t('kbDivergence') },
          { latex: "\\operatorname{curl}(#?)", label: "curl", tooltip: t('kbCurl') },
          { latex: "\\Delta", label: "Δ", tooltip: t('kbLaplacian') },
          { class: "separator w5" },
          { latex: "\\operatorname{fourier\\_an}(#?)", label: "aₙ", tooltip: t('kbFourierAn') },
          { latex: "\\operatorname{fourier\\_bn}(#?)", label: "bₙ", tooltip: t('kbFourierBn') },
          { latex: "\\operatorname{fourier\\_cn}(#?)", label: "cₙ", tooltip: t('kbFourierCn') }
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
    "alphabetic",
    "greek"
  ];
}

/** Show About dialog */
function showAboutDialog() {
  if (document.getElementById('about-overlay')) return;
  var libs = [
    { name: 'Giac', author: 'Bernard Parisse', license: 'GPL-3.0', url: 'https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac.html' },
    { name: 'MathLive', author: 'Arno Gourdol', license: 'MIT', url: 'https://mathlive.io/' },
    { name: 'CortexJS Compute Engine', author: 'Arno Gourdol', license: 'MIT', url: 'https://cortexjs.io/compute-engine/' },
    { name: 'KaTeX', author: 'Khan Academy', license: 'MIT', url: 'https://katex.org/' },
    { name: 'JSXGraph', author: 'Alfred Wassermann et al.', license: 'LGPL/MIT', url: 'https://jsxgraph.org/' },
    { name: 'Observable Runtime', author: 'Observable Inc.', license: 'ISC', url: 'https://github.com/observablehq/runtime' },
    { name: 'Lit', author: 'Google', license: 'BSD-3-Clause', url: 'https://lit.dev/' },
    { name: '@cheprasov/qrcode', author: 'Alexander Cheprasov', license: 'MIT', url: 'https://github.com/cheprasov/js-qrcode' }
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
      '<h3>' + t('aboutShareQR') + '</h3>' +
      '<div class="about-qr"><div id="about-qr-container" onclick="showQRFullscreen()" style="cursor:pointer" title="' + t('clickToEnlarge') + '"></div><p class="about-qr-url">' + location.href + '</p></div>' +
      '<div class="about-share-buttons">' +
        (navigator.share ? '<button class="share-primary" onclick="aboutNativeShare()" title="' + t('shareNative') + '">📤 ' + t('shareNative') + '</button>' : '') +
        '<button onclick="aboutCopyLink()" id="about-copy-btn" title="' + t('shareCopy') + '">📋 ' + t('shareCopy') + '</button>' +
        '<a href="mailto:?subject=CAScad&body=' + encodeURIComponent(location.href) + '" title="Email">✉️ Email</a>' +
        '<a href="https://wa.me/?text=' + encodeURIComponent('CAScad ' + location.href) + '" target="_blank" rel="noopener" title="WhatsApp">💬 WhatsApp</a>' +
        '<a href="https://t.me/share/url?url=' + encodeURIComponent(location.href) + '&text=CAScad" target="_blank" rel="noopener" title="Telegram">➤ Telegram</a>' +
        '<a href="https://x.com/intent/tweet?url=' + encodeURIComponent(location.href) + '&text=CAScad" target="_blank" rel="noopener" title="X">𝕏 X</a>' +
        '<a href="https://bsky.app/intent/compose?text=' + encodeURIComponent('CAScad ' + location.href) + '" target="_blank" rel="noopener" title="Bluesky">🦋 Bluesky</a>' +
        '<a href="https://mastodonshare.com/?text=' + encodeURIComponent('CAScad ' + location.href) + '" target="_blank" rel="noopener" title="Mastodon">🐘 Mastodon</a>' +
        '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(location.href) + '" target="_blank" rel="noopener" title="LinkedIn">💼 LinkedIn</a>' +
        '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(location.href) + '" target="_blank" rel="noopener" title="Facebook">👤 Facebook</a>' +
        '<a href="https://www.reddit.com/submit?url=' + encodeURIComponent(location.href) + '&title=CAScad" target="_blank" rel="noopener" title="Reddit">🔗 Reddit</a>' +
      '</div>' +
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
  // Generate QR code SVG via @cheprasov/qrcode (ESM)
  import('https://cdn.jsdelivr.net/npm/@cheprasov/qrcode/+esm').then(function(mod) {
    var lib = mod.default || mod;
    var QRCodeSVG = lib.QRCodeSVG || mod.QRCodeSVG;
    if (!QRCodeSVG) { console.warn('QRCodeSVG not found in module:', Object.keys(mod), Object.keys(lib)); return; }
    var qr = new QRCodeSVG(location.href, { level: 'M' });
    var container = document.getElementById('about-qr-container');
    if (container) container.innerHTML = qr.toString();
  }).catch(function(e) { console.warn('QR code generation failed:', e); });
  document.addEventListener('keydown', _aboutEscHandler);
}
function aboutCopyLink() {
  navigator.clipboard.writeText(location.href).then(function() {
    var btn = document.getElementById('about-copy-btn');
    if (btn) { btn.textContent = '✓ ' + t('shareCopied'); setTimeout(function() { btn.textContent = '📋 ' + t('shareCopy'); }, 2000); }
  });
}
function aboutNativeShare() {
  navigator.share({ title: 'CAScad', url: location.href }).catch(function() {});
}
function showQRFullscreen() {
  var src = document.getElementById('about-qr-container');
  if (!src || !src.querySelector('svg')) return;
  var overlay = document.createElement('div');
  overlay.className = 'qr-fullscreen-overlay';
  overlay.innerHTML = '<div class="qr-fullscreen-content">' + src.innerHTML + '</div>';
  overlay.onclick = function() { overlay.remove(); };
  document.body.appendChild(overlay);
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

  // Initialize kernel registry — restore default kernel from localStorage
  defaultKernel = localStorage.getItem('cascad-default-kernel') || 'giac-js';
  currentKernel = defaultKernel;
  // Set active kernel (if available, otherwise stays on first registered)
  var defKernel = KernelRegistry.get(defaultKernel);
  if (defKernel && defKernel.available) {
    KernelRegistry.setActive(defaultKernel, { silent: true });
  }

  // Detect Compute Engine availability and update kernel selector
  (function() {
    var ceKernel = KernelRegistry.get('compute-engine');
    var sel = document.getElementById('kernel-select');
    if (ceKernel) {
      try {
        if (typeof ComputeEngine !== 'undefined' && typeof ce !== 'undefined') {
          ceKernel.available = true;
        }
      } catch(e) {}
      // Update selector option state
      if (sel) {
        var opt = sel.querySelector('option[value="compute-engine"]');
        if (opt) {
          if (!ceKernel.available) {
            opt.disabled = true;
            opt.textContent = (typeof t === 'function' ? t('kernelComputeEngine') : 'Compute Engine') + ' (' + (typeof t === 'function' ? t('kernelUnavailable') : 'unavailable') + ')';
          }
        }
      }
      // If user preferred CE and it's now available, activate it
      if (defaultKernel === 'compute-engine' && ceKernel.available) {
        KernelRegistry.setActive('compute-engine', { silent: true });
      }
    }
  })();

  initGiac();

  // Show Share button only when Web Share API is available
  if (navigator.share) {
    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.style.display = '';
  }

  // Custom virtual keyboard layouts (inspired by B. Parisse's math2d.html)
  setupMathKeyboard();

  // Check if URL contains a shared notebook (#nb= or #nbe=)
  var loadedFromURL = (typeof loadFromURLHash === 'function') && loadFromURLHash();

  if (!loadedFromURL) {
    // Minimal default notebook: logo + welcome cell
    addCell('text', '', '![CAScad](assets/CAScad.png)', null, null, { hidden: true });
    addCell('text', '', t('welcomeTitle') + '\n\n' + t('welcomeBody'), null, 'welcomeTitle,welcomeBody', { hidden: true });
    cells.forEach(function(c) { if (c.type === 'text') renderTextCell(c.id); });
  }

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
