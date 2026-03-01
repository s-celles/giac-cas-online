'use strict';

// ─────────────────────────────────────────────────────────────
// Command Help — display GIAC command documentation
//
// Public API:
//   isHelpQuery(input)                — detect help(cmd) or ?cmd patterns
//   getHelp(commandName)              — look up a command in GIAC_HELP
//   showHelpInCell(cellId, cmdName)   — show help in a cell's output area
//   showHelp(commandName)             — show floating help panel
//   closeHelp()                       — close floating help panel
//   loadHelpDetails(callback)         — lazy-load examples + related
// ─────────────────────────────────────────────────────────────

var _helpDetailsLoaded = false;
var _helpDetailsCallbacks = [];
var _helpFloatingOpen = false;
var _helpLoadedLang = 'en';
var _helpRequestedLang = 'en'; // UI language requested (may differ from loaded)
var _helpLangMap = {
  // Languages with native aide_cas translations:
  en: 'help-en', fr: 'help-fr', es: 'help-es',
  el: 'help-el', de: 'help-de', zh: 'help-zh',
  // Languages with English fallback (no aide_cas source):
  ar: 'help-ar', hi: 'help-hi', ja: 'help-ja', ru: 'help-ru'
};
var _helpEnglishCache = {}; // cache English descriptions for fallback

// ── Help query detection ─────────────────────────────────────

function isHelpQuery(input) {
  if (!input) return null;
  var s = input.trim();
  // help(commandName)
  var m = s.match(/^help\((\w*)\)$/);
  if (m) return m[1] || '';
  // ?commandName
  m = s.match(/^\?(\w+)$/);
  if (m) return m[1];
  return null;
}

// ── Help lookup ──────────────────────────────────────────────

function getHelp(name) {
  if (typeof GIAC_HELP === 'undefined') return null;
  if (!name) return null;
  // Direct match
  var entry = GIAC_HELP.cmds[name];
  if (entry) return { name: name, entry: entry };
  // Alias match
  var primary = GIAC_HELP.aliases[name];
  if (primary && GIAC_HELP.cmds[primary]) {
    return { name: primary, alias: name, entry: GIAC_HELP.cmds[primary] };
  }
  // Case-insensitive fallback: fpart → fPart, Solve → solve, etc.
  var lower = name.toLowerCase();
  var keys = Object.keys(GIAC_HELP.cmds);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === lower) {
      return { name: keys[i], correctedFrom: name, entry: GIAC_HELP.cmds[keys[i]] };
    }
  }
  var akeys = Object.keys(GIAC_HELP.aliases);
  for (var j = 0; j < akeys.length; j++) {
    if (akeys[j].toLowerCase() === lower) {
      var p = GIAC_HELP.aliases[akeys[j]];
      if (GIAC_HELP.cmds[p]) {
        return { name: p, alias: akeys[j], correctedFrom: name, entry: GIAC_HELP.cmds[p] };
      }
    }
  }
  return null;
}

// ── Lazy-load help details ───────────────────────────────────

function loadHelpDetails(callback) {
  if (_helpDetailsLoaded) { if (callback) callback(); return; }
  if (callback) _helpDetailsCallbacks.push(callback);
  if (_helpDetailsCallbacks.length > 1) return; // already loading

  var script = document.createElement('script');
  script.src = 'js/help/help-details.js';
  script.onload = function() {
    _helpDetailsLoaded = true;
    // Merge details into GIAC_HELP.cmds
    if (typeof GIAC_HELP_DETAILS !== 'undefined' && typeof GIAC_HELP !== 'undefined') {
      var keys = Object.keys(GIAC_HELP_DETAILS);
      for (var i = 0; i < keys.length; i++) {
        var cmd = keys[i];
        if (GIAC_HELP.cmds[cmd]) {
          var detail = GIAC_HELP_DETAILS[cmd];
          if (detail.r) GIAC_HELP.cmds[cmd].r = detail.r;
          if (detail.e) GIAC_HELP.cmds[cmd].e = detail.e;
        }
      }
    }
    var cbs = _helpDetailsCallbacks.slice();
    _helpDetailsCallbacks = [];
    for (var j = 0; j < cbs.length; j++) cbs[j]();
  };
  script.onerror = function() {
    _helpDetailsCallbacks = [];
  };
  document.head.appendChild(script);
}

