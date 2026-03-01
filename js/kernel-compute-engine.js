'use strict';

// Compute Engine Kernel Adapter
// Uses CortexJS Compute Engine for symbolic computation
// Evaluate: math cells via ce.box(json).evaluate(), raw cells via ce.parse(text).evaluate()
// Output: LaTeX string for KaTeX rendering

// Static help entries for Compute Engine functions
var _CE_HELP = {
  Simplify:  { name: 'Simplify',  d: 'Simplify an expression', p: 'expr' },
  Factor:    { name: 'Factor',    d: 'Factor a polynomial expression', p: 'expr' },
  Expand:    { name: 'Expand',    d: 'Expand a product or power', p: 'expr' },
  Solve:     { name: 'Solve',     d: 'Solve an equation for a variable', p: 'expr, variable' },
  D:         { name: 'D',         d: 'Differentiate an expression', p: 'expr, variable' },
  Integrate: { name: 'Integrate', d: 'Integrate an expression', p: 'expr, variable' },
  N:         { name: 'N',         d: 'Numerical approximation', p: 'expr' },
  Sqrt:      { name: 'Sqrt',      d: 'Square root', p: 'expr' },
  Abs:       { name: 'Abs',       d: 'Absolute value', p: 'expr' },
  Exp:       { name: 'Exp',       d: 'Exponential function', p: 'expr' },
  Log:       { name: 'Log',       d: 'Natural logarithm', p: 'expr' },
  Sin:       { name: 'Sin',       d: 'Sine function', p: 'expr' },
  Cos:       { name: 'Cos',       d: 'Cosine function', p: 'expr' },
  Tan:       { name: 'Tan',       d: 'Tangent function', p: 'expr' },
  Arcsin:    { name: 'Arcsin',    d: 'Inverse sine', p: 'expr' },
  Arccos:    { name: 'Arccos',    d: 'Inverse cosine', p: 'expr' },
  Arctan:    { name: 'Arctan',    d: 'Inverse tangent', p: 'expr' },
  Power:     { name: 'Power',     d: 'Raise to a power', p: 'base, exponent' },
  Add:       { name: 'Add',       d: 'Sum of expressions', p: 'a, b, ...' },
  Multiply:  { name: 'Multiply',  d: 'Product of expressions', p: 'a, b, ...' },
  Negate:    { name: 'Negate',    d: 'Negation of an expression', p: 'expr' },
  Rational:  { name: 'Rational',  d: 'Create a rational number', p: 'numerator, denominator' }
};

var _CE_COMMANDS = Object.keys(_CE_HELP).sort();

/**
 * Convert plain math text to LaTeX for ce.parse().
 * ce.parse() expects LaTeX, so "sin(x)*cos(x)" must become "\sin(x) \cdot \cos(x)".
 */
function _ceTextToLatex(text) {
  var s = text.trim();
  // Replace common math function names with LaTeX commands
  s = s.replace(/\bsin\b/g, '\\sin');
  s = s.replace(/\bcos\b/g, '\\cos');
  s = s.replace(/\btan\b/g, '\\tan');
  s = s.replace(/\barcsin\b/g, '\\arcsin');
  s = s.replace(/\barccos\b/g, '\\arccos');
  s = s.replace(/\barctan\b/g, '\\arctan');
  s = s.replace(/\bln\b/g, '\\ln');
  s = s.replace(/\blog\b/g, '\\log');
  s = s.replace(/\bexp\b/g, '\\exp');
  s = s.replace(/\bpi\b/g, '\\pi');
  // Replace * with \cdot for multiplication
  s = s.replace(/\*/g, ' \\cdot ');
  return s;
}

/**
 * Split function arguments by comma, respecting parentheses depth.
 */
