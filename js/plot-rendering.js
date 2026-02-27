'use strict';

// SECTION 13 — PLOT RENDERING
//
// Detects graphical output from Giac (SVG, gr2d, gl3d) and
// renders plots inline in cell output areas.
// Ported from giacsimple.js with adaptations for the notebook.
// ─────────────────────────────────────────────────────────────

const PLOT_COLORS = [
  'black','red','green','yellow','blue','magenta','cyan','white',
  'silver','gray','maroon','purple','fuchsia','lime','olive','navy',
  'teal','aqua','antiquewhite','aquamarine','azure','beige','bisque',
  'blanchedalmond','blueviolet','brown','burlywood','cadetblue',
  'chartreuse','chocolate','coral','cornflowerblue','cornsilk','crimson',
  'cyan','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen',
  'darkgrey','darkkhaki','darkmagenta','darkolivegreen','darkorange',
  'darkorchid','darkred','darksalmon','darkseagreen','darkslateblue',
  'darkslategray','darkslategrey','darkturquoise','darkviolet','deeppink',
  'deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite',
  'forestgreen','gainsboro','ghostwhite','gold','goldenrod','greenyellow',
  'grey','honeydew','hotpink','indianred','indigo','ivory','khaki',
  'lavender','lavenderblush','lawngreen','lemonchiffon','lightblue',
  'lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen',
  'lightgrey','lightpink','lightsalmon','lightseagreen','lightskyblue',
  'lightslategray','lightslategrey','lightsteelblue','lightyellow',
  'limegreen','linen','mediumaquamarine','mediumblue','mediumorchid',
  'mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen',
  'mediumturquoise','mediumvioletred','midnightblue','mintcream',
  'mistyrose','moccasin','navajowhite','oldlace','olivedrab','orangered',
  'orchid','palegoldenrod','palegreen','paleturquoise','palevioletred',
  'papayawhip','peachpuff','peru','pink','plum','powderblue','rosybrown',
  'royalblue','saddlebrown','salmon','sandybrown','seagreen','seashell',
  'sienna','skyblue','slateblue','slategray','slategrey','snow',
  'springgreen','steelblue','tan','thistle','tomato','turquoise','violet',
  'wheat','whitesmoke','yellowgreen'
];

