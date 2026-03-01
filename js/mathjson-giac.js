'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 4 — MATHJSON → GIAC CONVERTER
//
// MathJSON (CortexJS) uses PascalCase function names:
//   ["Add", 1, 2]  →  1+2
//   ["D", f, x]    →  diff(f, x)
//
// The converter walks the AST recursively and emits a
// GIAC-compatible string for caseval().
// ─────────────────────────────────────────────────────────────

const SYMBOL_MAP = {
  Pi: 'pi', ExponentialE: 'e', ImaginaryUnit: 'i',
  Infinity: '+infinity', PositiveInfinity: '+infinity', NegativeInfinity: '-infinity',
  True: 'true', False: 'false', Nothing: 'undef', Half: '1/2',
};

/**
 * Convert a MathJSON expression to a GIAC-compatible string.
 * @param {*} expr - MathJSON node (number | string | array | object)
 * @returns {string}
 */
function mathJsonToGiac(expr) {
  if (expr == null) return '';
  if (typeof expr === 'number') return String(expr);
  if (typeof expr === 'string') {
    if (expr === 'Nothing') return '';
    return SYMBOL_MAP[expr] ?? expr;
  }

  // Object literal form: { num, sym, str, fn }
  if (typeof expr === 'object' && !Array.isArray(expr)) {
    if ('num' in expr) return expr.num;
    if ('sym' in expr) return mathJsonToGiac(expr.sym);
    if ('str' in expr) return '"' + expr.str + '"';
    if ('fn'  in expr) return mathJsonToGiac(expr.fn);
    return JSON.stringify(expr);
  }

  if (!Array.isArray(expr) || expr.length === 0) return '';

  const [head, ...args] = expr;
  const c   = (i) => mathJsonToGiac(args[i]);
  const all = ()  => args.map(mathJsonToGiac);
  const w   = (s) => '(' + s + ')';

  // Helper: unwrap CortexJS ["Function", ["Block", body], var] pattern
  function unwrapFn(node) {
    if (!Array.isArray(node) || node[0] !== 'Function') return null;
    let body = node[1];
    if (Array.isArray(body) && body[0] === 'Block') body = body[1];
    const v = node.length >= 3 ? mathJsonToGiac(node[2]) : 'x';
    return { body: mathJsonToGiac(body), v };
  }
  function isNothing(node) {
    return node == null || node === 'Nothing' ||
      (typeof node === 'object' && !Array.isArray(node) && node.sym === 'Nothing');
  }

  switch (head) {

    // ══════ Arithmetic ══════
    case 'Add':
      return w(all().join('+'));
    case 'Sum': {
      // Summation with bounds: ["Sum", body, ["Limits", var, lo, hi]]
      var limIdx = args.findIndex(function(a) { return Array.isArray(a) && a[0] === 'Limits'; });
      if (limIdx >= 0) {
        var lim = args[limIdx];
        var v = mathJsonToGiac(lim[1]), lo = mathJsonToGiac(lim[2]), hi = mathJsonToGiac(lim[3]);
        var body = mathJsonToGiac(args[0]);
        return 'sum(' + body + ',' + v + ',' + lo + ',' + hi + ')';
      }
      // No bounds — treat as addition
      return w(all().join('+'));
    }
    case 'Subtract':
      return args.length === 1 ? '(-' + w(c(0)) + ')' : w(c(0) + '-' + w(c(1)));
    case 'Negate':
      return '(-' + w(c(0)) + ')';
    case 'Multiply':
      return w(all().join('*'));
    case 'Product': {
      // Product with bounds: ["Product", body, ["Limits", var, lo, hi]]
      var limIdx = args.findIndex(function(a) { return Array.isArray(a) && a[0] === 'Limits'; });
      if (limIdx >= 0) {
        var lim = args[limIdx];
        var v = mathJsonToGiac(lim[1]), lo = mathJsonToGiac(lim[2]), hi = mathJsonToGiac(lim[3]);
        var body = mathJsonToGiac(args[0]);
        return 'product(' + body + ',' + v + ',' + lo + ',' + hi + ')';
      }
      return w(all().join('*'));
    }
    case 'Divide':
      return '(' + w(c(0)) + '/' + w(c(1)) + ')';
    case 'Rational':
      return '(' + c(0) + '/' + c(1) + ')';
    case 'Power':
      return '(' + w(c(0)) + '^' + w(c(1)) + ')';
    case 'Sqrt':
      return 'sqrt(' + c(0) + ')';
    case 'Root':
      return args.length >= 2
        ? '(' + w(c(0)) + '^(1/' + w(c(1)) + '))'
        : 'sqrt(' + c(0) + ')';
    case 'Abs':       return 'abs(' + c(0) + ')';
    case 'Factorial': return '(' + c(0) + ')!';

    // ══════ Trigonometric ══════
    case 'Sin': return 'sin(' + c(0) + ')';
    case 'Cos': return 'cos(' + c(0) + ')';
    case 'Tan': return 'tan(' + c(0) + ')';
    case 'Sec': return '(1/cos(' + c(0) + '))';
    case 'Csc': return '(1/sin(' + c(0) + '))';
    case 'Cot': return '(1/tan(' + c(0) + '))';
    case 'Arcsin': return 'asin(' + c(0) + ')';
    case 'Arccos': return 'acos(' + c(0) + ')';
    case 'Arctan': return 'atan(' + c(0) + ')';
    case 'Sinh': return 'sinh(' + c(0) + ')';
    case 'Cosh': return 'cosh(' + c(0) + ')';
    case 'Tanh': return 'tanh(' + c(0) + ')';

    // ══════ Log / Exp ══════
    case 'Ln':  return 'ln(' + c(0) + ')';
    case 'Exp': return 'exp(' + c(0) + ')';
    case 'Log':
      return args.length >= 2 ? 'log(' + c(0) + ',' + c(1) + ')' : 'ln(' + c(0) + ')';
    case 'Log2':  return 'log(' + c(0) + ',2)';
    case 'Log10': return 'log(' + c(0) + ',10)';

    // ══════ Calculus ══════
    case 'D': case 'Derivative': {
      const diffFn = unwrapFn(args[0]);
      if (diffFn) return 'diff(' + diffFn.body + ',' + diffFn.v + ')';
      return args.length >= 2 ? 'diff(' + c(0) + ',' + c(1) + ')' : 'diff(' + c(0) + ',x)';
    }

    case 'Integrate': {
      // CortexJS pattern: ["Integrate", ["Function", ["Block", body], var], ["Limits", var, lo, hi]]
      const intFn = unwrapFn(args[0]);
      if (intFn) {
        if (Array.isArray(args[1]) && args[1][0] === 'Limits') {
          const lo = args[1][2], hi = args[1][3];
          if (isNothing(lo) && isNothing(hi)) {
            return 'int(' + intFn.body + ',' + intFn.v + ')';
          }
          return 'int(' + intFn.body + ',' + intFn.v + ',' + mathJsonToGiac(lo) + ',' + mathJsonToGiac(hi) + ')';
        }
        return 'int(' + intFn.body + ',' + intFn.v + ')';
      }
      if (args.length === 1) return 'int(' + c(0) + ',x)';
      // Definite integral: ["Integrate", f, ["Triple", var, lo, hi]]
      if (Array.isArray(args[1]) &&
          ['Triple','Tuple'].includes(args[1][0]) &&
          args[1].length === 4) {
        const [, v, lo, hi] = args[1].map(mathJsonToGiac);
        return 'int(' + c(0) + ',' + v + ',' + lo + ',' + hi + ')';
      }
      if (args.length === 2) return 'int(' + c(0) + ',' + c(1) + ')';
      if (args.length === 4) return 'int(' + c(0) + ',' + c(1) + ',' + c(2) + ',' + c(3) + ')';
      return 'int(' + all().join(',') + ')';
    }

    case 'Limit': {
      // Detect one-sided limit: ["Superplus", 0] → dir=1, ["Superminus", 0] → dir=-1
      function extractLimitDir(node) {
        if (!Array.isArray(node) || node.length < 2) return null;
        if (node[0] === 'Superplus')  return { point: node[1], dir: '1' };
        if (node[0] === 'Superminus') return { point: node[1], dir: '-1' };
        // CortexJS bug: interprets 0^{+} as PseudoInverse(0) instead of Superplus(0)
        if (node[0] === 'PseudoInverse') {
          var p = node[1];
          // If CortexJS wrapped the point in an Error, default to 0
          if (Array.isArray(p) && p[0] === 'Error') p = 0;
          return { point: p, dir: '1' };
        }
        // Fallback: ["Power", point, "+"/"-"]
        if (node.length >= 3 && (node[0] === 'Power' || node[0] === 'Superscript')) {
          var sup = node[2];
          if (sup === '+' || sup === 'Plus') return { point: node[1], dir: '1' };
          if (sup === '-' || sup === 'Minus' || sup === 'Negate') return { point: node[1], dir: '-1' };
          if (Array.isArray(sup) && sup[0] === 'Negate') return { point: node[1], dir: '-1' };
        }
        return null;
      }
      // CortexJS pattern: ["Limit", ["Function", ["Block", body], var], point]
      const limFn = unwrapFn(args[0]);
      if (limFn) {
        if (args.length >= 2) {
          var ld = extractLimitDir(args[1]);
          if (ld) return 'limit(' + limFn.body + ',' + limFn.v + ',' + mathJsonToGiac(ld.point) + ',' + ld.dir + ')';
          return 'limit(' + limFn.body + ',' + limFn.v + ',' + c(1) + ')';
        }
        return 'limit(' + limFn.body + ',' + limFn.v + ')';
      }
      if (args.length >= 3) {
        var ld2 = extractLimitDir(args[2]);
        if (ld2) return 'limit(' + c(0) + ',' + c(1) + ',' + mathJsonToGiac(ld2.point) + ',' + ld2.dir + ')';
        return 'limit(' + c(0) + ',' + c(1) + '=' + c(2) + ')';
      }
      if (args.length === 2) return 'limit(' + c(0) + ',' + c(1) + ')';
      return 'limit(' + c(0) + ')';
    }

    case 'Series': case 'Taylor':
      return 'series(' + all().join(',') + ')';

    // ══════ Algebra ══════
    case 'Solve':    return 'solve(' + all().join(',') + ')';
    case 'Factor':   return 'factor(' + c(0) + ')';
    case 'Simplify': return 'simplify(' + c(0) + ')';
    case 'Expand':   return 'expand(' + c(0) + ')';

    // ══════ Linear algebra ══════
    case 'Determinant': case 'Det': return 'det(' + c(0) + ')';
    case 'Inverse':      return 'inv(' + c(0) + ')';
    case 'Transpose':    return 'tran(' + c(0) + ')';
    case 'Eigenvalues':  return 'eigenvalues(' + c(0) + ')';
    case 'Eigenvectors': return 'eigenvects(' + c(0) + ')';

    // ══════ Relations ══════
    case 'Equal':        return c(0) + '=' + c(1);
    case 'Less':         return c(0) + '<' + c(1);
    case 'LessEqual':    return c(0) + '<=' + c(1);
    case 'Greater':      return c(0) + '>' + c(1);
    case 'GreaterEqual': return c(0) + '>=' + c(1);
    case 'NotEqual':     return c(0) + '!=' + c(1);

    // ══════ Data structures ══════
    case 'List':   return '[' + all().join(',') + ']';
    case 'Matrix':
      return mathJsonToGiac(args[0]);
    case 'Tuple': case 'Triple': case 'Pair': case 'Sequence':
      return all().join(',');
    case 'Set':       return '{' + all().join(',') + '}';
    case 'Range':     return c(0) + '..' + c(1);
    case 'Delimiter':
      return args.length === 1 && Array.isArray(args[0])
        ? w(mathJsonToGiac(args[0])) : w(all().join(','));

    // ══════ Special functions ══════
    case 'Floor': return 'floor(' + c(0) + ')';
    case 'Ceil':  return 'ceil(' + c(0) + ')';
    case 'Round': return 'round(' + c(0) + ')';
    case 'Max':   return 'max(' + all().join(',') + ')';
    case 'Min':   return 'min(' + all().join(',') + ')';
    case 'Gcd':   return 'gcd(' + all().join(',') + ')';
    case 'Lcm':   return 'lcm(' + all().join(',') + ')';
    case 'Mod':   return 'irem(' + c(0) + ',' + c(1) + ')';
    case 'Binomial': case 'Choose':
      return 'comb(' + c(0) + ',' + c(1) + ')';

    // ══════ CortexJS wrappers ══════
    case 'Block':    return args.length >= 1 ? all().filter(Boolean).join('; ') : '';
    case 'Declare':  return ''; // CortexJS type hint — skip for Giac
    case 'Function': return args.length >= 1 ? c(0) : '';
    case 'Limits':   return args.length >= 1 ? c(0) : '';

    // ══════ Misc ══════
    case 'Assign': return c(0) + ':=' + c(1);
    case 'Plot':   return 'plot(' + all().join(',') + ')';

    // ══════ Unknown → attempt direct GIAC call ══════
    default: {
      const fn = head.charAt(0).toLowerCase() + head.slice(1);
      return args.length === 0 ? fn : fn + '(' + all().join(',') + ')';
    }
  }
}

