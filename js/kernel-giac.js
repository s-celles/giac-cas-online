'use strict';

// GIAC JS Kernel Adapter
// Wraps the existing caseval() + GIAC_HELP infrastructure behind the Kernel interface

var GiacKernel = {
  id: 'giac-js',
  label: 'kernelGiac',
  available: false, // set to true when Module.ready and caseval is bound

  evaluate: function(expr, cellType) {
    if (!this.available || typeof caseval !== 'function') {
      throw new Error('GIAC kernel is not ready');
    }
    // For raw cells: pass expression directly to caseval
    if (cellType === 'raw') {
      giacCaptureStart();
      var raw = caseval(expr);
      return raw;
    }
    // For math cells: expression has already been converted to GIAC syntax
    // by getGiacExpr() (mathJsonToGiac or latexToGiac)
    giacCaptureStart();
    var result = caseval(expr);
    return result;
  },

  // LaTeX rendering helper for GIAC results
  renderLatex: function(expr) {
    if (!this.available || typeof caseval !== 'function') return '';
    try {
      var latex = caseval('latex(' + expr + ')');
      return latex ? latex.replace(/^"|"$/g, '') : '';
    } catch(e) { return ''; }
  },

  getCommands: function() {
    if (typeof COMMAND_MENU !== 'undefined' && COMMAND_MENU.allCommands) {
      return COMMAND_MENU.allCommands.filter(function(c) { return c.length > 0; });
    }
    if (typeof GIAC_HELP !== 'undefined') return Object.keys(GIAC_HELP.cmds).sort();
    return [];
  },

  getHelp: function(cmd) {
    if (typeof getHelp === 'function') return getHelp(cmd);
    return null;
  }
};

// Register with KernelRegistry
KernelRegistry.register(GiacKernel);
