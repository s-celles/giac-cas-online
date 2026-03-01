'use strict';

// ── DAG Diagram — Mermaid cell flow visualization ──────────────
// Renders a Mermaid flowchart showing cell dependencies and error propagation.

var _dagRenderId = 0;
var _dagRefreshTimer = null;
var _dagObserver = null;
var _dagNodeToCellId = {};
var _dagPendingHighlight = null;

// ── Helpers ────────────────────────────────────────────────────

/** Determine the visual state of a cell for diagram styling */
function getCellState(cellId) {
  // Handle slider composite keys (e.g., "cell-3::paramName")
  var domId = cellId.indexOf('::') !== -1 ? cellId.split('::')[0] : cellId;
  var el = document.getElementById(domId);
  if (!el) return 'healthy';

  if (el.classList.contains('cell-stale')) return 'stale';
  if (el.classList.contains('cell-pending')) return 'pending';
  if (el.classList.contains('cell-error')) {
    // Distinguish root-cause error from dependency error
    if (typeof getUpstreamCells === 'function') {
      var upstream = getUpstreamCells(cellId);
      for (var i = 0; i < upstream.length; i++) {
        var uid = upstream[i].indexOf('::') !== -1 ? upstream[i].split('::')[0] : upstream[i];
        var uel = document.getElementById(uid);
        if (uel && uel.classList.contains('cell-error')) return 'depError';
      }
    }
    return 'error';
  }
  return 'healthy';
}

/** Get the display label for a cell (e.g., "In[1]", "Slider[2]") */
function getCellIndexLabel(cellId) {
  var domId = cellId.indexOf('::') !== -1 ? cellId.split('::')[0] : cellId;
  var el = document.getElementById(domId);
  if (!el) return cellId;
  var idx = el.querySelector('.cell-idx');
  return idx ? idx.textContent.trim() : cellId;
}

/** Sanitize a string for use in Mermaid node labels (escape quotes) */
function _mermaidEscape(s) {
  return s.replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;');
}

/** Sanitize cell ID for Mermaid node IDs (replace colons with underscores) */
function _mermaidNodeId(cellId) {
  return cellId.replace(/:/g, '_').replace(/-/g, '_');
}

// ── Core: Build Mermaid Definition ────────────────────────────

function buildMermaidDefinition() {
  if (typeof cellVariableMap === 'undefined' || typeof variableOwnerMap === 'undefined') return '';
  if (cellVariableMap.size === 0) return '';

  var lines = ['flowchart LR'];
  var edges = [];
  var edgeStates = []; // parallel array: { sourceState, targetState }
  var seenCells = new Set();
  _dagNodeToCellId = {};

  cellVariableMap.forEach(function(info, cellId) {
    seenCells.add(cellId);
    var label = getCellIndexLabel(cellId);
    var defines = info.defines || [];
    var state = getCellState(cellId);
    var nodeId = _mermaidNodeId(cellId);

    // Build label: "In[1] (a, b)" or just "In[1]"
    var displayLabel = _mermaidEscape(label);
    if (defines.length > 0) {
      displayLabel += ' (' + defines.join(', ') + ')';
    }

    _dagNodeToCellId[nodeId] = cellId;
    lines.push('  ' + nodeId + '["' + displayLabel + '"]:::' + state);

    // Create edges for references
    var refs = info.references || [];
    refs.forEach(function(varName) {
      var ownerId = variableOwnerMap.get(varName);
      if (ownerId && ownerId !== cellId && seenCells.has(ownerId)) {
        var ownerNodeId = _mermaidNodeId(ownerId);
        var edgeLine = '  ' + ownerNodeId + ' -->|' + varName + '| ' + nodeId;
        // Avoid duplicate edges
        if (edges.indexOf(edgeLine) === -1) {
          edges.push(edgeLine);
          edgeStates.push({
            sourceState: getCellState(ownerId),
            targetState: state
          });
        }
      }
    });
  });

  // Also check for references to cells that appear later in the map
  cellVariableMap.forEach(function(info, cellId) {
    var refs = info.references || [];
    var nodeId = _mermaidNodeId(cellId);
    var state = getCellState(cellId);
    refs.forEach(function(varName) {
      var ownerId = variableOwnerMap.get(varName);
      if (ownerId && ownerId !== cellId) {
        var ownerNodeId = _mermaidNodeId(ownerId);
        var edgeLine = '  ' + ownerNodeId + ' -->|' + varName + '| ' + nodeId;
        if (edges.indexOf(edgeLine) === -1) {
          edges.push(edgeLine);
          edgeStates.push({
            sourceState: getCellState(ownerId),
            targetState: state
          });
        }
      }
    });
  });

  // Add edges
  edges.forEach(function(e) { lines.push(e); });

  // ClassDef for node states
  lines.push('  classDef healthy fill:#d4edda,stroke:#28a745,stroke-width:2px,color:#155724');
  lines.push('  classDef error fill:#f8d7da,stroke:#dc3545,stroke-width:3px,color:#721c24');
  lines.push('  classDef depError fill:#fff3cd,stroke:#ffc107,stroke-width:2px,stroke-dasharray:5,color:#856404');
  lines.push('  classDef pending fill:#cce5ff,stroke:#007bff,stroke-width:2px,color:#004085');
  lines.push('  classDef stale fill:#e2e3e5,stroke:#6c757d,stroke-width:2px,stroke-dasharray:3,color:#383d41');

  // LinkStyle for error propagation edges
  for (var i = 0; i < edgeStates.length; i++) {
    var es = edgeStates[i];
    if ((es.sourceState === 'error' || es.sourceState === 'depError') &&
        es.targetState === 'depError') {
      lines.push('  linkStyle ' + i + ' stroke:#dc3545,stroke-width:3px');
    }
  }

  return lines.join('\n');
}

