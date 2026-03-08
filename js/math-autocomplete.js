'use strict';

// ─────────────────────────────────────────────────────────────
// Math Autocomplete — command dropdown for math-mode cells
//
// Public API:
//   attachAutocomplete(mathField, cellId) — attach to a math-field
//   hideAutocomplete()                    — close the dropdown
// ─────────────────────────────────────────────────────────────

var _acVisible = false;
var _acQuery = '';
var _acFilteredCommands = [];
var _acSelectedIndex = -1;
var _acAnchorCellId = null;
var _acDropdownEl = null;
var _acDocClickHandler = null;
var _acDebounceTimer = null;
var _acSavedShortcuts = null;  // saved MathLive inline shortcuts while autocomplete active
var _acMathField = null;       // reference to the active math-field
var _acRawQuery = '';          // query tracked from keystrokes (bypasses MathLive LaTeX transforms)
var _acSuppressUntil = 0;      // timestamp until which input events are suppressed
var _acHelpMode = false;       // true when triggered via ?, false for plain command completion
var _acRawBuffer = '';         // keystroke buffer for plain (non-?) command completion

// ── Filter commands ──────────────────────────────────────────

function _acFilterCommands(query) {
  var commands = [];
  try {
    commands = _discoveryGetCommands();
  } catch (e) {
    // Fallback: try GIAC_HELP keys
    if (typeof GIAC_HELP !== 'undefined' && GIAC_HELP.cmds) {
      commands = Object.keys(GIAC_HELP.cmds);
    }
  }
  if (!query) {
    return commands.slice(0, 50);
  }
  var lower = query.toLowerCase();
  var filtered = [];
  for (var i = 0; i < commands.length && filtered.length < 50; i++) {
    if (commands[i].toLowerCase().indexOf(lower) === 0) {
      filtered.push(commands[i]);
    }
  }
  return filtered;
}

// ── Extract query from MathLive LaTeX ────────────────────────

function _acExtractQuery(latex) {
  if (!latex) return null;
  var s = latex.trim();
  // Plain ?word
  var m = s.match(/^\?(\w*)$/);
  if (m) return m[1] || '';
  // ?\operatorname{\mathrm{word}}
  m = s.match(/^\?\\operatorname\{\\mathrm\{(\w*)\}?\}?$/);
  if (m) return m[1] || '';
  // ?\operatorname{word}
  m = s.match(/^\?\\operatorname\{(\w*)\}?$/);
  if (m) return m[1] || '';
  // ?\word (e.g. ?\frac)
  m = s.match(/^\?\\(\w*)$/);
  if (m) return m[1] || '';
  return null;
}

// ── Render dropdown ──────────────────────────────────────────

function _acRenderDropdown(cellId) {
  var cell = document.getElementById(cellId);
  if (!cell) return;

  // Remove existing dropdown
  if (_acDropdownEl && _acDropdownEl.parentNode) {
    _acDropdownEl.parentNode.removeChild(_acDropdownEl);
  }

  var el = document.createElement('div');
  el.className = 'math-autocomplete';

  if (_acFilteredCommands.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'math-autocomplete-empty';
    empty.textContent = typeof t === 'function' ? t('noMatchingCommands') || 'No matching commands' : 'No matching commands';
    el.appendChild(empty);
  } else {
    for (var i = 0; i < _acFilteredCommands.length; i++) {
      var item = document.createElement('div');
      item.className = 'math-autocomplete-item';
      if (i === _acSelectedIndex) item.className += ' selected';
      item.textContent = _acFilteredCommands[i];
      item.dataset.command = _acFilteredCommands[i];
      item.addEventListener('mousedown', function (e) {
        e.preventDefault(); // Prevent blur on math-field
        _acSelectCommand(this.dataset.command);
      });
      el.appendChild(item);
    }
  }

  // Position relative to the cell's input area
  var inputArea = cell.querySelector('.cell-input');
  if (inputArea) {
    inputArea.style.position = 'relative';
    inputArea.appendChild(el);
  } else {
    cell.style.position = 'relative';
    cell.appendChild(el);
  }

  _acDropdownEl = el;

  // Scroll selected item into view
  if (_acSelectedIndex >= 0) {
    var selectedEl = el.querySelector('.selected');
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }
}

