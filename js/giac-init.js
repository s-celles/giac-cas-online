'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 2 — COMPUTE ENGINE
// ─────────────────────────────────────────────────────────────

const ce = new ComputeEngine.ComputeEngine();

// Configure MathLive inline shortcuts for CAS use:
// 1) Remove shortcuts that conflict with CAS names ("and"→\land, "sub"→\subset, "or"→\lor)
// 2) Add CAS functions as longer shortcuts so they take priority over built-in
//    prefixes (e.g. "expand" must win over "exp")
const DISABLED_SHORTCUTS = ['and', 'sub', 'or'];
const CAS_SHORTCUTS = {
  // Algebra
  'expand':    '\\operatorname{expand}',
  'factor':    '\\operatorname{factor}',
  'simplify':  '\\operatorname{simplify}',
  'solve':     '\\operatorname{solve}',
  'subst':     '\\operatorname{subst}',
  'normal':    '\\operatorname{normal}',
  'collect':   '\\operatorname{collect}',
  'partfrac':  '\\operatorname{partfrac}',
  'ratnormal': '\\operatorname{ratnormal}',
  'cfactor':   '\\operatorname{cfactor}',
  'csolve':    '\\operatorname{csolve}',
  'fsolve':    '\\operatorname{fsolve}',
  'linsolve':  '\\operatorname{linsolve}',
  // Calculus
  'diff':      '\\operatorname{diff}',
  'integrate': '\\operatorname{integrate}',
  'series':    '\\operatorname{series}',
  'taylor':    '\\operatorname{taylor}',
  'limit':     '\\operatorname{limit}',
  'desolve':   '\\operatorname{desolve}',
  'laplace':   '\\operatorname{laplace}',
  'ilaplace':  '\\operatorname{ilaplace}',
  // Polynomials
  'degree':    '\\operatorname{degree}',
  'coeff':     '\\operatorname{coeff}',
  'lcoeff':    '\\operatorname{lcoeff}',
  'proot':     '\\operatorname{proot}',
  'quo':       '\\operatorname{quo}',
  'rem':       '\\operatorname{rem}',
  'quorem':    '\\operatorname{quorem}',
  'resultant': '\\operatorname{resultant}',
  // Linear algebra
  'transpose': '\\operatorname{transpose}',
  'trace':     '\\operatorname{trace}',
  'rank':      '\\operatorname{rank}',
  'rref':      '\\operatorname{rref}',
  'eigenvals': '\\operatorname{eigenvals}',
  'eigenvects':'\\operatorname{eigenvects}',
  'jordan':    '\\operatorname{jordan}',
  'charpoly':  '\\operatorname{charpoly}',
  'cholesky':  '\\operatorname{cholesky}',
  // Number theory
  'isprime':   '\\operatorname{isprime}',
  'nextprime': '\\operatorname{nextprime}',
  'ifactor':   '\\operatorname{ifactor}',
  'ifactors':  '\\operatorname{ifactors}',
  'euler':     '\\operatorname{euler}',
  'powmod':    '\\operatorname{powmod}',
  // Trig transforms
  'texpand':   '\\operatorname{texpand}',
  'tlin':      '\\operatorname{tlin}',
  'tcollect':  '\\operatorname{tcollect}',
  'halftan':   '\\operatorname{halftan}',
  'trigsin':   '\\operatorname{trigsin}',
  'trigcos':   '\\operatorname{trigcos}',
  'trigtan':   '\\operatorname{trigtan}',
  // Exp/Log transforms
  'lnexpand':  '\\operatorname{lnexpand}',
  'lncollect': '\\operatorname{lncollect}',
  'exp2pow':   '\\operatorname{exp2pow}',
  'pow2exp':   '\\operatorname{pow2exp}',
  // Misc
  'evalf':     '\\operatorname{evalf}',
  'exact':     '\\operatorname{exact}',
  'assume':    '\\operatorname{assume}',
  'purge':     '\\operatorname{purge}',
  'numer':     '\\operatorname{numer}',
  'denom':     '\\operatorname{denom}',
  'plot':      '\\operatorname{plot}',
  'plotfunc':  '\\operatorname{plotfunc}',
  // Statistics
  'mean':      '\\operatorname{mean}',
  'stddev':    '\\operatorname{stddev}',
  'variance':  '\\operatorname{variance}',
  'median':    '\\operatorname{median}',
  'normald':   '\\operatorname{normald}',
};

// Patch MathfieldElement.connectedCallback to auto-configure every math-field
function _applyCasShortcuts(mf) {
  try {
    const shortcuts = { ...mf.inlineShortcuts };
    DISABLED_SHORTCUTS.forEach(k => delete shortcuts[k]);
    Object.assign(shortcuts, CAS_SHORTCUTS);
    mf.inlineShortcuts = shortcuts;
  } catch(e) { /* _mathfield not ready */ }
}

if (typeof MathfieldElement !== 'undefined') {
  const _origConnected = MathfieldElement.prototype.connectedCallback;
  MathfieldElement.prototype.connectedCallback = function() {
    _origConnected.call(this);
    const self = this;
    // Try immediately (sync), then retry after paint in case _mathfield is async
    _applyCasShortcuts(self);
    requestAnimationFrame(() => _applyCasShortcuts(self));
  };
}

// Fallback for manual configuration
function configureMathField(mf) {
  requestAnimationFrame(() => _applyCasShortcuts(mf));
}

// ─────────────────────────────────────────────────────────────
// SECTION 3 — GIAC INITIALIZATION
//
// Giac exposes:  extern "C" const char* caseval(const char*);
// Two loading strategies:
//   A) giacsimple.js → UI.ready / UI.caseval
//   B) giacwasm.js   → Module.cwrap('caseval','string',['string'])
// ─────────────────────────────────────────────────────────────

let giacReady = false;
let caseval = null;

function initGiac() {
  const el  = document.getElementById('giac-status');
  const txt = el.querySelector('.text');

  if (typeof Module === 'undefined') {
    // No Module at all — demo mode
    txt.textContent = t('giacDemo');
    el.classList.add('error');
    caseval = (expr) => '[DEMO] ' + expr;
    giacReady = true;
    return;
  }

  // Poll until Module.ready (set by onRuntimeInitialized)
  const poll = setInterval(() => {
    if (Module.ready) {
      clearInterval(poll);
      try {
        caseval = Module.cwrap('caseval', 'string', ['string']);
        giacReady = true;
        txt.textContent = t('giacReady');
        el.classList.add('ready');
      } catch (e) {
        txt.textContent = t('giacError');
        el.classList.add('error');
        console.error('Giac init error:', e);
      }
    }
  }, 200);
}