// ── Node Click → Scroll to Cell ──────────────────────────────

/** Attach click handlers to SVG nodes so they scroll to the corresponding cell */
function _dagBindNodeClicks(container) {
  var nodes = container.querySelectorAll('.node');
  nodes.forEach(function(node) {
    // Mermaid node IDs: "flowchart-<nodeId>-N" or data-id attribute
    var mermaidId = node.id || '';
    var nodeId = null;
    // Try data-id first (Mermaid v11)
    if (node.dataset && node.dataset.id) {
      nodeId = node.dataset.id;
    } else {
      // Parse from id: "flowchart-cell_1-0" → "cell_1"
      var match = mermaidId.match(/^flowchart-(.+?)-\d+$/);
      if (match) nodeId = match[1];
    }
    if (nodeId && _dagNodeToCellId[nodeId]) {
      node.style.cursor = 'pointer';
      node.addEventListener('click', function() {
        _dagScrollToCell(_dagNodeToCellId[nodeId]);
      });
    }
  });
}

/** Scroll to a notebook cell and briefly highlight it */
function _dagScrollToCell(cellId) {
  var domId = cellId.indexOf('::') !== -1 ? cellId.split('::')[0] : cellId;
  var el = document.getElementById(domId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('dag-highlight');
  setTimeout(function() { el.classList.remove('dag-highlight'); }, 1500);
}

/** Scroll diagram to show a specific node, opening the panel if needed */
function _dagScrollToNode(cellId) {
  var panel = document.getElementById('dag-diagram-panel');
  if (!panel) return;
  _dagPendingHighlight = cellId;
  if (!panel.classList.contains('visible')) {
    toggleDagDiagram();
  } else {
    refreshDagDiagram();
  }
}

/** Find and highlight a node in the SVG diagram */
function _dagHighlightNode(cellId) {
  var container = document.getElementById('dag-diagram-container');
  if (!container) { console.log('[DAG highlight] no container'); return; }
  var nodeId = _mermaidNodeId(cellId);
  console.log('[DAG highlight] looking for nodeId:', nodeId);
  // Find the SVG node by matching data-id, id pattern, or partial id match
  var nodes = container.querySelectorAll('.node');
  console.log('[DAG highlight] found', nodes.length, 'SVG nodes');
  var found = null;
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i];
    var nId = (n.dataset && n.dataset.id) || '';
    if (!nId) {
      var match = (n.id || '').match(/^flowchart-(.+?)-\d+$/);
      if (match) nId = match[1];
    }
    console.log('[DAG highlight] node', i, 'id:', n.id, 'data-id:', n.dataset && n.dataset.id, 'resolved:', nId);
    if (nId === nodeId || (n.id && n.id.indexOf(nodeId) !== -1)) {
      found = n;
      break;
    }
  }
  if (!found) { console.log('[DAG highlight] node NOT found for', nodeId); return; }
  console.log('[DAG highlight] node FOUND:', found.id);
  // Wait for CSS max-height transition (.3s) to complete, then scroll and flash
  var panel = document.getElementById('dag-diagram-panel');
  var delay = (panel && !panel.dataset.scrollReady) ? 400 : 0;
  setTimeout(function() {
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      panel.dataset.scrollReady = 'true';
    }
    // Flash with CSS filter (works on SVG <g> elements)
    found.style.transition = 'filter 0.2s';
    found.style.filter = 'drop-shadow(0 0 10px #ff4500) drop-shadow(0 0 20px #ff4500)';
    setTimeout(function() { found.style.filter = ''; }, 400);
    setTimeout(function() { found.style.filter = 'drop-shadow(0 0 10px #ff4500) drop-shadow(0 0 20px #ff4500)'; }, 600);
    setTimeout(function() { found.style.filter = ''; }, 1000);
    setTimeout(function() { found.style.filter = 'drop-shadow(0 0 10px #ff4500) drop-shadow(0 0 20px #ff4500)'; }, 1200);
    setTimeout(function() { found.style.filter = ''; found.style.transition = ''; }, 1600);
  }, delay);
}