// ── Render help panel ────────────────────────────────────────

function _helpRenderPanel(result, options) {
  var isInline = options && options.inline;
  var panel = document.createElement('div');
  panel.className = 'help-panel' + (isInline ? '' : ' help-panel-floating');

  if (!result) {
    // Command not found
    var cmdName = (options && options.query) || '';
    panel.innerHTML = '<div class="help-panel-fallback">' +
      t('helpPanelNoDoc').replace('{command}', cmdName) + '</div>';
    return panel;
  }

  var entry = result.entry;
  var name = result.name;

  // Language fallback banner: help loaded in English but UI is in another language
  if (_helpLoadedLang === 'en' && _helpRequestedLang !== 'en' && !_helpLangMap[_helpRequestedLang]) {
    var langBanner = document.createElement('div');
    langBanner.className = 'help-panel-lang-banner';
    langBanner.textContent = t('helpPanelLangUnavailable');
    panel.appendChild(langBanner);
  }

  // Header
  var header = document.createElement('div');
  header.className = 'help-panel-header';

  var titleWrap = document.createElement('div');
  var h3 = document.createElement('h3');
  h3.textContent = name;
  titleWrap.appendChild(h3);

  // Case correction notice
  if (result.correctedFrom) {
    var corrDiv = document.createElement('div');
    corrDiv.className = 'help-panel-lang-note';
    corrDiv.textContent = '"' + result.correctedFrom + '" \u2192 ' + name;
    titleWrap.appendChild(corrDiv);
  }

  // Aliases
  if (entry.a && entry.a.length > 0) {
    var aliasDiv = document.createElement('div');
    aliasDiv.className = 'help-aliases';
    aliasDiv.textContent = t('helpPanelAliases') + ': ' + entry.a.join(', ');
    titleWrap.appendChild(aliasDiv);
  }

  header.appendChild(titleWrap);

  // Action buttons
  var actions = document.createElement('div');
  actions.className = 'help-panel-actions';

  if (!isInline) {
    var insertBtn = document.createElement('button');
    insertBtn.textContent = t('helpPanelInsert');
    insertBtn.onclick = function() {
      if (typeof insertCommand === 'function') insertCommand(name);
      closeHelp();
    };
    actions.appendChild(insertBtn);
  }

  var closeBtn = document.createElement('button');
  closeBtn.textContent = isInline ? '\u2715' : t('helpPanelClose');
  closeBtn.onclick = function() {
    if (isInline) {
      panel.remove();
    } else {
      closeHelp();
    }
  };
  actions.appendChild(closeBtn);

  header.appendChild(actions);
  panel.appendChild(header);

  // Description (with English fallback for missing translations)
  var descText = entry.d;
  var isFallback = false;
  if (!descText && _helpLoadedLang !== 'en' && typeof _helpEnglishCache !== 'undefined' && _helpEnglishCache[name]) {
    descText = _helpEnglishCache[name];
    isFallback = true;
  }
  if (descText) {
    var descSection = document.createElement('div');
    descSection.className = 'help-panel-section';
    var descDiv = document.createElement('div');
    descDiv.className = 'help-panel-description';
    descDiv.textContent = descText;
    if (isFallback) {
      var note = document.createElement('span');
      note.className = 'help-panel-lang-note';
      note.textContent = ' ' + t('helpPanelFallbackLang');
      descDiv.appendChild(note);
    }
    descSection.appendChild(descDiv);
    panel.appendChild(descSection);
  }

  // Syntax
  if (entry.p) {
    var syntaxSection = document.createElement('div');
    syntaxSection.className = 'help-panel-section';
    var syntaxH4 = document.createElement('h4');
    syntaxH4.textContent = t('helpPanelSyntax');
    syntaxSection.appendChild(syntaxH4);
    var syntaxCode = document.createElement('div');
    syntaxCode.className = 'help-panel-syntax';
    syntaxCode.textContent = name + '(' + entry.p + ')';
    syntaxSection.appendChild(syntaxCode);
    panel.appendChild(syntaxSection);
  }

  // Examples (from details, may not be loaded yet)
  if (entry.e && entry.e.length > 0) {
    var exSection = document.createElement('div');
    exSection.className = 'help-panel-section';
    var exH4 = document.createElement('h4');
    exH4.textContent = t('helpPanelExamples');
    exSection.appendChild(exH4);
    var exList = document.createElement('div');
    exList.className = 'help-panel-examples';
    entry.e.forEach(function(ex) {
      var exDiv = document.createElement('div');
      exDiv.className = 'help-panel-example';
      var code = document.createElement('code');
      code.textContent = ex;
      code.title = ex;
      code.onclick = function() { _helpRunExample(ex); };
      exDiv.appendChild(code);
      var runBtn = document.createElement('span');
      runBtn.className = 'help-run-btn';
      runBtn.textContent = '\u25B6';
      runBtn.title = t('helpPanelRunExample');
      runBtn.onclick = function() { _helpRunExample(ex); };
      exDiv.appendChild(runBtn);
      exList.appendChild(exDiv);
    });
    exSection.appendChild(exList);
    panel.appendChild(exSection);
  }

  // Related commands (from details)
  if (entry.r && entry.r.length > 0) {
    var relSection = document.createElement('div');
    relSection.className = 'help-panel-section';
    var relH4 = document.createElement('h4');
    relH4.textContent = t('helpPanelRelated');
    relSection.appendChild(relH4);
    var relDiv = document.createElement('div');
    relDiv.className = 'help-panel-related';
    entry.r.forEach(function(rel) {
      var a = document.createElement('a');
      a.textContent = rel;
      a.onclick = function() {
        if (isInline && options && options.cellId) {
          showHelpInCell(options.cellId, rel);
        } else {
          _helpShowFloatingContent(rel);
        }
      };
      relDiv.appendChild(a);
    });
    relSection.appendChild(relDiv);
    panel.appendChild(relSection);
  }

  return panel;
}