// ── Show autocomplete ────────────────────────────────────────

function _acShow(cellId, query) {
  _acAnchorCellId = cellId;
  _acQuery = query;
  _acFilteredCommands = _acFilterCommands(query);
  if (!_acVisible) {
    _acSelectedIndex = -1;
    // Disable MathLive inline shortcuts to prevent symbol conversion (e.g. "in" → \in)
    var cell = document.getElementById(cellId);
    if (cell) {
      var mf = cell.querySelector('math-field');
      if (mf && _acSavedShortcuts === null) {
        _acSavedShortcuts = mf.inlineShortcuts;
        _acMathField = mf;
        mf.inlineShortcuts = {};
      }
    }
  }
  _acVisible = true;
  _acRenderDropdown(cellId);

  // Add click-outside listener
  if (!_acDocClickHandler) {
    _acDocClickHandler = function (e) {
      if (_acDropdownEl && !_acDropdownEl.contains(e.target)) {
        hideAutocomplete();
      }
    };
    document.addEventListener('mousedown', _acDocClickHandler);
  }
}

// ── Hide autocomplete ────────────────────────────────────────

function hideAutocomplete() {
  _acVisible = false;
  _acQuery = '';
  _acRawQuery = '';
  _acHelpMode = false;
  _acFilteredCommands = [];
  _acSelectedIndex = -1;
  _acAnchorCellId = null;

  // Restore MathLive inline shortcuts
  if (_acMathField && _acSavedShortcuts !== null) {
    _acMathField.inlineShortcuts = _acSavedShortcuts;
    _acSavedShortcuts = null;
    _acMathField = null;
  }

  if (_acDropdownEl && _acDropdownEl.parentNode) {
    _acDropdownEl.parentNode.removeChild(_acDropdownEl);
  }
  _acDropdownEl = null;

  if (_acDocClickHandler) {
    document.removeEventListener('mousedown', _acDocClickHandler);
    _acDocClickHandler = null;
  }
}

// ── Select command ───────────────────────────────────────────

function _acSelectCommand(commandName) {
  var cellId = _acAnchorCellId;
  var helpMode = _acHelpMode;
  hideAutocomplete();

  if (!cellId) return;
  var cell = document.getElementById(cellId);
  if (!cell) return;
  var mf = cell.querySelector('math-field');
  if (!mf) return;

  // Suppress input events for 300ms — setValue triggers multiple input events
  // from MathLive that would otherwise re-open autocomplete
  _acSuppressUntil = Date.now() + 300;
  mf.setValue(helpMode ? '?' + commandName : commandName);
  _acRawBuffer = helpMode ? '' : commandName;
  mf.focus();
}

// ── Navigate autocomplete ────────────────────────────────────