function plotRainbowColor(k) {
  var r, g, b;
  k += 21;
  k %= 126;
  if (k < 0) k += 126;
  if (k < 21) { r = 251; g = 0; b = 12 * k; }
  if (k >= 21 && k < 42) { r = 251 - 12 * (k - 21); g = 0; b = 251; }
  if (k >= 42 && k < 63) { r = 0; g = (k - 42) * 12; b = 251; }
  if (k >= 63 && k < 84) { r = 0; g = 251; b = 251 - (k - 63) * 12; }
  if (k >= 84 && k < 105) { r = (k - 84) * 12; g = 251; b = 0; }
  if (k >= 105 && k < 126) { r = 251; g = 251 - (k - 105) * 12; b = 0; }
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function plotResolveColor(c) {
  if (c >= 0x100) {
    if (c < 0x17e) return plotRainbowColor(c);
    var r = 8 * ((c >> 11) & 0x1f);
    var g = 4 * ((c >> 5) & 0x3f);
    var b = 8 * (c & 0x1f);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  return PLOT_COLORS[c] || 'black';
}

function detectPlotFormat(raw) {
  if (!raw || raw.length < 5) return 'text';
  if (raw.substr(0, 4) === '<svg' || (raw.charAt(0) === '"' && raw.substr(1, 4) === '<svg')) return 'svg';
  if (raw.substr(0, 5) === 'gr2d(') return 'gr2d';
  if (raw.substr(0, 5) === 'gl3d ') return 'gl3d';
  return 'text';
}

/** Strip surrounding quotes from Giac output if present */
function stripQuotes(s) {
  if (s.length >= 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"')
    return s.substring(1, s.length - 1);
  return s;
}

// T008: SVG plot renderer
function renderSvgPlot(outputEl, svgString) {
  var container = document.createElement('div');
  container.className = 'plot-container plot-svg';
  container.innerHTML = svgString;
  outputEl.appendChild(container);
}

// T009: Pixon (pixel) renderer — ported from giacsimple.js
function plotPixonDraw(canvas, dataString) {
  var v;
  try { v = JSON.parse(dataString); } catch(e) {
    try { v = (0, eval)(dataString); } catch(e2) { return; }
  }
  if (!Array.isArray(v) || v.length < 2) return;
  var l = v.length, w = 0, h = 0;
  var scale = v[0];
  for (var k = 1; k < l; k++) {
    var cur = v[k];
    var x = cur[0], y = cur[1];
    if (cur.length === 3 && typeof cur[2] !== 'number') { x += 100; y += 16; }
    if (cur.length === 4) {
      var tmp = cur[3];
      if (typeof tmp === 'number') { if (tmp > 0) y += tmp; else x -= tmp; }
      else { x += 100; y += 16; }
    }
    if (x > w) w = x;
    if (y > h) h = y;
  }
  w = (w + 1) * scale;
  h = (h + 1) * scale;
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  for (var k = 1; k < l; k++) {
    var cur = v[k], cl;
    if (!Array.isArray(cur) || (cl = cur.length) < 2) continue;
    var x = cur[0] * scale, y = cur[1] * scale;
    if (cl > 2 && typeof cur[2] === 'string') {
      ctx.font = '16px serif'; ctx.fillStyle = 'black';
      ctx.fillText(cur[2], x, y + 16, 100); continue;
    }
    ctx.fillStyle = (cl > 2) ? plotResolveColor(cur[2]) : 'black';
    if (cl < 4) { ctx.fillRect(x, y, scale, scale); continue; }
    if (typeof cur[3] === 'string') {
      ctx.font = '16px serif'; ctx.fillText(cur[3], x, y + 16, 100); continue;
    }
    var ph = cur[3] * scale, pw = scale;
    if (ph < 0) { pw = -ph; ph = scale; }
    ctx.fillRect(x, y, pw, ph);
  }
}

// T010: Logo (turtle) renderer — ported from giacsimple.js
function plotLogoDraw(canvas, dataString, zoom, dx, dy) {
  var v;
  try { v = JSON.parse(dataString); } catch(e) {
    try { v = (0, eval)(dataString); } catch(e2) { return; }
  }
  if (!Array.isArray(v) || v.length < 2) return;
  var w = canvas.width, h = canvas.height;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var turtlezoom = zoom || 1, turtlex = dx || 0, turtley = dy || 0;

  // Background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, w, h);

  // Dot grid
  ctx.fillStyle = '#ddd';
  var xdecal = Math.floor(turtlex / 10.0) * 10;
  var ydecal = Math.floor(turtley / 10.0) * 10;
  for (var i = xdecal; i < w / turtlezoom + xdecal; i += 10) {
    for (var j = ydecal; j < h / turtlezoom + ydecal; j += 10) {
      var X = Math.floor((i - turtlex) * turtlezoom + .5);
      var Y = Math.floor((j - turtley) * turtlezoom + .5);
      ctx.fillRect(X, h - Y, 1, 1);
    }
  }

  var l = v.length;
  // v[i]=[x,y,cap,status,r,chaine]
  // color=status>>11, pen_down=status&1, visible=status&2
  for (var k = 1; k < l; k++) {
    var prec = v[k - 1], cur = v[k];
    var preccouleur = prec[3] >> 11;
    var curcouleur = cur[3] >> 11;
    if (cur[5] && cur[5].length) {
      ctx.font = cur[4] + 'px serif';
      ctx.strokeStyle = ctx.fillStyle = plotResolveColor(curcouleur);
      ctx.fillText(cur[5], turtlezoom * (cur[0] - turtlex), h - turtlezoom * (cur[1] - turtley));
      continue;
    }
    var radius = cur[4], precradius = prec[4];
    var x1 = Math.floor(turtlezoom * (prec[0] - turtlex) + .5),
        y1 = Math.floor(turtlezoom * (prec[1] - turtley) + .5),
        x2 = Math.floor(turtlezoom * (cur[0] - turtlex) + .5),
        y2 = Math.floor(turtlezoom * (cur[1] - turtley) + .5);
    if (radius > 0) {
      var r = radius & 0x1ff;
      var theta1 = prec[2] + ((radius >> 9) & 0x1ff);
      var theta2 = prec[2] + ((radius >> 18) & 0x1ff);
      var rempli = (radius >> 27) & 1;
      var seg = (radius >> 28) & 1;
      var R = Math.floor(turtlezoom * r + .5);
      var angle1 = Math.PI / 180 * (theta1 - 90);
      var angle2 = Math.PI / 180 * (theta2 - 90);
      var cx = Math.floor(turtlezoom * (cur[0] - turtlex - r * Math.cos(angle2)) + .5);
      var cy = Math.floor(turtlezoom * (cur[1] - turtley - r * Math.sin(angle2)) + .5);
      ctx.beginPath();
      if (seg) ctx.moveTo(x2, h - y2);
      else { ctx.moveTo(cx, h - cy); ctx.lineTo(x2, h - y2); }
      ctx.arc(cx, h - cy, R, -angle2, -angle1);
      ctx.closePath();
      ctx.strokeStyle = ctx.fillStyle = plotResolveColor(curcouleur);
      if (rempli) ctx.fill(); else ctx.stroke();
      continue;
    }
    if (prec[3] & 1) {
      ctx.strokeStyle = ctx.fillStyle = plotResolveColor(preccouleur);
      ctx.beginPath();
      ctx.moveTo(x1, h - y1); ctx.lineTo(x2, h - y2);
      ctx.closePath(); ctx.stroke();
    }
    if (radius < -1 && k + radius >= 0) {
      ctx.strokeStyle = ctx.fillStyle = plotResolveColor(curcouleur);
      ctx.beginPath();
      ctx.moveTo(x2, h - y2);
      for (var i = -1; i >= radius; i--) {
        var pv = v[k + i];
        ctx.lineTo(
          Math.floor(turtlezoom * (pv[0] - turtlex) + .5),
          h - Math.floor(turtlezoom * (pv[1] - turtley) + .5)
        );
      }
      ctx.closePath(); ctx.fill();
    }
  }
  // Draw turtle icon if visible
  var last = v[l - 1];
  if (last[3] & 2) {
    var tx = Math.floor(turtlezoom * (last[0] - turtlex) + .5);
    var ty = Math.floor(turtlezoom * (last[1] - turtley) + .5);
    var cost = Math.cos(last[2] * Math.PI / 180);
    var sint = Math.sin(last[2] * Math.PI / 180);
    var tlen = (last[3] >> 3) & 0xff;
    var Dx = Math.floor(turtlezoom * tlen * cost / 2 + .5);
    var Dy = Math.floor(turtlezoom * tlen * sint / 2 + .5);
    ctx.strokeStyle = plotResolveColor(last[3] >> 11);
    ctx.beginPath(); ctx.moveTo(tx + Dy, h - (ty - Dx)); ctx.lineTo(tx - Dy, h - (ty + Dx)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx + Dy, h - (ty - Dx)); ctx.lineTo(tx + 3 * Dx, h - (ty + 3 * Dy)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - Dy, h - (ty + Dx)); ctx.lineTo(tx + 3 * Dx, h - (ty + 3 * Dy)); ctx.stroke();
  }
}

// T011: gr2d dispatcher — creates canvas and routes to logo or pixon
var plotCanvasCounter = 0;
var plotCanvasStates = {};

function renderGr2dPlot(outputEl, gr2dString) {
  var inner = gr2dString.substr(5, gr2dString.length - 6); // strip "gr2d(" and ")"
  var container = document.createElement('div');
  container.className = 'plot-container';
  var canvasId = 'plot-canvas-' + (++plotCanvasCounter);
  var canvas = document.createElement('canvas');
  canvas.id = canvasId;
  canvas.width = 600; canvas.height = 400;
  container.appendChild(canvas);
  outputEl.appendChild(container);

  if (inner.length > 6 && inner.substr(0, 6) === 'pixon(') {
    plotPixonDraw(canvas, inner.substr(6, inner.length - 7));
  } else if (inner.length > 5 && inner.substr(0, 5) === 'logo(') {
    var logoData = inner.substr(5, inner.length - 6);
    plotLogoDraw(canvas, logoData, 1, 0, 0);
    plotCanvasStates[canvasId] = { rawData: logoData, zoom: 1, dx: 0, dy: 0 };
    attachPlotInteractivity(canvas, canvasId);
  }
}

// T016-T019: Interactive plot features (zoom, pan, coordinate hover)
function attachPlotInteractivity(canvas, canvasId) {
  var state = plotCanvasStates[canvasId];
  if (!state) return;
  var container = canvas.parentElement;

  // Tooltip element
  var tooltip = document.createElement('div');
  tooltip.className = 'plot-tooltip';
  container.appendChild(tooltip);

  // T017: Zoom via mouse wheel
  canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    var s = plotCanvasStates[canvasId];
    if (!s) return;
    var factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    // Zoom toward mouse position
    var rect = canvas.getBoundingClientRect();
    var mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    var my = (e.clientY - rect.top) * (canvas.height / rect.height);
    var mathX = mx / s.zoom + s.dx;
    var mathY = (canvas.height - my) / s.zoom + s.dy;
    s.zoom *= factor;
    s.dx = mathX - mx / s.zoom;
    s.dy = mathY - (canvas.height - my) / s.zoom;
    plotLogoDraw(canvas, s.rawData, s.zoom, s.dx, s.dy);
  }, { passive: false });

  // T018: Pan via mouse drag
  var dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('mousemove', function(e) {
    var s = plotCanvasStates[canvasId];
    if (!s) return;
    if (dragging) {
      var rect = canvas.getBoundingClientRect();
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      s.dx -= (e.clientX - lastX) * scaleX / s.zoom;
      s.dy += (e.clientY - lastY) * scaleY / s.zoom;
      lastX = e.clientX; lastY = e.clientY;
      plotLogoDraw(canvas, s.rawData, s.zoom, s.dx, s.dy);
    }
    // T019: Coordinate hover
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (canvas.width / rect.width);
    var py = (e.clientY - rect.top) * (canvas.height / rect.height);
    var mx = px / s.zoom + s.dx;
    var my = (canvas.height - py) / s.zoom + s.dy;
    tooltip.textContent = '(' + mx.toFixed(2) + ', ' + my.toFixed(2) + ')';
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
    tooltip.style.top = (e.clientY - rect.top - 8) + 'px';
  });
  canvas.addEventListener('mouseup', function() { dragging = false; canvas.style.cursor = 'crosshair'; });
  canvas.addEventListener('mouseleave', function() { dragging = false; canvas.style.cursor = 'crosshair'; tooltip.style.display = 'none'; });
  canvas.style.cursor = 'crosshair';
}

// ── Direct JSXGraph rendering ─────────────────────────────
// Detects plot commands from the INPUT expression and renders
// directly with JSXGraph — no SVG parsing needed.

/** Parse a Giac list string "[3,5,2,8,1]" into an array of numbers */
function parseGiacList(str) {
  if (!str) return null;
  str = str.replace(/^\[|\]$/g, '').trim();
  if (!str) return null;
  var nums = str.split(',').map(function(s) { return parseFloat(s.trim()); });
  return nums.filter(function(n) { return !isNaN(n); });
}

/** Parse a Giac list of pairs "[[a,b],[c,d]]" or "[[\"A\",30],[\"B\",50]]" */
function parseGiacPairList(str) {
  if (!str) return null;
  var pairs = [];
  var re = /\[(?:"([^"]*)"|([\w.]+))\s*,\s*([\d.eE+-]+)\]/g;
  var m;
  while ((m = re.exec(str)) !== null) {
    pairs.push({ label: m[1] || m[2], value: parseFloat(m[3]) });
  }
  return pairs.length > 0 ? pairs : null;
}

/** Generate sample points for a function using a single caseval call */
function sampleFuncPoints(funcExpr, varName, xmin, xmax, nPoints) {
  nPoints = nPoints || 500;
  var step = (xmax - xmin) / nPoints;
  var seqExpr = 'seq(evalf(subst(' + funcExpr + ',' + varName + ',' + xmin + '+k*' + step + ')),k,0,' + nPoints + ')';
  var raw = caseval(seqExpr);
  var ys = parseGiacList(raw);
  if (!ys) return null;
  var xs = [];
  for (var i = 0; i < ys.length; i++) xs.push(xmin + i * step);
  return { xs: xs, ys: ys };
}

/** Extract x range from expressions like "x=-3..3" */
function parseRange(rangeExpr) {
  var m = rangeExpr.match(/(\w+)\s*=\s*([-\w.*\/]+)\.\.([-\w.*\/]+)/);
  if (!m) return null;
  var lo = parseFloat(caseval('evalf(' + m[2] + ')'));
  var hi = parseFloat(caseval('evalf(' + m[3] + ')'));
  if (isNaN(lo) || isNaN(hi)) return null;
  return { varName: m[1], min: lo, max: hi };
}

/** Convert a Giac math expression to a JavaScript function */
function giacExprToJSFunc(expr, vars) {
  try {
    var js = expr;
    // Replace math functions with Math.* equivalents (must come before constant/operator replacements)
    js = js.replace(/\b(sin|cos|tan|asin|acos|atan|exp|sqrt|abs|sinh|cosh|tanh)\s*\(/g, 'Math.$1(');
    js = js.replace(/\bln\s*\(/g, 'Math.log(');
    js = js.replace(/\blog\s*\(/g, 'Math.log(');
    // Replace constants (whole word)
    js = js.replace(/\bpi\b/g, '(Math.PI)');
    // Replace ^ with **
    js = js.replace(/\^/g, '**');
    // Implicit multiplication: digit followed by variable name
    vars.forEach(function(v) {
      var vre = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      js = js.replace(new RegExp('(\\d)(' + vre + ')\\b', 'g'), '$1*$2');
    });
    var fn = new Function(vars.join(','), 'return ' + js + ';');
    // Test evaluation to verify it works
    var testArgs = vars.map(function() { return 0.7; });
    var r = fn.apply(null, testArgs);
    if (typeof r !== 'number') return null;
    return fn;
  } catch(e) { return null; }
}

/** Create a JSXGraph board in outputEl with given bounding box */
function createJSXBoard(outputEl, bbox, opts) {
  var boardId = 'jsxgraph-' + (++jsxGraphBoardCounter);
  var wrapper = document.createElement('div');
  wrapper.className = 'jxgbox-container';
  var box = document.createElement('div');
  box.id = boardId;
  box.className = 'jxgbox';
  wrapper.appendChild(box);
  outputEl.appendChild(wrapper);
  var config = {
    boundingbox: [bbox.xmin, bbox.ymax, bbox.xmax, bbox.ymin],
    axis: true, showCopyright: false, showNavigation: true,
    pan: { enabled: true }, zoom: { enabled: true, wheel: true, pinch: true }
  };
  if (opts) for (var k in opts) config[k] = opts[k];
  var board = JXG.JSXGraph.initBoard(boardId, config);
  jsxGraphBoards[boardId] = board;
  return board;
}

/** Parse "[x,y]" or "[x=-3..3,y=-3..3]" into {vars, ranges} */
function parseVarList(str) {
  str = str.trim();
  if (str.charAt(0) === '[') str = str.slice(1, -1);
  var parts = splitTopLevel(str);
  var vars = [], ranges = [];
  parts.forEach(function(p) {
    p = p.trim();
    var r = parseRange(p);
    if (r) { vars.push(r.varName); ranges.push(r); }
    else { vars.push(p); ranges.push(null); }
  });
  return { vars: vars, ranges: ranges };
}

/** Parse a Giac complex number to [x, y] coordinates */
function parseComplexToPoint(str) {
  str = str.trim();
  try {
    var re = parseFloat(caseval('evalf(re(' + str + '))'));
    var im = parseFloat(caseval('evalf(im(' + str + '))'));
    if (!isNaN(re) && !isNaN(im)) return [re, im];
  } catch(e) {}
  return null;
}

/**
 * Try to render the expression directly with JSXGraph.
 * Returns true if successful, false to fall back to caseval pipeline.
 */
function tryDirectJSXGraph(expr, outputEl) {
  var m, data, plotData;

  // ── Multi-command support: "setting; plotcmd(...)" ──
  // If the expression contains semicolons and the last command is a plot
  // function, evaluate prefix commands for side effects (e.g. gl_ortho=1)
  // and process only the last command as a plot.
  if (expr.indexOf(';') >= 0) {
    var cmds = expr.split(';').map(function(s) { return s.trim(); }).filter(Boolean);
    if (cmds.length > 1) {
      var lastCmd = cmds[cmds.length - 1];
      // Check if the last command is a known plot function (but not geometry — handled below)
      var plotRe = /^(plot|plotfunc|camembert|barplot|histogram|boxwhisker|scatterplot|plotimplicit|plotfield|plotcontour|plotode|plotseq|plotparam|plotpolar)\s*\(/;
      if (plotRe.test(lastCmd)) {
        // Evaluate all preceding commands for side effects
        for (var i = 0; i < cmds.length - 1; i++) {
          caseval(cmds[i]);
        }
        // Recurse with only the plot command
        return tryDirectJSXGraph(lastCmd, outputEl);
      }
    }
  }

  // ── Helper: parse a plot(...) or plotfunc(...) expression ──
  // Uses splitTopLevel to properly handle nested parentheses.

  // ── plot(expr) or plot(expr,x) or plot([exprs],x) ──
  if (/^plot\(/.test(expr)) {
    var inner = expr.slice(5, -1); // strip "plot(" and ")"
    var args = splitTopLevel(inner);
    if (args.length >= 1) {
      var funcPart = args[0].trim(), v = (args[1] || 'x').trim();
      // Detect multi-function: plot([sin(x),cos(x)],x)
      if (funcPart.charAt(0) === '[' && funcPart.charAt(funcPart.length - 1) === ']') {
        var funcs = splitTopLevel(funcPart.slice(1, -1));
        var curves = [], allPts = [], colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628'];
        for (var i = 0; i < funcs.length; i++) {
          var pts = sampleFuncPoints(funcs[i].trim(), v, -10, 10);
          if (pts) { curves.push({ xs: pts.xs, ys: pts.ys, color: colors[i % colors.length] }); allPts.push(pts); }
        }
        if (curves.length > 0) {
          renderJSXGraphPlot(outputEl, { curves: curves, polygons: [], points: [], bbox: computeBBox(allPts) });
          return true;
        }
      } else {
        // Single function with optional range: plot(sin(x)) or plot(sin(x),x) or plot(sin(x),x=-5..5)
        var range = parseRange(v);
        var varName = range ? range.varName : v;
        var xmin = range ? range.min : -10, xmax = range ? range.max : 10;
        var pts = sampleFuncPoints(funcPart, varName, xmin, xmax);
        if (pts) {
          renderJSXGraphPlot(outputEl, { curves: [{ xs: pts.xs, ys: pts.ys, color: '#e41a1c' }], polygons: [], points: [], bbox: computeBBox([pts]) });
          return true;
        }
      }
    }
  }

  // ── plotfunc(expr,x) or plotfunc(expr,x=a..b) — 2D ONLY (skip 3D with [x,y]) ──
  if (/^plotfunc\(/.test(expr)) {
    var inner = expr.slice(9, -1); // strip "plotfunc(" and ")"
    var args = splitTopLevel(inner);
    if (args.length >= 2) {
      var lastArg = args[args.length - 1].trim();
      if (lastArg.charAt(0) === '[') {
        // 3D plotfunc: create canvas BEFORE caseval so Emscripten's SDL/WebGL
        // initializes on our canvas, not the hidden default one.
        if (!webglAvailable()) {
          outputEl.textContent = t('plot3dNotSupported');
          return true;
        }
        var gr = getGiacRenderer();
        if (!gr) { outputEl.textContent = t('plot3dNotSupported'); return true; }

        var container = document.createElement('div');
        container.className = 'gl3d-container';
        var canvas = document.createElement('canvas');
        canvas.id = 'gl3d_pending_' + Date.now();
        var cw = Math.min(outputEl.clientWidth || 600, 600);
        canvas.width = cw;
        canvas.height = Math.round(cw * 2 / 3);
        container.appendChild(canvas);
        outputEl.appendChild(container);

        // Set Module.canvas BEFORE caseval so SDL init targets our canvas
        var savedCanvas = Module.canvas;
        Module.canvas = canvas;

        var raw = caseval(expr);
        if (raw && raw.length > 5 && raw.substr(0, 5) === 'gl3d ') {
          var sceneId = raw.substr(5).trim();
          canvas.id = 'gl3d_' + sceneId;
          try { gr(sceneId); } catch(e) {
            container.innerHTML = '<div class="plot-3d-msg">' + t('plot3dNotSupported') + '</div>';
            Module.canvas = savedCanvas;
            return true;
          }
          // Mouse interaction
          var pushed = false, lastX = 0, lastY = 0;
          canvas.addEventListener('mousedown', function(e) { pushed = true; lastX = e.clientX; lastY = e.clientY; e.preventDefault(); });
          canvas.addEventListener('mouseup', function() { pushed = false; });
          canvas.addEventListener('mouseleave', function() { pushed = false; });
          canvas.addEventListener('mousemove', function(e) {
            if (!pushed) return;
            var dx = e.clientX - lastX, dy = e.clientY - lastY;
            if (Math.abs(dx) > 2) gr((dx > 0 ? 'r' : 'l') + sceneId);
            if (Math.abs(dy) > 2) gr((dy > 0 ? 'd' : 'u') + sceneId);
            lastX = e.clientX; lastY = e.clientY; e.preventDefault();
          });
          // Cleanup SDL keyboard listeners
          try {
            var kle = Module['keyboardListeningElement'] || document;
            if (typeof SDL !== 'undefined' && SDL.receiveEvent) {
              kle.removeEventListener('keydown', SDL.receiveEvent);
              kle.removeEventListener('keyup', SDL.receiveEvent);
              kle.removeEventListener('keypress', SDL.receiveEvent);
            }
          } catch(e) {}
        } else {
          // Not gl3d output — remove our canvas, show raw result
          container.remove();
          Module.canvas = savedCanvas;
          return false; // Fall through to normal pipeline
        }
        // Restore saved canvas reference for non-3D future calls
        // (keep Module.canvas = our canvas so rotation commands work)
        return true;
      } else {
        // 2D plotfunc
        var funcPart = args.slice(0, -1).join(',').trim();
        var funcs = (funcPart.charAt(0) === '[' && funcPart.charAt(funcPart.length - 1) === ']')
          ? splitTopLevel(funcPart.slice(1, -1)) : [funcPart];
        var range = parseRange(lastArg);
        var varName = range ? range.varName : lastArg;
        var xmin = range ? range.min : -10, xmax = range ? range.max : 10;
        var curves = [], allPts = [], colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628'];
        for (var i = 0; i < funcs.length; i++) {
          var pts = sampleFuncPoints(funcs[i].trim(), varName, xmin, xmax);
          if (pts) { curves.push({ xs: pts.xs, ys: pts.ys, color: colors[i % colors.length] }); allPts.push(pts); }
        }
        if (curves.length > 0) {
          renderJSXGraphPlot(outputEl, { curves: curves, polygons: [], points: [], bbox: computeBBox(allPts) });
          return true;
        }
      }
    }
  }

  // ── barplot([3,5,2,8,1]) ──
  m = expr.match(/^barplot\((.+)\)$/);
  if (m) {
    var vals = parseGiacList(caseval(m[1]));
    if (vals && vals.length > 0) {
      renderJSXBarPlot(outputEl, vals);
      return true;
    }
  }

  // ── histogram(data) ──
  m = expr.match(/^histogram\((.+)\)$/);
  if (m) {
    var vals = parseGiacList(caseval(m[1]));
    if (vals && vals.length > 0) {
      renderJSXHistogram(outputEl, vals);
      return true;
    }
  }

  // ── boxwhisker(data) ──
  m = expr.match(/^boxwhisker\((.+)\)$/);
  if (m) {
    var vals = parseGiacList(caseval(m[1]));
    if (vals && vals.length > 0) {
      renderJSXBoxPlot(outputEl, vals);
      return true;
    }
  }

  // ── scatterplot(xs, ys) ──
  m = expr.match(/^scatterplot\((.+)\)$/);
  if (m) {
    var args = splitTopLevel(m[1]);
    if (args.length === 2) {
      var xs = parseGiacList(caseval(args[0].trim()));
      var ys = parseGiacList(caseval(args[1].trim()));
      if (xs && ys && xs.length === ys.length) {
        renderJSXScatterPlot(outputEl, xs, ys);
        return true;
      }
    }
  }

  // ── camembert([["A",30],["B",50],["C",20]]) ──
  m = expr.match(/^camembert\((.+)\)$/);
  if (m) {
    // Try parsing from raw input first (preserves string labels)
    var pairs = parseGiacPairList(m[1]);
    if (!pairs) {
      // Fallback: evaluate through caseval
      try { pairs = parseGiacPairList(caseval(m[1])); } catch(e) {}
    }
    if (pairs) {
      renderJSXPieChart(outputEl, pairs);
      return true;
    }
  }

  // ── plotimplicit(expr, x, y) or plotimplicit(expr, x=a..b, y=c..d) ──
  if (/^plotimplicit\(/.test(expr)) {
    var inner = expr.slice(13, -1);
    var args = splitTopLevel(inner);
    if (args.length >= 3) {
      var fExpr = args[0].trim();
      var r1 = parseRange(args[1].trim()), r2 = parseRange(args[2].trim());
      var xVar = r1 ? r1.varName : args[1].trim();
      var yVar = r2 ? r2.varName : args[2].trim();
      var xmin = r1 ? r1.min : -5, xmax = r1 ? r1.max : 5;
      var ymin = r2 ? r2.min : -5, ymax = r2 ? r2.max : 5;
      var jsFn = giacExprToJSFunc(fExpr, [xVar, yVar]);
      if (jsFn) {
        var pad = Math.max(xmax - xmin, ymax - ymin) * 0.1;
        var bbox = { xmin: xmin - pad, xmax: xmax + pad, ymin: ymin - pad, ymax: ymax + pad };
        var board = createJSXBoard(outputEl, bbox, { keepAspectRatio: true });
        board.create('implicitcurve', [jsFn], {
          strokeColor: '#e41a1c', strokeWidth: 2, highlight: false
        });
        return true;
      }
    }
  }

  // ── plotfield(expr, [x,y]) ──
  if (/^plotfield\(/.test(expr)) {
    var inner = expr.slice(10, -1);
    var args = splitTopLevel(inner);
    if (args.length >= 2) {
      var fExpr = args[0].trim();
      var vl = parseVarList(args[1]);
      if (vl.vars.length >= 2) {
        var xVar = vl.vars[0], yVar = vl.vars[1];
        var xmin = vl.ranges[0] ? vl.ranges[0].min : -5, xmax = vl.ranges[0] ? vl.ranges[0].max : 5;
        var ymin = vl.ranges[1] ? vl.ranges[1].min : -5, ymax = vl.ranges[1] ? vl.ranges[1].max : 5;
        var jsFn = giacExprToJSFunc(fExpr, [xVar, yVar]);
        if (jsFn) {
          var pad = Math.max(xmax - xmin, ymax - ymin) * 0.1;
          var bbox = { xmin: xmin - pad, xmax: xmax + pad, ymin: ymin - pad, ymax: ymax + pad };
          var board = createJSXBoard(outputEl, bbox);
          var nx = 15, ny = 15;
          var dx = (xmax - xmin) / nx, dy = (ymax - ymin) / ny;
          var scale = Math.min(dx, dy) * 0.4;
          for (var i = 0; i <= nx; i++) {
            for (var j = 0; j <= ny; j++) {
              var px = xmin + i * dx, py = ymin + j * dy;
              var slope = jsFn(px, py);
              if (!isFinite(slope)) continue;
              var len = Math.sqrt(1 + slope * slope);
              var ddx = scale / len, ddy = scale * slope / len;
              var p1 = board.create('point', [px - ddx, py - ddy], { visible: false, fixed: true });
              var p2 = board.create('point', [px + ddx, py + ddy], { visible: false, fixed: true });
              board.create('arrow', [p1, p2], {
                strokeColor: '#377eb8', strokeWidth: 1.5,
                lastArrow: { type: 2, size: 4 },
                fixed: true, highlight: false
              });
            }
          }
          return true;
        }
      }
    }
  }

  // ── plotcontour(expr, [x=a..b,y=c..d]) ──
  if (/^plotcontour\(/.test(expr)) {
    var inner = expr.slice(12, -1);
    var args = splitTopLevel(inner);
    if (args.length >= 2) {
      var fExpr = args[0].trim();
      var vl = parseVarList(args[1]);
      if (vl.vars.length >= 2) {
        var xVar = vl.vars[0], yVar = vl.vars[1];
        var xmin = vl.ranges[0] ? vl.ranges[0].min : -5, xmax = vl.ranges[0] ? vl.ranges[0].max : 5;
        var ymin = vl.ranges[1] ? vl.ranges[1].min : -5, ymax = vl.ranges[1] ? vl.ranges[1].max : 5;
        var jsFn = giacExprToJSFunc(fExpr, [xVar, yVar]);
        if (jsFn) {
          // Sample to find value range
          var vmin = Infinity, vmax = -Infinity, ns = 30;
          for (var i = 0; i <= ns; i++) for (var j = 0; j <= ns; j++) {
            var v = jsFn(xmin + i * (xmax - xmin) / ns, ymin + j * (ymax - ymin) / ns);
            if (isFinite(v)) { if (v < vmin) vmin = v; if (v > vmax) vmax = v; }
          }
          var bbox = { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
          var board = createJSXBoard(outputEl, bbox);
          var nLevels = 10;
          var colors = ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e','#e6ab02','#a6761d','#666666','#e41a1c','#377eb8'];
          for (var k = 1; k < nLevels; k++) {
            var level = vmin + k * (vmax - vmin) / nLevels;
            (function(lev, col) {
              board.create('implicitcurve', [function(x, y) { return jsFn(x, y) - lev; }], {
                strokeColor: col, strokeWidth: 1.5, highlight: false
              });
            })(level, colors[k % colors.length]);
          }
          return true;
        }
      }
    }
  }

  // ── plotode(expr, [t,y], [t0,y0]) ──
  if (/^plotode\(/.test(expr)) {
    var inner = expr.slice(8, -1);
    var args = splitTopLevel(inner);
    if (args.length >= 3) {
      var fExpr = args[0].trim();
      var vl = parseVarList(args[1]);
      var initStr = args[2].trim();
      if (initStr.charAt(0) === '[') initStr = initStr.slice(1, -1);
      var initParts = splitTopLevel(initStr);
      var t0 = parseFloat(caseval('evalf(' + initParts[0].trim() + ')'));
      var y0 = parseFloat(caseval('evalf(' + initParts[1].trim() + ')'));
      if (vl.vars.length >= 2 && !isNaN(t0) && !isNaN(y0)) {
        var tVar = vl.vars[0], yVar = vl.vars[1];
        var jsFn = giacExprToJSFunc(fExpr, [tVar, yVar]);
        if (jsFn) {
          // RK4 integration forward and backward
          var dt = 0.02;
          var ts = [t0], ys = [y0];
          var t = t0, y = y0;
          for (var step = 0; step < 500; step++) {
            var k1 = jsFn(t, y);
            var k2 = jsFn(t + dt/2, y + dt*k1/2);
            var k3 = jsFn(t + dt/2, y + dt*k2/2);
            var k4 = jsFn(t + dt, y + dt*k3);
            y += dt * (k1 + 2*k2 + 2*k3 + k4) / 6;
            t += dt;
            if (!isFinite(y) || Math.abs(y) > 1e6) break;
            ts.push(t); ys.push(y);
          }
          t = t0; y = y0;
          for (var step = 0; step < 500; step++) {
            var k1 = jsFn(t, y);
            var k2 = jsFn(t - dt/2, y - dt*k1/2);
            var k3 = jsFn(t - dt/2, y - dt*k2/2);
            var k4 = jsFn(t - dt, y - dt*k3);
            y -= dt * (k1 + 2*k2 + 2*k3 + k4) / 6;
            t -= dt;
            if (!isFinite(y) || Math.abs(y) > 1e6) break;
            ts.unshift(t); ys.unshift(y);
          }
          var bbox = computeBBox([{ xs: ts, ys: ys }]);
          var board = createJSXBoard(outputEl, bbox);
          board.create('curve', [ts, ys], { strokeColor: '#e41a1c', strokeWidth: 2, highlight: false });
          board.create('point', [t0, y0], { strokeColor: '#e41a1c', fillColor: '#e41a1c', size: 4, fixed: true, name: '' });
          return true;
        }
      }
    }
  }

  // ── plotseq(expr, x0, n) — cobweb diagram ──
  if (/^plotseq\(/.test(expr)) {
    var inner = expr.slice(8, -1);
    var args = splitTopLevel(inner);
    if (args.length >= 3) {
      var fExpr = args[0].trim();
      var x0 = parseFloat(caseval('evalf(' + args[1].trim() + ')'));
      var nIter = parseInt(args[2].trim());
      if (!isNaN(x0) && !isNaN(nIter)) {
        var jsFn = giacExprToJSFunc(fExpr, ['x']);
        if (jsFn) {
          // Determine range by iterating and sampling
          var lo = x0, hi = x0;
          var xn = x0;
          for (var k = 0; k < nIter + 5; k++) {
            xn = jsFn(xn);
            if (!isFinite(xn)) break;
            if (xn < lo) lo = xn;
            if (xn > hi) hi = xn;
          }
          var pad = Math.max((hi - lo) * 0.3, 0.5);
          lo -= pad; hi += pad;

          var bbox = { xmin: lo, xmax: hi, ymin: lo, ymax: hi };
          var board = createJSXBoard(outputEl, bbox, { keepAspectRatio: true });

          // Plot y = f(x)
          var fxs = [], fys = [], nPts = 200;
          for (var k = 0; k <= nPts; k++) {
            var xv = lo + k * (hi - lo) / nPts;
            fxs.push(xv); fys.push(jsFn(xv));
          }
          board.create('curve', [fxs, fys], { strokeColor: '#377eb8', strokeWidth: 2 });

          // Plot y = x
          board.create('line', [[0, 0], [1, 1]], { strokeColor: '#999999', strokeWidth: 1, dash: 2 });

          // Cobweb staircase
          var cwXs = [x0, x0], cwYs = [0, jsFn(x0)];
          xn = x0;
          for (var k = 0; k < nIter; k++) {
            var yn = jsFn(xn);
            cwXs.push(yn); cwYs.push(yn);   // horizontal to y=x
            cwXs.push(yn); cwYs.push(jsFn(yn)); // vertical to f(x)
            xn = yn;
          }
          board.create('curve', [cwXs, cwYs], { strokeColor: '#e41a1c', strokeWidth: 1.5 });

          return true;
        }
      }
    }
  }

  // ── Geometry: circle, segment, point, triangle (multi-command with ;) ──
  if (/\b(circle|segment|point|triangle)\s*\(/.test(expr)) {
    var cmds = expr.split(';').map(function(s) { return s.trim(); }).filter(Boolean);
    var geomObjects = [];
    cmds.forEach(function(cmd) {
      var gm;
      // circle(center, radius)
      gm = cmd.match(/^circle\((.+?),\s*(.+)\)$/);
      if (gm) {
        var center = parseComplexToPoint(gm[1]);
        var radius = parseFloat(caseval('evalf(' + gm[2].trim() + ')'));
        if (center && !isNaN(radius) && radius > 0) {
          geomObjects.push({ type: 'circle', center: center, radius: radius });
        }
        return;
      }
      // segment([x1,y1],[x2,y2])
      gm = cmd.match(/^segment\(\[(.+?)\]\s*,\s*\[(.+?)\]\)$/);
      if (gm) {
        var c1 = gm[1].split(',').map(function(s) { return parseFloat(caseval('evalf(' + s.trim() + ')')); });
        var c2 = gm[2].split(',').map(function(s) { return parseFloat(caseval('evalf(' + s.trim() + ')')); });
        if (c1.length === 2 && c2.length === 2 && c1.every(isFinite) && c2.every(isFinite)) {
          geomObjects.push({ type: 'segment', p1: c1, p2: c2 });
        }
        return;
      }
      // point(x, y)
      gm = cmd.match(/^point\((.+?),\s*(.+)\)$/);
      if (gm) {
        var px = parseFloat(caseval('evalf(' + gm[1].trim() + ')'));
        var py = parseFloat(caseval('evalf(' + gm[2].trim() + ')'));
        if (isFinite(px) && isFinite(py)) {
          geomObjects.push({ type: 'point', coords: [px, py] });
        }
        return;
      }
      // triangle(a, b, c) — complex number vertices
      gm = cmd.match(/^triangle\((.+)\)$/);
      if (gm) {
        var tArgs = splitTopLevel(gm[1]);
        var verts = tArgs.map(function(a) { return parseComplexToPoint(a.trim()); }).filter(Boolean);
        if (verts.length === 3) {
          geomObjects.push({ type: 'triangle', vertices: verts });
        }
        return;
      }
    });

    if (geomObjects.length > 0) {
      // Compute bounding box
      var allXs = [], allYs = [];
      geomObjects.forEach(function(obj) {
        if (obj.type === 'circle') {
          allXs.push(obj.center[0] - obj.radius, obj.center[0] + obj.radius);
          allYs.push(obj.center[1] - obj.radius, obj.center[1] + obj.radius);
        } else if (obj.type === 'segment') {
          allXs.push(obj.p1[0], obj.p2[0]); allYs.push(obj.p1[1], obj.p2[1]);
        } else if (obj.type === 'point') {
          allXs.push(obj.coords[0]); allYs.push(obj.coords[1]);
        } else if (obj.type === 'triangle') {
          obj.vertices.forEach(function(v) { allXs.push(v[0]); allYs.push(v[1]); });
        }
      });
      var gxmin = Math.min.apply(null, allXs), gxmax = Math.max.apply(null, allXs);
      var gymin = Math.min.apply(null, allYs), gymax = Math.max.apply(null, allYs);
      var gpad = Math.max(gxmax - gxmin, gymax - gymin) * 0.2 || 1;
      var bbox = { xmin: gxmin - gpad, xmax: gxmax + gpad, ymin: gymin - gpad, ymax: gymax + gpad };
      // Make square for geometry
      var w = bbox.xmax - bbox.xmin, h = bbox.ymax - bbox.ymin;
      if (w > h) { var d = (w - h) / 2; bbox.ymin -= d; bbox.ymax += d; }
      else { var d = (h - w) / 2; bbox.xmin -= d; bbox.xmax += d; }

      var board = createJSXBoard(outputEl, bbox, { keepAspectRatio: true });
      var colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00'];
      var ci = 0;

      geomObjects.forEach(function(obj) {
        var color = colors[ci++ % colors.length];
        if (obj.type === 'circle') {
          var c = board.create('point', obj.center, { visible: false, fixed: true });
          board.create('circle', [c, obj.radius], {
            strokeColor: color, strokeWidth: 2, fillColor: 'none', highlight: false
          });
        } else if (obj.type === 'segment') {
          var pa = board.create('point', obj.p1, { visible: false, fixed: true });
          var pb = board.create('point', obj.p2, { visible: false, fixed: true });
          board.create('segment', [pa, pb], { strokeColor: color, strokeWidth: 2, highlight: false });
        } else if (obj.type === 'point') {
          board.create('point', obj.coords, {
            strokeColor: color, fillColor: color, size: 4, fixed: true, name: ''
          });
        } else if (obj.type === 'triangle') {
          var verts = obj.vertices.map(function(v) {
            return board.create('point', v, { visible: true, fixed: true, size: 2, strokeColor: color, fillColor: color, name: '' });
          });
          board.create('polygon', verts, {
            borders: { strokeColor: color, strokeWidth: 2 },
            fillColor: color, fillOpacity: 0.1,
            vertices: { visible: true }, highlight: false
          });
        }
      });

      return true;
    }
  }

  return false; // Not recognized — fall back to caseval pipeline
}

/** Split "sin(x),cos(x)" respecting parentheses */
function splitTopLevel(str) {
  var parts = [], depth = 0, start = 0;
  for (var i = 0; i < str.length; i++) {
    if (str[i] === '(' || str[i] === '[') depth++;
    else if (str[i] === ')' || str[i] === ']') depth--;
    else if (str[i] === ',' && depth === 0) {
      parts.push(str.substring(start, i));
      start = i + 1;
    }
  }
  parts.push(str.substring(start));
  return parts;
}

/** Compute bounding box from arrays of point sets */
function computeBBox(ptSets) {
  var allXs = [], allYs = [];
  ptSets.forEach(function(pts) {
    pts.xs.forEach(function(x) { if (isFinite(x)) allXs.push(x); });
    pts.ys.forEach(function(y) { if (isFinite(y)) allYs.push(y); });
  });
  var xmin = Math.min.apply(null, allXs), xmax = Math.max.apply(null, allXs);
  var ymin = Math.min.apply(null, allYs), ymax = Math.max.apply(null, allYs);
  var padX = (xmax - xmin) * 0.08 || 1, padY = (ymax - ymin) * 0.08 || 1;
  return { xmin: xmin - padX, xmax: xmax + padX, ymin: ymin - padY, ymax: ymax + padY };
}

/** Render a bar plot with JSXGraph */
function renderJSXBarPlot(outputEl, vals) {
  var polygons = [], maxVal = Math.max.apply(null, vals);
  for (var i = 0; i < vals.length; i++) {
    polygons.push({
      corners: [[i + 0.1, 0], [i + 0.9, 0], [i + 0.9, vals[i]], [i + 0.1, vals[i]]],
      color: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#999999'][i % 8]
    });
  }
  var bbox = { xmin: -0.5, xmax: vals.length + 0.5, ymin: -maxVal * 0.1, ymax: maxVal * 1.15 };
  renderJSXGraphPlot(outputEl, { curves: [], polygons: polygons, points: [], bbox: bbox });
}

/** Render a histogram with JSXGraph */
function renderJSXHistogram(outputEl, vals) {
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  var nBins = Math.max(5, Math.min(30, Math.ceil(Math.sqrt(vals.length))));
  var binWidth = (max - min) / nBins || 1;
  var bins = new Array(nBins).fill(0);
  vals.forEach(function(v) {
    var idx = Math.min(Math.floor((v - min) / binWidth), nBins - 1);
    bins[idx]++;
  });
  var maxCount = Math.max.apply(null, bins);
  var polygons = [];
  for (var i = 0; i < nBins; i++) {
    var x0 = min + i * binWidth, x1 = x0 + binWidth;
    polygons.push({
      corners: [[x0, 0], [x1, 0], [x1, bins[i]], [x0, bins[i]]],
      color: '#377eb8'
    });
  }
  var bbox = { xmin: min - binWidth, xmax: max + binWidth, ymin: -maxCount * 0.1, ymax: maxCount * 1.2 };
  renderJSXGraphPlot(outputEl, { curves: [], polygons: polygons, points: [], bbox: bbox });
}

/** Render a box-and-whisker plot with JSXGraph */
function renderJSXBoxPlot(outputEl, vals) {
  vals.sort(function(a, b) { return a - b; });
  var n = vals.length;
  var q1 = vals[Math.floor(n * 0.25)], q2 = vals[Math.floor(n * 0.5)], q3 = vals[Math.floor(n * 0.75)];
  var vmin = vals[0], vmax = vals[n - 1];
  var range = vmax - vmin || 1;
  var polygons = [
    // Box (Q1 to Q3)
    { corners: [[0.3, q1], [0.7, q1], [0.7, q3], [0.3, q3]], color: '#377eb8' }
  ];
  var curves = [
    // Median line
    { xs: [0.3, 0.7], ys: [q2, q2], color: '#e41a1c' },
    // Lower whisker
    { xs: [0.5, 0.5], ys: [vmin, q1], color: 'black' },
    { xs: [0.4, 0.6], ys: [vmin, vmin], color: 'black' },
    // Upper whisker
    { xs: [0.5, 0.5], ys: [q3, vmax], color: 'black' },
    { xs: [0.4, 0.6], ys: [vmax, vmax], color: 'black' }
  ];
  var bbox = { xmin: -0.5, xmax: 1.5, ymin: vmin - range * 0.15, ymax: vmax + range * 0.15 };
  renderJSXGraphPlot(outputEl, { curves: curves, polygons: polygons, points: [], bbox: bbox });
}

/** Render a scatter plot with JSXGraph */
function renderJSXScatterPlot(outputEl, xs, ys) {
  var pts = [];
  for (var i = 0; i < xs.length; i++) pts.push({ x: xs[i], y: ys[i], color: '#e41a1c' });
  var bbox = computeBBox([{ xs: xs, ys: ys }]);
  renderJSXGraphPlot(outputEl, { curves: [], polygons: [], points: pts, bbox: bbox });
}

/** Render a pie chart with JSXGraph */
function renderJSXPieChart(outputEl, pairs) {
  var total = pairs.reduce(function(s, p) { return s + p.value; }, 0);
  if (total <= 0) return;
  var colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#999999'];
  var bbox = { xmin: -1.5, xmax: 1.5, ymin: -1.5, ymax: 1.5 };
  var board = createJSXBoard(outputEl, bbox, { keepAspectRatio: true, axis: false });
  var angle = 0;
  pairs.forEach(function(p, idx) {
    var sweep = (p.value / total) * 2 * Math.PI;
    var xs = [0], ys = [0];
    var steps = Math.max(20, Math.round(sweep * 30));
    for (var s = 0; s <= steps; s++) {
      var a = angle + sweep * s / steps;
      xs.push(Math.cos(a));
      ys.push(Math.sin(a));
    }
    xs.push(0); ys.push(0); // close the sector
    board.create('curve', [xs, ys], {
      strokeColor: '#fff', strokeWidth: 1.5,
      fillColor: colors[idx % colors.length], fillOpacity: 0.85,
      highlight: false
    });
    // Label at midpoint of sector
    var midAngle = angle + sweep / 2;
    var pct = Math.round(p.value / total * 100);
    board.create('text', [0.65 * Math.cos(midAngle), 0.65 * Math.sin(midAngle), p.label + ' ' + pct + '%'], {
      anchorX: 'middle', anchorY: 'middle', fontSize: 12, highlight: false
    });
    angle += sweep;
  });
}

// ── JSXGraph board management ─────────────────────────────

function jsxGraphAvailable() {
  return typeof JXG !== 'undefined' && JXG.JSXGraph;
}

var jsxGraphBoardCounter = 0;
var jsxGraphBoards = {};

function cleanupJSXGraphBoard(boardId) {
  if (jsxGraphBoards[boardId]) {
    try { JXG.JSXGraph.freeBoard(jsxGraphBoards[boardId]); } catch(e) {}
    delete jsxGraphBoards[boardId];
  }
}

function cleanupJSXGraphInElement(el) {
  var boxes = el.querySelectorAll('.jxgbox');
  boxes.forEach(function(box) { cleanupJSXGraphBoard(box.id); });
}

/** Parse Giac SVG output into curve data for JSXGraph */
function parseSvgPlotData(svgString) {
  var parser = new DOMParser();
  // Use text/html (lenient) because Giac SVG may have malformed attributes (missing spaces)
  var doc = parser.parseFromString(svgString, 'text/html');
  var svg = doc.querySelector('svg');
  if (!svg) return null;

  // Giac SVG uses math coordinates directly in line/path elements.
  // A <g transform="scale(1,-1)"> handles the y-flip for SVG rendering.
  // We read the raw attribute values as math coordinates — no y-negation needed.

  var curves = [];
  var defaultColors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628'];
  var colorIdx = 0;

  // Group <line> elements by color+strokeWidth
  var lineGroups = {};
  var lines = svg.querySelectorAll('line');
  lines.forEach(function(ln) {
    var x1 = parseFloat(ln.getAttribute('x1')), y1 = parseFloat(ln.getAttribute('y1'));
    var x2 = parseFloat(ln.getAttribute('x2')), y2 = parseFloat(ln.getAttribute('y2'));
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return;
    var color = ln.getAttribute('stroke') || 'black';
    var sw = parseFloat(ln.getAttribute('stroke-width')) || 1;
    var key = color + '|' + sw;
    if (!lineGroups[key]) lineGroups[key] = { color: color, strokeWidth: sw, segments: [] };
    lineGroups[key].segments.push({ x1: x1, y1: y1, x2: x2, y2: y2 });
  });

  // Build curves from line groups — need many segments (skip axes/borders)
  Object.keys(lineGroups).forEach(function(key) {
    var group = lineGroups[key];
    // Plot curves have many segments (50+), axis/border lines have few (<10)
    if (group.segments.length < 10) return;
    var segs = group.segments;
    var xs = [segs[0].x1], ys = [segs[0].y1];
    for (var i = 0; i < segs.length; i++) {
      xs.push(segs[i].x2); ys.push(segs[i].y2);
    }
    if (xs.length > 1) {
      curves.push({ xs: xs, ys: ys, color: group.color });
    }
  });

  // Extract polyline elements
  var polylines = svg.querySelectorAll('polyline');
  polylines.forEach(function(pl) {
    var pts = pl.getAttribute('points');
    if (!pts) return;
    var pairs = pts.trim().split(/\s+/);
    var xs = [], ys = [];
    pairs.forEach(function(p) {
      var xy = p.split(',');
      if (xy.length === 2) {
        xs.push(parseFloat(xy[0]));
        ys.push(parseFloat(xy[1]));
      }
    });
    if (xs.length > 1) {
      var color = pl.getAttribute('stroke') || defaultColors[colorIdx++ % defaultColors.length];
      curves.push({ xs: xs, ys: ys, color: color });
    }
  });

  var polygons = [];
  var points = [];

  // Extract <circle> elements — large circles as curves, small ones as points
  var circles = svg.querySelectorAll('circle');
  circles.forEach(function(circ) {
    var cx = parseFloat(circ.getAttribute('cx')) || 0;
    var cy = parseFloat(circ.getAttribute('cy')) || 0;
    var r = parseFloat(circ.getAttribute('r'));
    if (isNaN(r) || r <= 0) return;
    var color = circ.getAttribute('stroke') || circ.getAttribute('fill') || defaultColors[colorIdx++ % defaultColors.length];
    if (r < 5) {
      // Small circle = scatter point
      points.push({ x: cx, y: cy, color: color });
    } else {
      // Large circle = curve
      var xs = [], ys = [], steps = 64;
      for (var s = 0; s <= steps; s++) {
        var a = 2 * Math.PI * s / steps;
        xs.push(cx + r * Math.cos(a));
        ys.push(cy + r * Math.sin(a));
      }
      curves.push({ xs: xs, ys: ys, color: color });
    }
  });

  // Extract <ellipse> elements
  var ellipses = svg.querySelectorAll('ellipse');
  ellipses.forEach(function(el) {
    var cx = parseFloat(el.getAttribute('cx')) || 0;
    var cy = parseFloat(el.getAttribute('cy')) || 0;
    var rx = parseFloat(el.getAttribute('rx'));
    var ry = parseFloat(el.getAttribute('ry'));
    if (isNaN(rx) || isNaN(ry) || rx <= 0 || ry <= 0) return;
    var xs = [], ys = [], steps = 64;
    for (var s = 0; s <= steps; s++) {
      var a = 2 * Math.PI * s / steps;
      xs.push(cx + rx * Math.cos(a));
      ys.push(cy + ry * Math.sin(a));
    }
    var color = el.getAttribute('stroke') || defaultColors[colorIdx++ % defaultColors.length];
    curves.push({ xs: xs, ys: ys, color: color });
  });

  // Extract <rect> elements (bars in histograms/barplots, boxes in boxwhisker)
  var rects = svg.querySelectorAll('rect');
  rects.forEach(function(rect) {
    var x = parseFloat(rect.getAttribute('x')) || 0;
    var y = parseFloat(rect.getAttribute('y')) || 0;
    var w = parseFloat(rect.getAttribute('width'));
    var h = parseFloat(rect.getAttribute('height'));
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
    var fill = rect.getAttribute('fill') || rect.getAttribute('stroke') || defaultColors[colorIdx++ % defaultColors.length];
    if (fill === 'none' || fill === 'white' || fill === '#ffffff') return; // skip background rects
    polygons.push({
      corners: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
      color: fill
    });
  });

  // Extract <polygon> elements
  var svgPolygons = svg.querySelectorAll('polygon');
  svgPolygons.forEach(function(pg) {
    var pts = pg.getAttribute('points');
    if (!pts) return;
    var corners = [];
    pts.trim().split(/\s+/).forEach(function(p) {
      var xy = p.split(',');
      if (xy.length === 2) corners.push([parseFloat(xy[0]), parseFloat(xy[1])]);
    });
    if (corners.length >= 3) {
      var fill = pg.getAttribute('fill') || pg.getAttribute('stroke') || defaultColors[colorIdx++ % defaultColors.length];
      polygons.push({ corners: corners, color: fill });
    }
  });

  // Extract path elements (supports both absolute and relative commands)
  var paths = svg.querySelectorAll('path');
  paths.forEach(function(path) {
    var d = path.getAttribute('d');
    if (!d) return;
    var xs = [], ys = [];
    var commands = d.match(/[MLCQZAHVmlcqzahv][^MLCQZAHVmlcqzahv]*/g);
    if (!commands) return;
    var curX = 0, curY = 0;
    commands.forEach(function(cmd) {
      var type = cmd.charAt(0);
      var nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
      var rel = (type === type.toLowerCase()); // relative if lowercase
      var T = type.toUpperCase();
      if (T === 'M' || T === 'L') {
        for (var i = 0; i + 1 < nums.length; i += 2) {
          curX = rel ? curX + nums[i] : nums[i];
          curY = rel ? curY + nums[i + 1] : nums[i + 1];
          xs.push(curX); ys.push(curY);
        }
      } else if (T === 'H') {
        for (var i = 0; i < nums.length; i++) {
          curX = rel ? curX + nums[i] : nums[i];
          xs.push(curX); ys.push(curY);
        }
      } else if (T === 'V') {
        for (var i = 0; i < nums.length; i++) {
          curY = rel ? curY + nums[i] : nums[i];
          xs.push(curX); ys.push(curY);
        }
      } else if (T === 'C') {
        for (var i = 0; i + 5 < nums.length; i += 6) {
          var px = curX, py = curY;
          var cp1x = rel ? px + nums[i] : nums[i], cp1y = rel ? py + nums[i+1] : nums[i+1];
          var cp2x = rel ? px + nums[i+2] : nums[i+2], cp2y = rel ? py + nums[i+3] : nums[i+3];
          var ex = rel ? px + nums[i+4] : nums[i+4], ey = rel ? py + nums[i+5] : nums[i+5];
          for (var t = 1; t <= 20; t++) {
            var u = t / 20, u2 = u*u, u3 = u2*u, inv = 1-u, inv2 = inv*inv, inv3 = inv2*inv;
            xs.push(inv3*px + 3*inv2*u*cp1x + 3*inv*u2*cp2x + u3*ex);
            ys.push(inv3*py + 3*inv2*u*cp1y + 3*inv*u2*cp2y + u3*ey);
          }
          curX = ex; curY = ey;
        }
      } else if (T === 'Q') {
        for (var i = 0; i + 3 < nums.length; i += 4) {
          var px = curX, py = curY;
          var cpx = rel ? px + nums[i] : nums[i], cpy = rel ? py + nums[i+1] : nums[i+1];
          var ex = rel ? px + nums[i+2] : nums[i+2], ey = rel ? py + nums[i+3] : nums[i+3];
          for (var t = 1; t <= 20; t++) {
            var u = t / 20, inv = 1-u;
            xs.push(inv*inv*px + 2*inv*u*cpx + u*u*ex);
            ys.push(inv*inv*py + 2*inv*u*cpy + u*u*ey);
          }
          curX = ex; curY = ey;
        }
      } else if (T === 'A') {
        // Arc: rx ry x-rotation large-arc sweep-flag x y
        for (var i = 0; i + 6 < nums.length; i += 7) {
          var ex = rel ? curX + nums[i+5] : nums[i+5];
          var ey = rel ? curY + nums[i+6] : nums[i+6];
          // Approximate arc with line segments
          var steps = 20;
          for (var t = 1; t <= steps; t++) {
            var u = t / steps;
            xs.push(curX + (ex - curX) * u);
            ys.push(curY + (ey - curY) * u);
          }
          curX = ex; curY = ey;
        }
      }
    });
    if (xs.length > 1) {
      var color = path.getAttribute('stroke') || defaultColors[colorIdx++ % defaultColors.length];
      curves.push({ xs: xs, ys: ys, color: color });
    }
  });

  if (curves.length === 0 && polygons.length === 0 && points.length === 0) return null;

  // Compute tight bounding box from all data
  var allXs = [], allYs = [];
  curves.forEach(function(c) { allXs = allXs.concat(c.xs); allYs = allYs.concat(c.ys); });
  polygons.forEach(function(p) { p.corners.forEach(function(c) { allXs.push(c[0]); allYs.push(c[1]); }); });
  points.forEach(function(p) { allXs.push(p.x); allYs.push(p.y); });
  var dataXmin = Math.min.apply(null, allXs), dataXmax = Math.max.apply(null, allXs);
  var dataYmin = Math.min.apply(null, allYs), dataYmax = Math.max.apply(null, allYs);
  var padX = (dataXmax - dataXmin) * 0.08 || 1;
  var padY = (dataYmax - dataYmin) * 0.08 || 1;
  var bbox = {
    xmin: dataXmin - padX, xmax: dataXmax + padX,
    ymin: dataYmin - padY, ymax: dataYmax + padY
  };

  return { curves: curves, polygons: polygons, points: points, bbox: bbox };
}

/** Parse gr2d(logo(...)) output into curve data for JSXGraph */
function parseGr2dLogoData(gr2dString) {
  var inner = gr2dString.substr(5, gr2dString.length - 6); // strip "gr2d(" and ")"
  if (inner.length < 6 || inner.substr(0, 5) !== 'logo(') return null;
  var logoData = inner.substr(5, inner.length - 6);
  var v;
  try { v = JSON.parse(logoData); } catch(e) {
    try { v = (0, eval)(logoData); } catch(e2) { return null; }
  }
  if (!Array.isArray(v) || v.length < 2) return null;

  // Group consecutive pen-down vertices by color into curve segments
  var curves = [];
  var currentXs = [], currentYs = [], currentColor = null;

  for (var k = 1; k < v.length; k++) {
    var prec = v[k - 1], cur = v[k];
    // Skip text labels
    if (cur[5] && cur[5].length) continue;
    var penDown = prec[3] & 1;
    var colorIdx = prec[3] >> 11;
    var color = plotResolveColor(colorIdx);

    if (penDown && cur[4] === 0) { // Normal line segment (not arc/polygon)
      if (color !== currentColor) {
        // Flush previous segment
        if (currentXs.length > 1) {
          curves.push({ xs: currentXs.slice(), ys: currentYs.slice(), color: currentColor });
        }
        currentXs = [prec[0]]; currentYs = [prec[1]];
        currentColor = color;
      } else if (currentXs.length === 0) {
        currentXs.push(prec[0]); currentYs.push(prec[1]);
      }
      currentXs.push(cur[0]); currentYs.push(cur[1]);
    } else {
      // Flush on non-line segment
      if (currentXs.length > 1) {
        curves.push({ xs: currentXs.slice(), ys: currentYs.slice(), color: currentColor });
      }
      currentXs = []; currentYs = []; currentColor = null;

      // Handle arcs: sample points along the arc
      if (cur[4] > 0) {
        var radius = cur[4];
        var r = radius & 0x1ff;
        var theta1 = prec[2] + ((radius >> 9) & 0x1ff);
        var theta2 = prec[2] + ((radius >> 18) & 0x1ff);
        var angle1 = theta1 * Math.PI / 180;
        var angle2 = theta2 * Math.PI / 180;
        var cx = cur[0] - r * Math.cos((theta2 - 90) * Math.PI / 180);
        var cy = cur[1] - r * Math.sin((theta2 - 90) * Math.PI / 180);
        var arcColor = plotResolveColor(cur[3] >> 11);
        var arcXs = [], arcYs = [];
        var steps = Math.max(40, Math.abs(theta2 - theta1));
        for (var s = 0; s <= steps; s++) {
          var a = ((theta1 - 90) + (theta2 - theta1 - 90 + 90) * s / steps) * Math.PI / 180;
          // Simpler: linearly interpolate angle
          var aa = angle1 + (angle2 - angle1) * s / steps;
          arcXs.push(cx + r * Math.cos(aa));
          arcYs.push(cy + r * Math.sin(aa));
        }
        if (arcXs.length > 1) {
          curves.push({ xs: arcXs, ys: arcYs, color: arcColor });
        }
      }
    }
  }
  // Flush final segment
  if (currentXs.length > 1) {
    curves.push({ xs: currentXs.slice(), ys: currentYs.slice(), color: currentColor });
  }

  if (curves.length === 0) return null;

  // Compute bounding box
  var allXs = [], allYs = [];
  curves.forEach(function(c) { allXs = allXs.concat(c.xs); allYs = allYs.concat(c.ys); });
  var xmin = Math.min.apply(null, allXs), xmax = Math.max.apply(null, allXs);
  var ymin = Math.min.apply(null, allYs), ymax = Math.max.apply(null, allYs);
  var padX = (xmax - xmin) * 0.08 || 1;
  var padY = (ymax - ymin) * 0.08 || 1;

  return {
    curves: curves,
    bbox: { xmin: xmin - padX, xmax: xmax + padX, ymin: ymin - padY, ymax: ymax + padY }
  };
}

/** Render plot data using JSXGraph */
function renderJSXGraphPlot(outputEl, plotData) {
  var boardId = 'jsxgraph-' + (++jsxGraphBoardCounter);
  var wrapper = document.createElement('div');
  wrapper.className = 'jxgbox-container';
  var box = document.createElement('div');
  box.id = boardId;
  box.className = 'jxgbox';
  wrapper.appendChild(box);
  outputEl.appendChild(wrapper);

  var bb = plotData.bbox;
  var board = JXG.JSXGraph.initBoard(boardId, {
    boundingbox: [bb.xmin, bb.ymax, bb.xmax, bb.ymin],
    axis: true,
    showCopyright: false,
    showNavigation: true,
    pan: { enabled: true },
    zoom: { enabled: true, wheel: true, pinch: true }
  });

  var defaultColors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628'];
  plotData.curves.forEach(function(curve, idx) {
    var color = curve.color || defaultColors[idx % defaultColors.length];
    board.create('curve', [curve.xs, curve.ys], {
      strokeColor: color,
      strokeWidth: 2,
      highlight: false
    });
  });

  // Render filled polygons (rects from histograms/barplots, SVG polygons)
  if (plotData.polygons) {
    plotData.polygons.forEach(function(pg) {
      var verts = pg.corners.map(function(c) {
        return board.create('point', c, { visible: false, fixed: true });
      });
      board.create('polygon', verts, {
        fillColor: pg.color,
        fillOpacity: 0.7,
        borders: { strokeColor: pg.color, strokeWidth: 1 },
        vertices: { visible: false },
        highlight: false
      });
    });
  }

  // Render scatter points
  if (plotData.points) {
    plotData.points.forEach(function(pt) {
      board.create('point', [pt.x, pt.y], {
        strokeColor: pt.color,
        fillColor: pt.color,
        size: 3,
        fixed: true,
        highlight: false
      });
    });
  }

  // Render text labels (for pie charts etc.)
  if (plotData.labels) {
    plotData.labels.forEach(function(lbl) {
      board.create('text', [lbl.x, lbl.y, lbl.text], {
        anchorX: 'middle',
        anchorY: 'middle',
        fontSize: 14,
        fixed: true,
        highlight: false
      });
    });
  }

  jsxGraphBoards[boardId] = board;
  return board;
}

// ── gl3d 3D Plot Rendering ─────────────────────────────────
// Uses Giac's built-in OpenGL renderer compiled to WebGL via Emscripten.
// No external 3D library needed — giac_renderer() draws directly to canvas.

function webglAvailable() {
  try {
    var c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch(e) { return false; }
}

var gl3dRendererFn = null;

function getGiacRenderer() {
  if (gl3dRendererFn) return gl3dRendererFn;
  try {
    gl3dRendererFn = Module.cwrap('_ZN4giac13giac_rendererEPKc', 'number', ['string']);
    return gl3dRendererFn;
  } catch(e) { return null; }
}

function renderGl3dPlot(outputEl, sceneId) {
  // Check WebGL availability
  if (UI.disable3d || !webglAvailable()) {
    var msg = document.createElement('div');
    msg.className = 'plot-3d-msg';
    msg.textContent = t('plot3dNotSupported');
    outputEl.appendChild(msg);
    return;
  }

  var gr = getGiacRenderer();
  if (!gr) {
    var msg = document.createElement('div');
    msg.className = 'plot-3d-msg';
    msg.textContent = t('plot3dNotSupported');
    outputEl.appendChild(msg);
    return;
  }

  // Create canvas with required ID pattern for Giac's renderer
  var canvasId = 'gl3d_' + sceneId;
  var container = document.createElement('div');
  container.className = 'gl3d-container';

  var canvas = document.createElement('canvas');
  canvas.id = canvasId;
  // Responsive: use container width but cap at 600px
  var containerWidth = Math.min(outputEl.clientWidth || 600, 600);
  canvas.width = containerWidth;
  canvas.height = Math.round(containerWidth * 2 / 3); // 3:2 aspect ratio
  container.appendChild(canvas);
  outputEl.appendChild(container);

  // Point Emscripten's GL output to this canvas, then render
  Module.canvas = canvas;
  try {
    gr(sceneId);
  } catch(e) {
    container.innerHTML = '';
    var msg = document.createElement('div');
    msg.className = 'plot-3d-msg';
    msg.textContent = t('plot3dNotSupported');
    container.appendChild(msg);
    return;
  }

  // Mouse interaction for 3D rotation
  var pushed = false, lastX = 0, lastY = 0;

  canvas.addEventListener('mousedown', function(e) {
    pushed = true;
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault();
  });

  canvas.addEventListener('mouseup', function() { pushed = false; });
  canvas.addEventListener('mouseleave', function() { pushed = false; });

  canvas.addEventListener('mousemove', function(e) {
    if (!pushed) return;
    var dx = e.clientX - lastX;
    var dy = e.clientY - lastY;
    if (Math.abs(dx) > 2) {
      gr((dx > 0 ? 'r' : 'l') + sceneId);
    }
    if (Math.abs(dy) > 2) {
      gr((dy > 0 ? 'd' : 'u') + sceneId);
    }
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault();
  });

  // Clean up SDL keyboard listeners that Emscripten attaches
  try {
    var kle = Module['keyboardListeningElement'] || document;
    if (typeof SDL !== 'undefined' && SDL.receiveEvent) {
      kle.removeEventListener('keydown', SDL.receiveEvent);
      kle.removeEventListener('keyup', SDL.receiveEvent);
      kle.removeEventListener('keypress', SDL.receiveEvent);
    }
  } catch(e) { /* SDL may not exist */ }
}


// ─────────────────────────────────────────────────────────────