// ── Show help in cell output ─────────────────────────────────

function showHelpInCell(cellId, commandName) {
  var out = document.getElementById(cellId + '-output');
  if (!out) return;
  out.innerHTML = '';

  if (typeof GIAC_HELP === 'undefined') {
    out.innerHTML = '<div class="help-panel-loading">' + t('helpPanelLoading') + '</div>';
    return;
  }

  var result = getHelp(commandName);

  // Try loading details first, then render with examples
  loadHelpDetails(function() {
    // Re-fetch after details merge
    result = getHelp(commandName);
    out.innerHTML = '';
    var panel = _helpRenderPanel(result, { inline: true, query: commandName, cellId: cellId });
    out.appendChild(panel);
  });

  // Show immediately without examples (will be replaced when details load)
  if (!_helpDetailsLoaded) {
    var panel = _helpRenderPanel(result, { inline: true, query: commandName, cellId: cellId });
    out.appendChild(panel);
  }
}

function showGeneralHelp(cellId) {
  var out = document.getElementById(cellId + '-output');
  if (!out) return;
  out.innerHTML = '';
  var panel = document.createElement('div');
  panel.className = 'help-panel';
  var header = document.createElement('div');
  header.className = 'help-panel-header';
  var h3 = document.createElement('h3');
  h3.textContent = t('helpPanelTitle');
  header.appendChild(h3);
  var closeBtn = document.createElement('button');
  closeBtn.className = 'help-panel-actions';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = function() { panel.remove(); };
  header.appendChild(closeBtn);
  panel.appendChild(header);

  var desc = document.createElement('div');
  desc.className = 'help-panel-section';
  var p = document.createElement('p');
  p.className = 'help-panel-description';
  p.textContent = t('helpPanelGeneralHelp');
  desc.appendChild(p);
  panel.appendChild(desc);

  out.appendChild(panel);
}

// ── Floating help panel ──────────────────────────────────────

