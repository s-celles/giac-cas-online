'use strict';

// SECTION 12 — BOOT
// ─────────────────────────────────────────────────────────────

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

document.addEventListener('DOMContentLoaded', () => {
  setLocale(detectLocale());
  initGiac();

  // Custom virtual keyboard layouts (inspired by B. Parisse's math2d.html)
  setupMathKeyboard();

  // Demo cells (i18n-bound: content refreshes when locale changes)
  addCell('text', '', t('welcomeTitle') + '\n\n' + t('welcomeBody'), null, 'welcomeTitle,welcomeBody');

  // Reactive DAG demo cells
  addCell('raw', '', 'p := 5');
  addCell('raw', '', 'p^2');
  addCell('raw', '', 'q := p + 3');

  addCell('math', '\\frac{x^4-1}{x^2+1}');
  addCell('math', '\\int \\frac{1}{x^2+1}\\, dx');
  addCell('math', '\\frac{d}{dx}\\left(\\sin(x)\\cdot e^x\\right)');
  addCell('math', '\\lim_{x \\to 0} \\frac{\\sin(x)}{x}');

  // Finite sums and products
  addCell('math', '\\sum_{k=1}^{n} k');
  addCell('math', '\\prod_{k=1}^{n} k');
  addCell('math', '\\sum_{k=1}^{10} k^2');
  addCell('math', '\\prod_{k=1}^{5} k');
  addCell('math', '\\sum_{k=1}^{100} \\frac{1}{k^2}');
  addCell('math', '\\prod_{k=1}^{8} k');

  // Infinite sums
  addCell('math', '\\sum_{n=1}^{\\infty} \\frac{1}{n^2}');
  addCell('math', '\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{2n+1}');
  addCell('math', '\\sum_{n=0}^{\\infty} \\frac{x^n}{n!}');

  // One-sided limits
  addCell('math', '\\lim_{x \\to 0^-} \\frac{1}{x}');
  addCell('math', '\\lim_{x \\to 0^+} \\frac{1}{x}');
  addCell('math', '\\lim_{x \\to 0^-} \\frac{|x|}{x}');
  addCell('math', '\\lim_{x \\to 0^+} \\frac{|x|}{x}');

  // Matrix demo cells (math-type: entered via MathLive visual editor)
  addCell('math', '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');
  addCell('math', '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
  addCell('math', '\\det\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}');
  addCell('math', '\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');

  // Matrix operations (raw-type: no LaTeX trigger in CortexJS)
  addCell('raw',  '', 'eigenvalues([[1,2],[3,4]])');
  addCell('raw',  '', 'tran([[1,2],[3,4]])');
  addCell('raw',  '', 'eigenvalues([[a,b],[c,d]])');

  addCell('raw',  '', 'solve(x^2 - 3*x + 2 = 0, x)');
  addCell('raw',  '', 'plot(sin(x))');
  addCell('raw',  '', 'plotfunc([sin(x),cos(x)],x)');
  addCell('raw',  '', 'plot([sin(x),sin(x-pi/3),sin(x-2*pi/3)],x)');

  // Demo cells for all plot categories (pre-filled, not auto-executed)
  addCell('raw',  '', 'plotfunc(x^2+y^2,[x,y])');
  addCell('raw',  '', 'plotimplicit(x^2+y^2-1,x,y)');
  addCell('raw',  '', 'plotfield(sin(x*y),[x,y])');
  addCell('raw',  '', 'plotcontour(x^2+y^2,[x=-3..3,y=-3..3])');
  addCell('raw',  '', 'plotode(sin(t*y),[t,y],[0,1])');
  addCell('raw',  '', 'plotseq(cos(x),0.5,5)');
  addCell('raw',  '', 'histogram(seq(rand(100),k,1,200))');
  addCell('raw',  '', 'barplot([3,5,2,8,1])');
  addCell('raw',  '', 'gl_ortho=1; camembert([["Maths",35],["Physique",25],["Chimie",20],["Info",20]])');
  addCell('raw',  '', 'boxwhisker([1,2,3,4,5,6,7,8,9,10])');
  addCell('raw',  '', 'scatterplot([1,2,3,4,5],[2,4,5,4,5])');
  addCell('raw',  '', 'circle(0,2); segment([0,0],[2,0]); point(1,1)');
  addCell('raw',  '', 'plotfunc(sin(x)*cos(y),[x=-pi..pi,y=-pi..pi])');

  // Auto-render all text cells (no CAS needed, all scripts loaded at this point)
  cells.forEach(function(c) { if (c.type === 'text') renderTextCell(c.id); });

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
