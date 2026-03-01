'use strict';

// ─────────────────────────────────────────────────────────────
// Command Menu — hierarchical GIAC command browser
//
// Public API:
//   toggleCommandMenu()  — open or close the menu
//   openCommandMenu()    — open (no-op if already open)
//   closeCommandMenu()   — close and reset state
//   insertCommand(name)  — insert a command into the focused cell
// ─────────────────────────────────────────────────────────────

var _cmdMenuOpen = false;
var _cmdCurrentPath = [];      // category id breadcrumb trail
var _cmdSearchQuery = '';
var _cmdFocusedCellId = null;
var _cmdFocusedCellType = null; // 'math' | 'raw' | 'text' | 'slider' | null
var _cmdDebounceTimer = null;

// ── Helpers ──────────────────────────────────────────────────

/** Build a human-readable category path label */
function _cmdCategoryPath(categoryId) {
  if (!categoryId || !COMMAND_MENU) return '';
  var parts = [];
  var id = categoryId;
  while (id) {
    var cat = COMMAND_MENU.categories[id];
    if (!cat) break;
    parts.unshift(t(cat.label));
    id = cat.parent;
  }
  return parts.join(' \u203a ');
}

/** Detect the focused cell id and type */
function _cmdCaptureFocusedCell() {
  var active = document.activeElement;
  var cell = active ? active.closest('.cell') : null;
  if (cell) {
    _cmdFocusedCellId = cell.id;
    _cmdFocusedCellType = cell.dataset.type || null;
  } else {
    // Check if any cell was recently focused (look for last active)
    var cells = document.querySelectorAll('.cell');
    _cmdFocusedCellId = null;
    _cmdFocusedCellType = null;
    // Try to find a cell with focus within
    cells.forEach(function(c) {
      if (c.querySelector(':focus')) {
        _cmdFocusedCellId = c.id;
        _cmdFocusedCellType = c.dataset.type || null;
      }
    });
  }
}

// ── Menu open / close ────────────────────────────────────────

function toggleCommandMenu() {
  if (_cmdMenuOpen) closeCommandMenu();
  else openCommandMenu();
}

function openCommandMenu() {
  if (_cmdMenuOpen) return;
  if (typeof COMMAND_MENU === 'undefined') {
    // GIAC data not loaded yet — show a loading message
    _cmdMenuOpen = true;
    _cmdShowLoading();
    return;
  }
  _cmdCaptureFocusedCell();
  _cmdMenuOpen = true;
  _cmdCurrentPath = [];
  _cmdSearchQuery = '';
  _cmdRenderMenu();
}

function closeCommandMenu() {
  _cmdMenuOpen = false;
  _cmdCurrentPath = [];
  _cmdSearchQuery = '';
  var menu = document.getElementById('command-menu');
  if (menu) menu.remove();
  var overlay = document.getElementById('command-menu-overlay');
  if (overlay) overlay.remove();
  document.removeEventListener('keydown', _cmdEscapeHandler);
  document.removeEventListener('click', _cmdOutsideClickHandler);
}

function _cmdEscapeHandler(e) {
  if (e.key === 'Escape') closeCommandMenu();
}

function _cmdOutsideClickHandler(e) {
  var menu = document.getElementById('command-menu');
  var btn = document.getElementById('command-menu-btn');
  // Check if click target is still in the DOM — if the button was removed
  // during a re-render (e.g. navigating categories), the target won't be
  // contained by menu even though the click originated inside it.
  if (!document.body.contains(e.target)) return;
  if (menu && !menu.contains(e.target) && btn && !btn.contains(e.target)) {
    closeCommandMenu();
  }
}

// ── Show loading when data not ready ─────────────────────────

function _cmdShowLoading() {
  var anchor = document.getElementById('command-menu-btn');
  if (!anchor) return;
  anchor.parentNode.style.position = 'relative';

  var menu = document.createElement('div');
  menu.id = 'command-menu';
  menu.className = 'command-menu';
  menu.innerHTML = '<div class="command-menu-no-results">Loading\u2026</div>';
  anchor.parentNode.appendChild(menu);

  document.addEventListener('keydown', _cmdEscapeHandler);
  setTimeout(function() {
    document.addEventListener('click', _cmdOutsideClickHandler);
  }, 0);
}

// ── Main render ──────────────────────────────────────────────