function showHelp(commandName) {
  closeHelp();
  _helpFloatingOpen = true;

  if (typeof GIAC_HELP === 'undefined') return;

  // Overlay
  var overlay = document.createElement('div');
  overlay.id = 'help-panel-overlay';
  overlay.className = 'help-panel-overlay';
  overlay.onclick = closeHelp;
  document.body.appendChild(overlay);

  var result = getHelp(commandName);

  loadHelpDetails(function() {
    result = getHelp(commandName);
    var existing = document.getElementById('help-panel-floating');
    if (existing) existing.remove();
    var panel = _helpRenderPanel(result, { inline: false, query: commandName });
    panel.id = 'help-panel-floating';
    document.body.appendChild(panel);
  });

  // Show immediately
  if (!_helpDetailsLoaded) {
    var panel = _helpRenderPanel(result, { inline: false, query: commandName });
    panel.id = 'help-panel-floating';
    document.body.appendChild(panel);
  }

  document.addEventListener('keydown', _helpEscapeHandler);
}

function _helpShowFloatingContent(commandName) {
  var existing = document.getElementById('help-panel-floating');
  if (!existing) { showHelp(commandName); return; }

  var result = getHelp(commandName);
  loadHelpDetails(function() {
    result = getHelp(commandName);
    var panel = _helpRenderPanel(result, { inline: false, query: commandName });
    panel.id = 'help-panel-floating';
    existing.replaceWith(panel);
  });

  if (!_helpDetailsLoaded) {
    var panel = _helpRenderPanel(result, { inline: false, query: commandName });
    panel.id = 'help-panel-floating';
    existing.replaceWith(panel);
  }
}

function closeHelp() {
  _helpFloatingOpen = false;
  var panel = document.getElementById('help-panel-floating');
  if (panel) panel.remove();
  var overlay = document.getElementById('help-panel-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', _helpEscapeHandler);
}

function _helpEscapeHandler(e) {
  if (e.key === 'Escape') closeHelp();
}

// ── Language switching ────────────────────────────────────────

function switchHelpLanguage(lang) {
  _helpRequestedLang = lang;
  var helpFile = _helpLangMap[lang] || _helpLangMap.en;
  var helpLang = _helpLangMap[lang] ? lang : 'en';
  if (helpLang === _helpLoadedLang) return;

  // Cache English descriptions before switching away
  if (_helpLoadedLang === 'en' && typeof GIAC_HELP !== 'undefined') {
    var cmds = Object.keys(GIAC_HELP.cmds);
    for (var i = 0; i < cmds.length; i++) {
      if (GIAC_HELP.cmds[cmds[i]].d) {
        _helpEnglishCache[cmds[i]] = GIAC_HELP.cmds[cmds[i]].d;
      }
    }
  }

  var script = document.createElement('script');
  script.src = 'js/help/' + helpFile + '.js';
  script.onload = function() {
    _helpLoadedLang = helpLang;
    // Re-merge details if already loaded
    if (_helpDetailsLoaded && typeof GIAC_HELP_DETAILS !== 'undefined' && typeof GIAC_HELP !== 'undefined') {
      var keys = Object.keys(GIAC_HELP_DETAILS);
      for (var i = 0; i < keys.length; i++) {
        var cmd = keys[i];
        if (GIAC_HELP.cmds[cmd]) {
          var detail = GIAC_HELP_DETAILS[cmd];
          if (detail.r) GIAC_HELP.cmds[cmd].r = detail.r;
          if (detail.e) GIAC_HELP.cmds[cmd].e = detail.e;
        }
      }
    }
  };
  document.head.appendChild(script);
}

// ── Run example ──────────────────────────────────────────────

function _helpRunExample(exampleText) {
  if (typeof addCell !== 'function') return;
  addCell('raw');
  setTimeout(function() {
    var cells = document.querySelectorAll('.cell');
    var lastCell = cells[cells.length - 1];
    if (lastCell) {
      var ta = lastCell.querySelector('textarea');
      if (ta) {
        ta.value = exampleText;
        ta.focus();
        if (typeof runSingleCell === 'function') {
          runSingleCell(lastCell.id);
        }
      }
    }
  }, 50);
}
