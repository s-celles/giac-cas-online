'use strict';

// SECTION 12 — BOOT
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setLocale(detectLocale());
  initGiac();

  // Custom virtual keyboard layouts (inspired by B. Parisse's math2d.html)
  if (typeof mathVirtualKeyboard !== 'undefined') {
    mathVirtualKeyboard.layouts = [
      "numeric",
      {
        label: "½",
        tooltip: "Fractions, puissances, racines, fonctions",
        rows: [
          [
            { latex: "\\frac{#@}{#?}", label: "<span><sup>a</sup>⁄<sub>b</sub></span>", tooltip: "Fraction" },
            { latex: "\\frac{1}{2}", label: "½", tooltip: "Un demi" },
            { latex: "\\frac{1}{3}", label: "⅓", tooltip: "Un tiers" },
            { latex: "\\frac{1}{4}", label: "¼", tooltip: "Un quart" },
            { latex: "\\frac{d}{dx}", label: "<span style='font-size:.85em'>d/dx</span>", tooltip: "Dérivée" },
            { latex: "\\frac{\\partial}{\\partial x}", label: "∂/∂x", tooltip: "Dérivée partielle" },
            { class: "separator w5" },
            { latex: "\\sqrt{#@}", label: "√", tooltip: "Racine carrée" },
            { latex: "\\sqrt[3]{#@}", label: "∛", tooltip: "Racine cubique" },
            { latex: "\\sqrt[n]{#@}", label: "<span><sup>n</sup>√</span>", tooltip: "Racine n-ième" }
          ],
          [
            { latex: "#@^{#?}", label: "<span>x<sup>□</sup></span>", tooltip: "Exposant" },
            { latex: "#@^{2}", label: "<span>x<sup>2</sup></span>", tooltip: "Carré" },
            { latex: "#@^{3}", label: "<span>x<sup>3</sup></span>", tooltip: "Cube" },
            { latex: "#@^{n}", label: "<span>x<sup>n</sup></span>", tooltip: "Puissance n" },
            { latex: "#@^{-1}", label: "<span>x<sup>−1</sup></span>", tooltip: "Inverse" },
            { latex: "#@_{#?}", label: "<span>x<sub>□</sub></span>", tooltip: "Indice" },
            { latex: "#@^{#?}_{#?}", label: "<span>x<sup>□</sup><sub>□</sub></span>", tooltip: "Exposant + Indice" },
            { class: "separator w5" },
            { latex: "\\left(#@\\right)", label: "( )", tooltip: "Parenthèses auto" },
            { latex: "\\left[#@\\right]", label: "[ ]", tooltip: "Crochets auto" }
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
        tooltip: "Intégrales, sommes, relations, ensembles",
        rows: [
          [
            { latex: "\\int", label: "∫", tooltip: "Intégrale indéfinie" },
            { latex: "\\int_{#?}^{#?}", label: "<span>∫<sup>b</sup><sub>a</sub></span>", tooltip: "Intégrale définie" },
            { latex: "\\iint", label: "∬", tooltip: "Intégrale double" },
            { latex: "\\iiint", label: "∭", tooltip: "Intégrale triple" },
            { latex: "\\oint", label: "∮", tooltip: "Intégrale curviligne" },
            { class: "separator w5" },
            { latex: "\\sum", label: "∑", tooltip: "Somme" },
            { latex: "\\sum_{k=1}^{n}", label: "<span>∑<sup>n</sup><sub>k=1</sub></span>", tooltip: "Somme bornée" },
            { latex: "\\prod_{k=1}^{n}", label: "<span>∏<sup>n</sup><sub>k=1</sub></span>", tooltip: "Produit borné" },
            { latex: "\\lim_{#?\\to #?}#?", label: "lim", tooltip: "Limite" }
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
            { latex: "\\mathbb{R}", label: "ℝ", tooltip: "Réels" },
            { latex: "\\mathbb{N}", label: "ℕ", tooltip: "Entiers naturels" },
            { latex: "\\mathbb{Z}", label: "ℤ", tooltip: "Entiers relatifs" },
            { latex: "\\mathbb{Q}", label: "ℚ", tooltip: "Rationnels" },
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
            { latex: "\\forall", label: "∀", tooltip: "Pour tout" },
            { latex: "\\exists", label: "∃", tooltip: "Il existe" },
            { latex: "\\land", label: "∧", tooltip: "Et logique" },
            { latex: "\\lor", label: "∨", tooltip: "Ou logique" },
            { latex: "\\neg", label: "¬", tooltip: "Négation" },
            { class: "separator w5" },
            "[undo]", "[backspace]"
          ]
        ]
      },
      "alphabetic",
      "greek"
    ];
  }

  // Demo cells
  addCell('text', '', t('welcomeTitle') + '\n\n' + t('welcomeBody'));

  // Reactive DAG demo cells
  addCell('raw', '', 'a := 5');
  addCell('raw', '', 'a^2');
  addCell('raw', '', 'b := a + 3');

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

  addCell('raw',  '', 'solve(x^2 - 3*x + 2 = 0, x)');
  addCell('raw',  '', 'eigenvalues([[1,2],[3,4]])');
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
  addCell('raw',  '', 'camembert([["A",30],["B",50],["C",20]])');
  addCell('raw',  '', 'boxwhisker([1,2,3,4,5,6,7,8,9,10])');
  addCell('raw',  '', 'scatterplot([1,2,3,4,5],[2,4,5,4,5])');
  addCell('raw',  '', 'circle(0,2); segment([0,0],[2,0]); point(1,1)');
  addCell('raw',  '', 'plotfunc(sin(x)*cos(y),[x=-pi..pi,y=-pi..pi])');

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