function _cmdRenderMenu() {
  // Remove existing
  var existing = document.getElementById('command-menu');
  if (existing) existing.remove();
  var existingOverlay = document.getElementById('command-menu-overlay');
  if (existingOverlay) existingOverlay.remove();

  var isMobile = window.innerWidth < 768;
  var anchor = document.getElementById('command-menu-btn');
  if (!anchor) return;

  // Create overlay for mobile
  if (isMobile) {
    var overlay = document.createElement('div');
    overlay.id = 'command-menu-overlay';
    overlay.className = 'command-menu-overlay';
    overlay.onclick = closeCommandMenu;
    document.body.appendChild(overlay);
  }

  var menu = document.createElement('div');
  menu.id = 'command-menu';
  menu.className = 'command-menu';

  // Mobile header
  var header = document.createElement('div');
  header.className = 'command-menu-header';
  header.innerHTML = '<span>' + t('commandMenuBtn') + '</span>';
  var closeBtn = document.createElement('button');
  closeBtn.className = 'command-menu-close';
  closeBtn.textContent = '\u2715';
  closeBtn.onclick = closeCommandMenu;
  header.appendChild(closeBtn);
  menu.appendChild(header);

  // Search bar
  var searchWrap = document.createElement('div');
  searchWrap.className = 'command-menu-search';
  var searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = t('commandMenuSearch');
  searchInput.value = _cmdSearchQuery;
  searchInput.addEventListener('input', function(e) {
    _cmdSearchQuery = e.target.value;
    clearTimeout(_cmdDebounceTimer);
    _cmdDebounceTimer = setTimeout(function() {
      _cmdUpdateContent();
    }, 100);
  });
  searchWrap.appendChild(searchInput);
  menu.appendChild(searchWrap);

  // Breadcrumb bar
  var breadcrumb = document.createElement('div');
  breadcrumb.className = 'command-menu-breadcrumb';
  breadcrumb.id = 'command-menu-breadcrumb';
  menu.appendChild(breadcrumb);

  // Content list
  var list = document.createElement('div');
  list.className = 'command-menu-list';
  list.id = 'command-menu-list';
  menu.appendChild(list);

  // Footer
  var footer = document.createElement('div');
  footer.className = 'command-menu-footer';
  footer.id = 'command-menu-footer';
  menu.appendChild(footer);

  // Position
  if (!isMobile) {
    anchor.parentNode.style.position = 'relative';
    anchor.parentNode.appendChild(menu);
  } else {
    document.body.appendChild(menu);
  }

  // Render content
  _cmdUpdateBreadcrumb();
  _cmdUpdateContent();
  _cmdUpdateFooter();

  // Focus search input
  setTimeout(function() { searchInput.focus(); }, 50);

  // Listeners
  document.addEventListener('keydown', _cmdEscapeHandler);
  if (!isMobile) {
    setTimeout(function() {
      document.addEventListener('click', _cmdOutsideClickHandler);
    }, 0);
  }
}

// ── Breadcrumb ───────────────────────────────────────────────

function _cmdUpdateBreadcrumb() {
  var bc = document.getElementById('command-menu-breadcrumb');
  if (!bc) return;
  bc.innerHTML = '';

  if (_cmdCurrentPath.length === 0) {
    bc.style.display = 'none';
    return;
  }
  bc.style.display = 'flex';

  // Root
  var root = document.createElement('span');
  root.textContent = '\u2302'; // home symbol
  root.title = t('commandMenuBtn');
  root.onclick = function() {
    _cmdCurrentPath = [];
    _cmdUpdateBreadcrumb();
    _cmdUpdateContent();
  };
  bc.appendChild(root);

  // Path segments
  for (var i = 0; i < _cmdCurrentPath.length; i++) {
    var sep = document.createElement('span');
    sep.className = 'sep';
    sep.textContent = ' \u203a ';
    bc.appendChild(sep);

    var seg = document.createElement('span');
    var cat = COMMAND_MENU.categories[_cmdCurrentPath[i]];
    seg.textContent = cat ? t(cat.label) : _cmdCurrentPath[i];
    seg.dataset.index = i;
    seg.onclick = function() {
      var idx = parseInt(this.dataset.index);
      _cmdCurrentPath = _cmdCurrentPath.slice(0, idx + 1);
      _cmdUpdateBreadcrumb();
      _cmdUpdateContent();
    };
    bc.appendChild(seg);
  }

  // Back button
  var back = document.createElement('span');
  back.className = 'back-btn';
  back.textContent = '\u2190';
  back.title = t('commandMenuBack');
  back.onclick = function() {
    _cmdCurrentPath.pop();
    _cmdUpdateBreadcrumb();
    _cmdUpdateContent();
  };
  bc.appendChild(back);
}

