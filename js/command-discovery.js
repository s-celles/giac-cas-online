'use strict';

// ─────────────────────────────────────────────────────────────
// Command Discovery — search, browse, and explore GIAC commands
//
// Inspired by Giac.jl command discovery API:
//   https://s-celles.github.io/Giac.jl/dev/command_discovery_help/
//
// Public API:
//   isDiscoveryQuery(input)              — detect discovery function calls
//   runDiscoveryQuery(fn, args)          — execute and return HTML
//   renderDiscoveryResult(cellId, html)  — render into cell output
// ─────────────────────────────────────────────────────────────

// ── Query detection ──────────────────────────────────────────

function isDiscoveryQuery(input) {
  if (!input) return null;
  var s = input.trim();

  // No-arg functions
  var noArg = s.match(/^(list_commands|help_count|list_categories)\(\s*\)$/);
  if (noArg) return { fn: noArg[1], args: [] };

  // Single string-arg functions: fn("arg") or fn('arg') or fn(arg)
  var oneArg = s.match(/^(search_commands|search_commands_by_description|commands_in_category|command_info|suggest_commands)\(\s*["']?([^"')]*?)["']?\s*\)$/);
  if (oneArg) return { fn: oneArg[1], args: [oneArg[2]] };

  return null;
}

// ── Levenshtein distance ─────────────────────────────────────

