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
  'ztrans':    '\\operatorname{ztrans}',
  'invztrans': '\\operatorname{invztrans}',
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
  'transpose':    '\\operatorname{transpose}',
  'tran':         '\\operatorname{tran}',
  'trace':        '\\operatorname{trace}',
  'rank':         '\\operatorname{rank}',
  'inv':          '\\operatorname{inv}',
  'rref':         '\\operatorname{rref}',
  'eigenvals':    '\\operatorname{eigenvals}',
  'eigenvalues':  '\\operatorname{eigenvalues}',
  'eigenvects':   '\\operatorname{eigenvects}',
  'eigenvectors': '\\operatorname{eigenvectors}',
  'jordan':       '\\operatorname{jordan}',
  'charpoly':     '\\operatorname{charpoly}',
  'cholesky':     '\\operatorname{cholesky}',
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
  // Transforms
  'fourier':   '\\operatorname{fourier}',
  'ifourier':  '\\operatorname{ifourier}',
  'periodic':  '\\operatorname{periodic}',
  // Misc
  'evalf':     '\\operatorname{evalf}',
  'piecewise': '\\operatorname{piecewise}',
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

// MathLive built-in shortcut names that MUST NOT be overridden (FR-003).
// These already map to proper LaTeX commands (e.g. sin→\sin, not \operatorname{sin}).
const MATHLIVE_BUILTIN_NAMES = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'arcsin', 'arccos', 'arctan',
  'sinh', 'cosh', 'tanh',
  'log', 'ln', 'exp',
  'det', 'dim', 'ker', 'hom', 'deg',
  'arg', 'max', 'min', 'sup', 'inf', 'lim',
  'gcd', 'mod', 'Pr',
]);

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

// ─────────────────────────────────────────────────────────────
// GIAC COMMAND LIST (Feature 012)
//
// Uses the static GIAC_ALL_COMMANDS array (from js/giac-commands.js),
// generated via Giac.jl's list_commands() which calls the C++ APIs
// giac::vector_aide_ptr() and giac::builtin_lexer_functions_begin/end().
//
// The asm.js build does not expose a command-listing API, so this
// static list replaces the slow prefix-based introspection approach
// (caseval("?prefix") × ~700 queries). See upstream-bugs.md.
// ─────────────────────────────────────────────────────────────

/**
 * Filter GIAC_ALL_COMMANDS to valid CAS identifier names (>= 3 chars,
 * alphanumeric + underscore, starting with a letter or underscore).
 * Excludes operators, units, and very short names.
 * @returns {string[]} filtered command names suitable for MathLive shortcuts
 */
function getGiacCommandNames() {
  if (typeof GIAC_ALL_COMMANDS === 'undefined') {
    console.warn('[GIAC commands] GIAC_ALL_COMMANDS not loaded');
    return [];
  }
  var commands = [];
  for (var i = 0; i < GIAC_ALL_COMMANDS.length; i++) {
    var name = GIAC_ALL_COMMANDS[i];
    // Only keep valid identifiers >= 3 chars (skip operators, units, short names)
    if (name.length >= 3 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      commands.push(name);
    }
  }
  console.log('[GIAC commands] ' + commands.length + ' valid identifiers from ' +
    GIAC_ALL_COMMANDS.length + ' total entries');
  return commands;
}

/**
 * Merge discovered GIAC commands into CAS_SHORTCUTS and update all
 * existing <math-field> elements. (FR-002, FR-003, FR-005)
 * @param {string[]} commands - array of GIAC command names
 */
function registerDiscoveredShortcuts(commands) {
  var added = 0;
  var skippedBuiltin = 0;
  var skippedDisabled = 0;
  var skippedExisting = 0;
  var skippedSubstring = 0;
  var disabledSet = new Set(DISABLED_SHORTCUTS);

  // Build full set of all command names (hardcoded + discovered) for substring checking.
  // MathLive fires inline shortcuts as soon as the typed suffix matches, so a short
  // name like "value" fires mid-word while typing "eigenvalues". We skip any name
  // that appears as a non-prefix substring inside a LONGER name in the set.
  var allNames = new Set(Object.keys(CAS_SHORTCUTS));
  commands.forEach(function(name) { allNames.add(name); });
  var substringConflicts = new Set();
  var namesList = Array.from(allNames);
  for (var i = 0; i < namesList.length; i++) {
    var shortName = namesList[i];
    for (var j = 0; j < namesList.length; j++) {
      var longName = namesList[j];
      if (longName.length <= shortName.length) continue;
      if (longName.indexOf(shortName) > 0) {
        substringConflicts.add(shortName);
        break;
      }
    }
  }

  commands.forEach(function(name) {
    // Skip if already in CAS_SHORTCUTS (hardcoded takes precedence)
    if (CAS_SHORTCUTS[name]) {
      skippedExisting++;
      return;
    }
    // Skip disabled shortcuts (FR-003 conflicts like 'and', 'sub', 'or')
    if (disabledSet.has(name)) {
      skippedDisabled++;
      return;
    }
    // Skip MathLive built-in names (FR-003)
    if (MATHLIVE_BUILTIN_NAMES.has(name)) {
      skippedBuiltin++;
      return;
    }
    // Skip names that appear inside longer names (prevents mid-word shortcut firing)
    if (substringConflicts.has(name)) {
      skippedSubstring++;
      return;
    }
    CAS_SHORTCUTS[name] = '\\operatorname{' + name + '}';
    added++;
  });

  console.log('[GIAC commands] Shortcuts: +' + added + ' new, ' +
    skippedExisting + ' already hardcoded, ' +
    skippedBuiltin + ' MathLive built-in conflicts, ' +
    skippedDisabled + ' disabled, ' +
    skippedSubstring + ' substring conflicts. Total CAS_SHORTCUTS: ' + Object.keys(CAS_SHORTCUTS).length);

  // FR-005: Update all existing math-field elements
  document.querySelectorAll('math-field').forEach(function(mf) {
    _applyCasShortcuts(mf);
  });
}

function initGiac() {
  const el  = document.getElementById('giac-status');
  const txt = el.querySelector('.text');

  if (typeof Module === 'undefined') {
    // No Module at all — demo mode (FR-007: hardcoded fallback)
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
        // FR-001: Register GIAC commands as MathLive shortcuts.
        // Uses the static GIAC_ALL_COMMANDS list (from giac-commands.js).
        try {
          var commands = getGiacCommandNames();
          if (commands.length > 0) {
            registerDiscoveredShortcuts(commands);
          }
        } catch (e) {
          console.error('[GIAC commands] Failed to register shortcuts:', e);
        }
      } catch (e) {
        txt.textContent = t('giacError');
        el.classList.add('error');
        console.error('Giac init error:', e);
      }
    }
  }, 200);
}