// ── Content rendering ────────────────────────────────────────

function _cmdUpdateContent() {
  var list = document.getElementById('command-menu-list');
  if (!list) return;
  list.innerHTML = '';

  if (_cmdSearchQuery.trim()) {
    _cmdRenderSearchResults(list);
  } else {
    _cmdRenderCategoryList(list);
  }
}

function _cmdRenderCategoryList(list) {
  var currentId = _cmdCurrentPath.length > 0 ? _cmdCurrentPath[_cmdCurrentPath.length - 1] : null;

  if (currentId === null) {
    // Show top-level categories
    var topLevel = ['cmds', 'graphic', 'geo', 'phys', 'prg', 'turtle', 'highschool', 'other'];
    topLevel.forEach(function(catId) {
      var cat = COMMAND_MENU.categories[catId];
      if (!cat) return;
      // Skip "other" if it has no commands
      if (catId === 'other' && cat.commands.length === 0) return;
      var btn = document.createElement('button');
      btn.className = 'command-menu-category';
      var icon = cat.icon ? '<span class="icon">' + cat.icon + '</span>' : '';
      var hasChildren = (cat.children && cat.children.length > 0) || (cat.commands && cat.commands.length > 0);
      btn.innerHTML = icon + t(cat.label) + (hasChildren ? '<span class="arrow">\u203a</span>' : '');
      btn.onclick = function() { _cmdNavigateTo(catId); };
      list.appendChild(btn);
    });
  } else {
    var cat = COMMAND_MENU.categories[currentId];
    if (!cat) return;

    // Render child categories
    if (cat.children) {
      cat.children.forEach(function(childId) {
        var child = COMMAND_MENU.categories[childId];
        if (!child) return;
        var btn = document.createElement('button');
        btn.className = 'command-menu-category';
        var hasMore = (child.children && child.children.length > 0) || (child.commands && child.commands.length > 0);
        btn.innerHTML = t(child.label) + (hasMore ? '<span class="arrow">\u203a</span>' : '');
        btn.onclick = function() { _cmdNavigateTo(childId); };
        list.appendChild(btn);
      });
    }

    // Render commands in this category
    if (cat.commands) {
      cat.commands.forEach(function(cmdName) {
        var btn = document.createElement('button');
        btn.className = 'command-menu-command';
        btn.title = cmdName + ' \u2014 ' + _cmdCategoryPath(currentId);
        btn.onclick = function() { insertCommand(cmdName); };
        var nameSpan = document.createElement('span');
        nameSpan.textContent = cmdName;
        btn.appendChild(nameSpan);
        // Help icon
        if (typeof showHelp === 'function') {
          var helpIcon = document.createElement('span');
          helpIcon.className = 'help-icon';
          helpIcon.textContent = '?';
          helpIcon.title = t('commandMenuHelp');
          helpIcon.onclick = function(e) {
            e.stopPropagation();
            showHelp(cmdName);
          };
          btn.appendChild(helpIcon);
        }
        list.appendChild(btn);
      });
    }

    if ((!cat.children || cat.children.length === 0) && (!cat.commands || cat.commands.length === 0)) {
      var empty = document.createElement('div');
      empty.className = 'command-menu-no-results';
      empty.textContent = t('commandMenuNoResults');
      list.appendChild(empty);
    }
  }
}