function _levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  var matrix = [];
  for (var i = 0; i <= b.length; i++) matrix[i] = [i];
  for (var j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (var i = 1; i <= b.length; i++) {
    for (var j = 1; j <= a.length; j++) {
      var cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

// ── Discovery handlers ───────────────────────────────────────

function _discoveryGetCommands() {
  // Kernel-aware: use active kernel's command list if available
  if (typeof KernelRegistry !== 'undefined' && KernelRegistry.active) {
    var cmds = KernelRegistry.active.getCommands();
    if (cmds && cmds.length > 0) return cmds;
  }
  // Fallback to GIAC-specific sources
  if (typeof COMMAND_MENU !== 'undefined' && COMMAND_MENU.allCommands) {
    return COMMAND_MENU.allCommands.filter(function(c) { return c.length > 0; });
  }
  if (typeof GIAC_HELP !== 'undefined') return Object.keys(GIAC_HELP.cmds).sort();
  return [];
}

function _discoverySearchCommands(pattern) {
  var cmds = _discoveryGetCommands();
  if (!pattern) return _discoveryWrap('search_commands("")', 'Provide a search pattern (prefix or regex).', []);

  var results;
  // Try as regex first
  try {
    var re = new RegExp(pattern, 'i');
    results = cmds.filter(function(c) { return re.test(c); });
  } catch(e) {
    // Fallback to prefix match
    var lower = pattern.toLowerCase();
    results = cmds.filter(function(c) { return c.toLowerCase().indexOf(lower) === 0; });
  }

  var title = 'search_commands("' + _esc(pattern) + '")';
  var subtitle = results.length + ' command' + (results.length !== 1 ? 's' : '') + ' matching';
  return _discoveryWrap(title, subtitle, results);
}

function _discoverySearchByDescription(query) {
  if (typeof GIAC_HELP === 'undefined') return _discoveryWrap('search_commands_by_description', 'Help data not loaded.', []);
  if (!query) return _discoveryWrap('search_commands_by_description("")', 'Provide a search query.', []);

  var words = query.toLowerCase().split(/\s+/);
  var cmds = Object.keys(GIAC_HELP.cmds).sort();
  var results = [];

  for (var i = 0; i < cmds.length; i++) {
    var desc = (GIAC_HELP.cmds[cmds[i]].d || '').toLowerCase();
    var allMatch = true;
    for (var w = 0; w < words.length; w++) {
      if (desc.indexOf(words[w]) === -1) { allMatch = false; break; }
    }
    if (allMatch) results.push(cmds[i]);
    if (results.length >= 50) break;
  }

  var title = 'search_commands_by_description("' + _esc(query) + '")';
  var subtitle = results.length + ' command' + (results.length !== 1 ? 's' : '') + ' found' + (results.length >= 50 ? ' (showing first 50)' : '');
  return _discoveryWrapWithDesc(title, subtitle, results);
}

function _discoveryListCommands() {
  var cmds = _discoveryGetCommands();
  var title = 'list_commands()';
  var subtitle = cmds.length + ' commands available';
  return _discoveryWrap(title, subtitle, cmds);
}

function _discoveryHelpCount() {
  var count = _discoveryGetCommands().length;
  return '<div class="discovery-result"><div class="discovery-header"><code>help_count()</code></div>' +
    '<div class="discovery-count">' + count + '</div></div>';
}

function _discoveryListCategories() {
  if (typeof COMMAND_MENU === 'undefined') return _discoveryWrap('list_categories', 'Command menu data not loaded.', []);
  var cats = COMMAND_MENU.categories;
  var keys = Object.keys(cats).sort();

  var html = '<div class="discovery-result"><div class="discovery-header"><code>list_categories()</code></div>';
  html += '<div class="discovery-subtitle">' + keys.length + ' categories</div>';
  html += '<table class="discovery-table"><thead><tr><th>Category</th><th>Label</th><th>Commands</th></tr></thead><tbody>';

  for (var i = 0; i < keys.length; i++) {
    var cat = cats[keys[i]];
    var label = typeof t === 'function' ? t(cat.label) : cat.label;
    var cmdCount = (cat.commands || []).length;
    var depth = (keys[i].match(/\./g) || []).length;
    var indent = depth > 0 ? '<span style="padding-left:' + (depth * 1.2) + 'em">' + _esc(keys[i]) + '</span>' : _esc(keys[i]);
    html += '<tr><td><code class="discovery-cat-link" onclick="' + "_discoveryShowCategory('" + _esc(keys[i]) + "')" + '">' + indent + '</code></td>';
    html += '<td>' + _esc(label) + '</td>';
    html += '<td>' + cmdCount + '</td></tr>';
  }

  html += '</tbody></table></div>';
  return html;
}

function _discoveryCommandsInCategory(cat) {
  if (typeof COMMAND_MENU === 'undefined') return _discoveryWrap('commands_in_category', 'Command menu data not loaded.', []);

  // Try exact match first, then fuzzy
  var cats = COMMAND_MENU.categories;
  var match = null;
  if (cats[cat]) {
    match = cat;
  } else {
    // Try partial match (e.g., "trigonometry" → "cmds.expression.trigo")
    var lower = cat.toLowerCase();
    var keys = Object.keys(cats);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i].toLowerCase();
      var label = (typeof t === 'function' ? t(cats[keys[i]].label) : cats[keys[i]].label).toLowerCase();
      if (k.indexOf(lower) >= 0 || label.indexOf(lower) >= 0) {
        match = keys[i];
        break;
      }
    }
  }

  if (!match) {
    return '<div class="discovery-result"><div class="discovery-header"><code>commands_in_category("' + _esc(cat) + '")</code></div>' +
      '<div class="discovery-subtitle">Category not found. Use <code>list_categories()</code> to see available categories.</div></div>';
  }

  // Collect commands from this category and all descendants
  var allCmds = [];
  var stack = [match];
  while (stack.length > 0) {
    var current = stack.pop();
    var catObj = cats[current];
    if (catObj) {
      allCmds = allCmds.concat(catObj.commands || []);
      if (catObj.children) {
        for (var c = 0; c < catObj.children.length; c++) stack.push(catObj.children[c]);
      }
    }
  }
  // Deduplicate and sort
  allCmds = allCmds.filter(function(v, i, a) { return a.indexOf(v) === i; }).sort();

  var label = typeof t === 'function' ? t(cats[match].label) : cats[match].label;
  var title = 'commands_in_category("' + _esc(cat) + '")';
  var subtitle = allCmds.length + ' command' + (allCmds.length !== 1 ? 's' : '') + ' in ' + _esc(label) + ' (' + _esc(match) + ')';
  return _discoveryWrap(title, subtitle, allCmds);
}

function _discoveryCommandInfo(cmd) {
  if (!cmd) return '<div class="discovery-result"><div class="discovery-header"><code>command_info("")</code></div><div class="discovery-subtitle">Provide a command name.</div></div>';

  // Kernel-aware help lookup
  var help = null;
  if (typeof KernelRegistry !== 'undefined' && KernelRegistry.active) {
    help = KernelRegistry.active.getHelp(cmd);
  }
  if (!help && typeof getHelp === 'function') {
    help = getHelp(cmd);
  }
  var category = '';
  if (typeof COMMAND_MENU !== 'undefined' && COMMAND_MENU.commandToCategory) {
    var catKey = COMMAND_MENU.commandToCategory[help ? help.name : cmd];
    if (catKey) {
      var label = typeof t === 'function' ? t(COMMAND_MENU.categories[catKey].label) : COMMAND_MENU.categories[catKey].label;
      category = label + ' (' + catKey + ')';
    }
  }

  var html = '<div class="discovery-result"><div class="discovery-header"><code>command_info("' + _esc(cmd) + '")</code></div>';
  html += '<table class="discovery-table"><tbody>';

  if (help) {
    html += '<tr><td><strong>Name</strong></td><td><code class="discovery-cmd-link" onclick="showHelp(\'' + _esc(help.name) + '\')">' + _esc(help.name) + '</code></td></tr>';
    if (help.alias) html += '<tr><td><strong>Alias of</strong></td><td>' + _esc(help.alias) + ' → ' + _esc(help.name) + '</td></tr>';
    if (help.entry.d) html += '<tr><td><strong>Description</strong></td><td>' + _esc(help.entry.d) + '</td></tr>';
    if (help.entry.p) html += '<tr><td><strong>Syntax</strong></td><td><code>' + _esc(help.name) + '(' + _esc(help.entry.p) + ')</code></td></tr>';
    if (help.entry.a && help.entry.a.length > 0) html += '<tr><td><strong>Aliases</strong></td><td>' + help.entry.a.map(_esc).join(', ') + '</td></tr>';
    if (category) html += '<tr><td><strong>Category</strong></td><td>' + _esc(category) + '</td></tr>';
  } else {
    html += '<tr><td colspan="2">Command "' + _esc(cmd) + '" not found. Try <code>suggest_commands("' + _esc(cmd) + '")</code></td></tr>';
  }

  html += '</tbody></table></div>';
  return html;
}

function _discoverySuggestCommands(input) {
  if (!input) return _discoveryWrap('suggest_commands("")', 'Provide a command name to get suggestions.', []);

  var cmds = _discoveryGetCommands();
  var scored = [];
  for (var i = 0; i < cmds.length; i++) {
    var dist = _levenshtein(input.toLowerCase(), cmds[i].toLowerCase());
    if (dist <= Math.max(3, Math.floor(input.length * 0.6))) {
      scored.push({ name: cmds[i], distance: dist });
    }
  }
  scored.sort(function(a, b) { return a.distance - b.distance; });
  scored = scored.slice(0, 10);

  var html = '<div class="discovery-result"><div class="discovery-header"><code>suggest_commands("' + _esc(input) + '")</code></div>';
  html += '<div class="discovery-subtitle">' + scored.length + ' suggestion' + (scored.length !== 1 ? 's' : '') + '</div>';

  if (scored.length > 0) {
    html += '<table class="discovery-table"><thead><tr><th>Command</th><th>Distance</th></tr></thead><tbody>';
    for (var i = 0; i < scored.length; i++) {
      html += '<tr><td><code class="discovery-cmd-link" onclick="showHelp(\'' + _esc(scored[i].name) + '\')">' + _esc(scored[i].name) + '</code></td>';
      html += '<td>' + scored[i].distance + '</td></tr>';
    }
    html += '</tbody></table>';
  }

  html += '</div>';
  return html;
}

// ── Rendering helpers ────────────────────────────────────────

function _esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _discoveryWrap(title, subtitle, cmds) {
  var html = '<div class="discovery-result"><div class="discovery-header"><code>' + _esc(title) + '</code></div>';
  html += '<div class="discovery-subtitle">' + _esc(subtitle) + '</div>';
  if (cmds.length > 0) {
    html += '<div class="discovery-list">';
    for (var i = 0; i < cmds.length; i++) {
      html += '<code class="discovery-cmd-link" onclick="showHelp(\'' + _esc(cmds[i]) + '\')">' + _esc(cmds[i]) + '</code>';
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function _discoveryWrapWithDesc(title, subtitle, cmds) {
  var html = '<div class="discovery-result"><div class="discovery-header"><code>' + _esc(title) + '</code></div>';
  html += '<div class="discovery-subtitle">' + _esc(subtitle) + '</div>';
  if (cmds.length > 0) {
    html += '<table class="discovery-table"><thead><tr><th>Command</th><th>Description</th></tr></thead><tbody>';
    for (var i = 0; i < cmds.length; i++) {
      var desc = (typeof GIAC_HELP !== 'undefined' && GIAC_HELP.cmds[cmds[i]]) ? GIAC_HELP.cmds[cmds[i]].d || '' : '';
      html += '<tr><td><code class="discovery-cmd-link" onclick="showHelp(\'' + _esc(cmds[i]) + '\')">' + _esc(cmds[i]) + '</code></td>';
      html += '<td>' + _esc(desc) + '</td></tr>';
    }
    html += '</tbody></table>';
  }
  html += '</div>';
  return html;
}

// ── Category drill-down helper (called from list_categories table) ──

function _discoveryShowCategory(cat) {
  // Find the active cell's output and render commands_in_category there
  var cells = document.querySelectorAll('.cell.running, .cell');
  for (var i = cells.length - 1; i >= 0; i--) {
    var out = document.getElementById(cells[i].id + '-output');
    if (out && out.querySelector('.discovery-result')) {
      out.innerHTML = runDiscoveryQuery('commands_in_category', [cat]);
      return;
    }
  }
}

// ── Dispatch ─────────────────────────────────────────────────

function runDiscoveryQuery(fn, args) {
  switch (fn) {
    case 'search_commands': return _discoverySearchCommands(args[0]);
    case 'search_commands_by_description': return _discoverySearchByDescription(args[0]);
    case 'list_commands': return _discoveryListCommands();
    case 'help_count': return _discoveryHelpCount();
    case 'list_categories': return _discoveryListCategories();
    case 'commands_in_category': return _discoveryCommandsInCategory(args[0]);
    case 'command_info': return _discoveryCommandInfo(args[0]);
    case 'suggest_commands': return _discoverySuggestCommands(args[0]);
    default: return '<div class="discovery-result">Unknown discovery function: ' + _esc(fn) + '</div>';
  }
}

function renderDiscoveryResult(cellId, html) {
  var cell = document.getElementById(cellId);
  var out = document.getElementById(cellId + '-output');
  if (!out) return;
  out.innerHTML = html;
  if (cell) {
    cell.classList.remove('running', 'cell-pending', 'cell-error', 'cell-unevaluated');
  }
}