function _ceSplitArgs(argsStr) {
  var args = [];
  var depth = 0;
  var current = '';
  for (var i = 0; i < argsStr.length; i++) {
    var ch = argsStr[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Recursively parse an expression to MathJSON.
 * Handles CE function calls (Sqrt(x), Exp(Log(x))) and
 * plain math text (x^2+1, sin(x)*cos(x)).
 */
function _ceParseExprToJson(text) {
  text = text.trim();

  // Try as CE function call first (e.g., Sqrt(x), Exp(Log(x)))
  var m = text.match(/^(\w+)\((.+)\)$/s);
  if (m && _CE_HELP[m[1]]) {
    var fnName = m[1];
    var argsStr = m[2];
    var args = _ceSplitArgs(argsStr);
    var mjArgs = args.map(function(arg) { return _ceParseExprToJson(arg); });
    return [fnName].concat(mjArgs);
  }

  // Not a CE function call — convert plain text to LaTeX, then parse
  var latex = _ceTextToLatex(text);
  try {
    return ce.parse(latex).json;
  } catch(e) {
    return text;
  }
}

/**
 * Parse a Compute Engine function call from raw text.
 * Supports: Factor(x^4-1), Simplify(x^2+2x+1), D(sin(x), x)
 * Returns MathJSON array or null.
 */
function _ceParseRawExpr(text) {
  // Match Function(args) pattern
  var m = text.match(/^(\w+)\((.+)\)$/s);
  if (m && _CE_HELP[m[1]]) {
    var fnName = m[1];
    var argsStr = m[2];
    var args = _ceSplitArgs(argsStr);

    // Build MathJSON: ["FnName", parsed_arg1, parsed_arg2, ...]
    try {
      var mjArgs = args.map(function(arg) { return _ceParseExprToJson(arg); });
      return [fnName].concat(mjArgs);
    } catch(e) {
      return null;
    }
  }
  return null;
}

var ComputeEngineKernel = {
  id: 'compute-engine',
  label: 'kernelComputeEngine',
  available: false, // set to true when ComputeEngine is constructed and ready

  evaluate: function(expr, cellType) {
    if (!this.available) {
      throw new Error('Compute Engine is not available');
    }

    try {
      var result;

      if (cellType === 'raw') {
        // Raw cells: try to parse as CE function call first (e.g., Factor(x^4-1))
        var mjson = _ceParseRawExpr(expr);
        if (mjson) {
          result = ce.box(mjson).evaluate();
        } else {
          // Fall back: convert plain text to LaTeX, then parse
          var latex = _ceTextToLatex(expr);
          result = ce.parse(latex).evaluate();
        }
      } else {
        // Math cells: expr is already in GIAC syntax from getGiacExpr()
        // We need the original MathJSON from the math-field
        // For now, try parsing as LaTeX (the expr from getGiacExpr may be GIAC syntax)
        // A better approach: pass MathJSON directly for math cells
        try {
          result = ce.parse(expr).evaluate();
        } catch(e) {
          // If LaTeX parse fails, try as-is
          result = ce.parse(expr);
        }
      }

      // Try evaluate, then .N() for numeric fallback
      if (result) {
        var evaluated = result;
        // If result is a boxed expression, try to get LaTeX
        var latex = '';
        try {
          latex = evaluated.latex;
        } catch(e) {}

        // If evaluate returns the same expression, try .N() for numeric result
        if (!latex || latex === expr) {
          try {
            var numeric = evaluated.N();
            if (numeric && numeric.latex && numeric.latex !== expr) {
              latex = numeric.latex;
            }
          } catch(e) {}
        }

        return latex || String(evaluated);
      }

      return expr; // echo back if nothing worked
    } catch(err) {
      throw new Error('Compute Engine: ' + err.message);
    }
  },

  getCommands: function() {
    return _CE_COMMANDS;
  },

  getHelp: function(cmd) {
    if (!cmd) return null;
    var entry = _CE_HELP[cmd];
    if (entry) return { name: entry.name, entry: { d: entry.d, p: entry.p, a: [] } };
    // Case-insensitive fallback
    var lower = cmd.toLowerCase();
    for (var i = 0; i < _CE_COMMANDS.length; i++) {
      if (_CE_COMMANDS[i].toLowerCase() === lower) {
        var e = _CE_HELP[_CE_COMMANDS[i]];
        return { name: e.name, correctedFrom: cmd, entry: { d: e.d, p: e.p, a: [] } };
      }
    }
    return null;
  }
};

// Try to detect if ComputeEngine is loaded
try {
  if (typeof ComputeEngine !== 'undefined' && typeof ce !== 'undefined') {
    ComputeEngineKernel.available = true;
  }
} catch(e) {
  // CDN failed — kernel stays unavailable
}

// Register with KernelRegistry
KernelRegistry.register(ComputeEngineKernel);
