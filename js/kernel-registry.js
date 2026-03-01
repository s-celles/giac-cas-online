'use strict';

// Kernel Registry — central abstraction layer for computation kernels
// Each kernel implements: { id, label, available, evaluate(expr, cellType), getCommands(), getHelp(cmd) }

var KernelRegistry = (function() {
  var _kernels = {};
  var _active = null;

  return {
    register: function(kernel) {
      if (!kernel || !kernel.id) throw new Error('Kernel must have an id');
      _kernels[kernel.id] = kernel;
      // Set first registered kernel as active if none set
      if (!_active) _active = kernel;
    },

    get: function(id) {
      return _kernels[id];
    },

    list: function() {
      return Object.values(_kernels);
    },

    get active() {
      return _active;
    },

    setActive: function(kernelId, opts) {
      opts = opts || {};
      var kernel = _kernels[kernelId];
      if (!kernel) {
        console.error('Kernel not found:', kernelId);
        return false;
      }
      if (!kernel.available) {
        console.error('Kernel not available:', kernelId);
        return false;
      }
      if (_active && _active.id === kernelId) return true; // already active

      _active = kernel;
      currentKernel = kernelId;

      // Save preference to localStorage
      localStorage.setItem('cascad-default-kernel', kernelId);
      defaultKernel = kernelId;

      // Reset notebook to welcome cell unless called from loadNotebookData
      if (!opts.silent) {
        if (typeof clearNotebook === 'function') {
          clearNotebook();
        }
        if (typeof addCell === 'function' && typeof t === 'function') {
          addCell('text', '', t('welcomeTitle') + '\n\n' + t('welcomeBody'), null, 'welcomeTitle,welcomeBody', { hidden: true });
          if (typeof cells !== 'undefined') {
            cells.forEach(function(c) { if (c.type === 'text' && typeof renderTextCell === 'function') renderTextCell(c.id); });
          }
        }
      }

      // Update kernel selector UI if present
      var sel = document.getElementById('kernel-select');
      if (sel) sel.value = kernelId;

      // Update status indicator
      _updateStatusIndicator();

      return true;
    },

    _updateStatusIndicator: _updateStatusIndicator
  };

  function _updateStatusIndicator() {
    var statusEl = document.getElementById('giac-status');
    if (!statusEl || !_active) return;
    var dot = statusEl.querySelector('.dot');
    var text = statusEl.querySelector('.text');
    if (_active.available) {
      dot.classList.add('ready');
      dot.classList.remove('loading');
      text.textContent = (typeof t === 'function' ? t(_active.label) : _active.label) + ' ready \u2713';
    } else {
      dot.classList.remove('ready');
      dot.classList.add('loading');
      text.textContent = (typeof t === 'function' ? t(_active.label) : _active.label) + '...';
    }
  }
})();
