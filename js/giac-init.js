'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 2 — COMPUTE ENGINE
// ─────────────────────────────────────────────────────────────

const ce = new ComputeEngine.ComputeEngine();


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