/**
 * Normalize LaTeX from MathLive: strip \mathrm{} wrappers inside \operatorname{}
 * MathLive internally splits e.g. \operatorname{csolve} into
 * \operatorname{\mathrm{c}\mathrm{solve}}
 */
function normalizeOperatorname(latex) {
  return latex.replace(/\\operatorname\{([^{}]*(?:\\mathrm\{[^{}]*\})+[^{}]*)\}/g, function(_, inner) {
    return '\\operatorname{' + inner.replace(/\\mathrm\{([^{}]*)\}/g, '$1') + '}';
  });
}

/**
 * Extract a CAS function call from normalized LaTeX:
 *   \operatorname{func}\left(...\right)  →  func(...)
 *   \operatorname{func}\left(...,...\right)  →  func(...,...)
 *   \operatorname{func}\begin{pmatrix}...\end{pmatrix}  →  func(matrix)
 * Returns null if the LaTeX doesn't match a CAS function pattern.
 */
function extractCasFunctionCall(latex) {
  // Match \operatorname{name} followed by \left( ... \right)
  var m = latex.match(/^\\operatorname\{([a-zA-Z_]+)\}\\left\((.+)\\right\)$/);
  // Match \operatorname{name} followed directly by a matrix (no explicit parens)
  if (!m) {
    var m2 = latex.match(/^\\operatorname\{([a-zA-Z_]+)\}(\\begin\{[pbBvV]?matrix\}.+\\end\{[pbBvV]?matrix\})$/);
    if (m2) return { func: m2[1], args: [m2[2]] };
  }
  if (!m) return null;
  var funcName = m[1];
  var argsLatex = m[2];
  // Split arguments by top-level commas (not nested inside \left..\right or {..})
  var args = [];
  var depth = 0;
  var braceDepth = 0;
  var current = '';
  for (var i = 0; i < argsLatex.length; i++) {
    var ch = argsLatex[i];
    if (ch === '{') { braceDepth++; current += ch; }
    else if (ch === '}') { braceDepth--; current += ch; }
    else if (argsLatex.substr(i, 5) === '\\left') { depth++; current += '\\left'; i += 4; }
    else if (argsLatex.substr(i, 6) === '\\right') { depth--; current += '\\right'; i += 5; }
    else if (ch === ',' && depth === 0 && braceDepth === 0) {
      args.push(current.trim());
      current = '';
    }
    else { current += ch; }
  }
  if (current.trim()) args.push(current.trim());
  return { func: funcName, args: args };
}

/**
 * Full pipeline: LaTeX (from math-field) → MathJSON → GIAC string.
 */
function latexToGiac(latex) {
  // Normalize \operatorname wrapping from MathLive
  latex = normalizeOperatorname(latex);

  // Try to extract CAS function call directly (bypass CortexJS)
  var cas = extractCasFunctionCall(latex);
  if (cas) {
    var giacArgs = cas.args.map(function(a) { return latexToGiac(a); });
    return cas.func + '(' + giacArgs.join(',') + ')';
  }

  try {
    const json = ce.parse(latex, { canonical: false }).json;
    return mathJsonToGiac(json);
  } catch (e) {
    console.warn('LaTeX→MathJSON error:', e);
    return latex; // Giac can parse some LaTeX directly
  }
}