function _cmdRenderSearchResults(list) {
  var query = _cmdSearchQuery.trim().toLowerCase();
  var results = COMMAND_MENU.allCommands.filter(function(cmd) {
    return cmd.toLowerCase().includes(query);
  });

  if (results.length === 0) {
    var noRes = document.createElement('div');
    noRes.className = 'command-menu-no-results';
    noRes.textContent = t('commandMenuNoResults');
    list.appendChild(noRes);
    return;
  }

  // Group by category
  var groups = {};
  results.forEach(function(cmd) {
    var catId = COMMAND_MENU.commandToCategory[cmd] || 'other';
    if (!groups[catId]) groups[catId] = [];
    groups[catId].push(cmd);
  });

  // Limit display to first 100 results for performance
  var count = 0;
  var maxResults = 100;
  Object.keys(groups).forEach(function(catId) {
    if (count >= maxResults) return;
    groups[catId].forEach(function(cmd) {
      if (count >= maxResults) return;
      var btn = document.createElement('button');
      btn.className = 'command-menu-command';
      var pathLabel = _cmdCategoryPath(catId);
      btn.innerHTML = cmd + (pathLabel ? '<span class="cat-hint">' + pathLabel + '</span>' : '');
      btn.title = cmd + ' \u2014 ' + pathLabel;
      btn.onclick = function() { insertCommand(cmd); };
      if (typeof showHelp === 'function') {
        var helpIcon = document.createElement('span');
        helpIcon.className = 'help-icon';
        helpIcon.textContent = '?';
        helpIcon.title = t('commandMenuHelp');
        helpIcon.onclick = function(e) {
          e.stopPropagation();
          showHelp(cmd);
        };
        btn.appendChild(helpIcon);
      }
      list.appendChild(btn);
      count++;
    });
  });

  if (results.length > maxResults) {
    var more = document.createElement('div');
    more.className = 'command-menu-no-results';
    more.textContent = results.length + ' results \u2014 showing first ' + maxResults;
    list.appendChild(more);
  }
}

// ── Navigation ───────────────────────────────────────────────

function _cmdNavigateTo(categoryId) {
  var cat = COMMAND_MENU.categories[categoryId];
  if (!cat) return;

  // Find the correct path to this category
  var path = [];
  var id = categoryId;
  while (id) {
    path.unshift(id);
    var c = COMMAND_MENU.categories[id];
    id = c ? c.parent : null;
  }
  _cmdCurrentPath = path;
  _cmdUpdateBreadcrumb();
  _cmdUpdateContent();
}

// ── Footer ───────────────────────────────────────────────────

function _cmdUpdateFooter() {
  var footer = document.getElementById('command-menu-footer');
  if (!footer || !COMMAND_MENU) return;
  footer.textContent = t('commandMenuCount').replace('{count}', COMMAND_MENU.allCommands.length);
}

// ── Command insertion ────────────────────────────────────────

function insertCommand(commandName) {
  var cellId = _cmdFocusedCellId;
  var cellType = _cmdFocusedCellType;

  // Check if the focused cell is locked
  if (cellId) {
    var cell = document.getElementById(cellId);
    if (cell && cell.dataset.locked === 'true') {
      // Skip insertion for locked cells — keep menu open
      return;
    }
  }

  if (cellType === 'math') {
    // Insert via MathLive
    var cell = document.getElementById(cellId);
    if (cell) {
      var mf = cell.querySelector('math-field');
      if (mf) {
        mf.executeCommand(['insert', '\\operatorname{' + commandName + '}(#?)']);
        closeCommandMenu();
        return;
      }
    }
  }

  if (cellType === 'raw') {
    // Insert as plain text in textarea
    var cell = document.getElementById(cellId);
    if (cell) {
      var ta = cell.querySelector('textarea');
      if (ta) {
        var start = ta.selectionStart || 0;
        var before = ta.value.substring(0, start);
        var after = ta.value.substring(ta.selectionEnd || start);
        ta.value = before + commandName + '()' + after;
        // Position cursor between parens
        var cursorPos = start + commandName.length + 1;
        ta.setSelectionRange(cursorPos, cursorPos);
        ta.focus();
        closeCommandMenu();
        return;
      }
    }
  }

  if (cellType === 'text' || cellType === 'slider') {
    // Skip insertion for text and slider cells
    closeCommandMenu();
    return;
  }

  // No cell focused — create a new GIAC cell
  if (typeof addCell === 'function') {
    addCell('raw');
    // Find the newly created cell (last cell)
    setTimeout(function() {
      var cells = document.querySelectorAll('.cell');
      var lastCell = cells[cells.length - 1];
      if (lastCell) {
        var ta = lastCell.querySelector('textarea');
        if (ta) {
          ta.value = commandName + '()';
          var cursorPos = commandName.length + 1;
          ta.setSelectionRange(cursorPos, cursorPos);
          ta.focus();
        }
      }
      closeCommandMenu();
    }, 50);
  } else {
    closeCommandMenu();
  }
}