// ── Render & Toggle ───────────────────────────────────────────

async function refreshDagDiagram() {
  var container = document.getElementById('dag-diagram-container');
  if (!container) return;

  var panel = document.getElementById('dag-diagram-panel');
  if (!panel || !panel.classList.contains('visible')) return;

  var def = buildMermaidDefinition();
  if (!def) {
    container.innerHTML = '<div class="dag-empty">' + (typeof t === 'function' ? t('dagDiagramEmpty') : 'No cells in notebook') + '</div>';
    _dagPendingHighlight = null;
    return;
  }

  if (typeof mermaid === 'undefined') {
    container.innerHTML = '<div class="dag-empty">Mermaid not loaded</div>';
    _dagPendingHighlight = null;
    return;
  }

  try {
    // Remove previous render to avoid duplicate ID errors
    var prevSvg = document.getElementById('dag-diagram-' + (_dagRenderId - 1));
    if (prevSvg) prevSvg.remove();

    var renderId = 'dag-diagram-' + (_dagRenderId++);
    var result = await mermaid.render(renderId, def);
    container.innerHTML = result.svg;
    if (result.bindFunctions) result.bindFunctions(container);
    _dagBindNodeClicks(container);
    // Apply pending highlight after render is complete
    if (_dagPendingHighlight) {
      var pendingId = _dagPendingHighlight;
      _dagPendingHighlight = null;
      _dagHighlightNode(pendingId);
    }
  } catch (e) {
    console.warn('Mermaid render error:', e);
    container.innerHTML = '<div class="dag-empty">Diagram render error</div>';
    _dagPendingHighlight = null;
  }
}

function toggleDagDiagram() {
  var panel = document.getElementById('dag-diagram-panel');
  var btn = document.getElementById('dag-diagram-btn');
  if (!panel) return;

  var isVisible = panel.classList.contains('visible');
  if (isVisible) {
    panel.classList.remove('visible');
    delete panel.dataset.scrollReady;
    if (btn) { btn.classList.remove('active'); btn.setAttribute('aria-pressed', 'false'); }
  } else {
    panel.classList.add('visible');
    if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
    refreshDagDiagram();
  }
}

// ── Live Updates (MutationObserver) ───────────────────────────

function _dagScheduleRefresh() {
  var panel = document.getElementById('dag-diagram-panel');
  if (!panel || !panel.classList.contains('visible')) return;
  if (_dagRefreshTimer) clearTimeout(_dagRefreshTimer);
  _dagRefreshTimer = setTimeout(function() {
    _dagRefreshTimer = null;
    refreshDagDiagram();
  }, 200);
}

function initDagDiagram() {
  // Progressive enhancement: hide button if Mermaid not available
  if (typeof mermaid === 'undefined') {
    var btn = document.getElementById('dag-diagram-btn');
    if (btn) btn.style.display = 'none';
    console.warn('DAG diagram: Mermaid not loaded, feature disabled');
    return;
  }

  var notebook = document.getElementById('notebook');
  if (!notebook) return;

  // Observe notebook for structural and state changes
  _dagObserver = new MutationObserver(function(mutations) {
    var shouldRefresh = false;
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === 'childList') { shouldRefresh = true; break; }
      if (m.type === 'attributes' && m.attributeName === 'class') {
        shouldRefresh = true; break;
      }
    }
    if (shouldRefresh) _dagScheduleRefresh();
  });

  _dagObserver.observe(notebook, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

// Auto-init when Mermaid is ready
if (typeof window._mermaidReady !== 'undefined') {
  window._mermaidReady.then(function() {
    initDagDiagram();
  });
} else {
  // Fallback: init on DOMContentLoaded if _mermaidReady not available
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initDagDiagram, 500);
  });
}