function _acNavigate(direction) {
  if (!_acVisible || _acFilteredCommands.length === 0) return;

  if (direction === 'down') {
    _acSelectedIndex = (_acSelectedIndex + 1) % _acFilteredCommands.length;
  } else if (direction === 'up') {
    _acSelectedIndex = _acSelectedIndex <= 0 ? _acFilteredCommands.length - 1 : _acSelectedIndex - 1;
  }

  // Update DOM selection
  if (_acDropdownEl) {
    var items = _acDropdownEl.querySelectorAll('.math-autocomplete-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('selected', i === _acSelectedIndex);
    }
    var sel = _acDropdownEl.querySelector('.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }
}

// ── Attach to math-field ─────────────────────────────────────

function attachAutocomplete(mathField, cellId) {
  // Track all keystrokes in _acRawBuffer so we can Tab-complete plain commands.
  // Also track _acRawQuery (post-?) when autocomplete is visible in help mode.
  mathField.addEventListener('keydown', function (e) {
    // ── Always track raw keystrokes in buffer ──
    if (!_acVisible) {
      if (e.key === 'Backspace') {
        _acRawBuffer = _acRawBuffer.slice(0, -1);
      } else if (e.key.length === 1 && /[a-zA-Z0-9_]/.test(e.key)) {
        _acRawBuffer += e.key;
      } else if (e.key === '?' || e.key === '?') {
        // ? typed in empty field → help-mode autocomplete
        var val = mathField.value.trim();
        if (!val || val === '\\placeholder{}') {
          _acRawQuery = '';
          _acHelpMode = true;
          _acRawBuffer = '';
          setTimeout(function () { _acShow(cellId, ''); }, 0);
        }
      }
      return;
    }

    // ── Autocomplete is visible ──

    // Navigation
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      _acNavigate('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      _acNavigate('up');
    } else if (e.key === 'Enter') {
      if (_acSelectedIndex >= 0 && _acSelectedIndex < _acFilteredCommands.length) {
        e.preventDefault();
        e.stopPropagation();
        _acSelectCommand(_acFilteredCommands[_acSelectedIndex]);
      } else if (_acFilteredCommands.length === 1) {
        e.preventDefault();
        e.stopPropagation();
        _acSelectCommand(_acFilteredCommands[0]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      hideAutocomplete();
    }
    // Tab is handled by a capture-phase listener (see below).
    // Query tracking from raw keystrokes
    else if (e.key === 'Backspace') {
      if (_acRawQuery.length > 0) {
        _acRawQuery = _acRawQuery.slice(0, -1);
        _acQuery = _acRawQuery;
        _acFilteredCommands = _acFilterCommands(_acRawQuery);
        _acSelectedIndex = -1;
        _acRenderDropdown(cellId);
      }
    } else if (e.key.length === 1 && /[a-zA-Z0-9_]/.test(e.key)) {
      _acRawQuery += e.key;
      _acQuery = _acRawQuery;
      _acFilteredCommands = _acFilterCommands(_acRawQuery);
      _acSelectedIndex = -1;
      _acRenderDropdown(cellId);
    }
  });

  // Tab / Shift+Tab: capture phase to intercept before MathLive moves focus.
  // Works both when autocomplete is visible AND for on-demand plain command completion.
  mathField.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;

    if (_acVisible) {
      // Autocomplete already showing — cycle or complete
      e.preventDefault();
      e.stopImmediatePropagation();
      if (_acFilteredCommands.length === 1) {
        _acSelectCommand(_acFilteredCommands[0]);
      } else if (_acFilteredCommands.length > 1) {
        _acNavigate(e.shiftKey ? 'up' : 'down');
      }
      return;
    }

    // Autocomplete not visible — try plain command completion from keystroke buffer
    if (_acRawBuffer.length > 0) {
      var matches = _acFilterCommands(_acRawBuffer);
      if (matches.length === 1) {
        // Single match — complete directly
        e.preventDefault();
        e.stopImmediatePropagation();
        _acHelpMode = false;
        _acSuppressUntil = Date.now() + 300;
        mathField.setValue(matches[0]);
        _acRawBuffer = matches[0];
      } else if (matches.length > 1) {
        // Multiple matches — open autocomplete dropdown and select first item
        e.preventDefault();
        e.stopImmediatePropagation();
        _acHelpMode = false;
        _acRawQuery = _acRawBuffer;
        _acShow(cellId, _acRawQuery);
        _acNavigate('down');
      }
    }
  }, true); // capture phase

  // Input event: fallback activation (paste, mobile) + deactivation when ? is deleted
  mathField.addEventListener('input', function () {
    if (_acDebounceTimer) clearTimeout(_acDebounceTimer);
    _acDebounceTimer = setTimeout(function () {
      // After command selection, suppress input events for a short window
      if (Date.now() < _acSuppressUntil) return;
      var latex = mathField.value;
      var query = _acExtractQuery(latex);

      if (query !== null && !_acVisible) {
        // Fallback activation (e.g. paste, mobile input)
        _acRawQuery = query;
        _acHelpMode = true;
        _acShow(cellId, _acRawQuery);
      } else if (query === null && _acVisible && _acHelpMode) {
        // ? was deleted — close autocomplete
        hideAutocomplete();
      }
      // When already visible, do NOT update from MathLive value —
      // the keydown handler manages _acRawQuery directly
    }, 80);
  });
}
