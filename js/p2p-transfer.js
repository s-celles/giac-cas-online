'use strict';

/* ═══════════════════════════════════════════════════
   P2P Notebook Transfer — Phone → PC via WebRTC
   Uses PeerJS for signaling and data channel abstraction
   ═══════════════════════════════════════════════════ */

// ── PeerJS lazy loader (cached module pattern) ──

var _peerModule = null;
function _loadPeerJS() {
  if (_peerModule) return Promise.resolve(_peerModule);
  return import('https://esm.sh/peerjs@1.5.5').then(function(mod) {
    _peerModule = mod.Peer || mod.default;
    return _peerModule;
  });
}

// ── P2P State constants ──

var P2PState = {
  IDLE: 'idle',
  WAITING: 'waiting',
  CONNECTED: 'connected',
  TRANSFERRING: 'transferring',
  COMPLETE: 'complete',
  ERROR: 'error'
};

// ── Confirmation code derivation ──

function deriveConfirmationCode(idA, idB) {
  var combined = [idA, idB].sort().join(':');
  var hash = 0;
  for (var i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash) % 10000).padStart(4, '0');
}

// ── P2P Session state machine ──

var _session = {
  peerId: null,
  remotePeerId: null,
  role: null,
  state: P2PState.IDLE,
  confirmationCode: null,
  peer: null,
  connection: null,
  timeoutTimer: null,
  startTime: null,
  transferProgress: null,
  paired: false
};

var _p2pOverlayEl = null;

function _setState(newState) {
  _session.state = newState;
  _updateUI();
}

function _cleanup() {
  if (_session.connection) {
    try { _session.connection.close(); } catch (e) {}
    _session.connection = null;
  }
  if (_session.peer) {
    try { _session.peer.destroy(); } catch (e) {}
    _session.peer = null;
  }
  if (_session.timeoutTimer) {
    clearTimeout(_session.timeoutTimer);
    _session.timeoutTimer = null;
  }
  _session.peerId = null;
  _session.remotePeerId = null;
  _session.role = null;
  _session.state = P2PState.IDLE;
  _session.confirmationCode = null;
  _session.startTime = null;
  _session.transferProgress = null;
  _session.paired = false;
  _removeOverlay();
}

function _removeOverlay() {
  if (_p2pOverlayEl) {
    _p2pOverlayEl.remove();
    _p2pOverlayEl = null;
  }
  document.removeEventListener('keydown', _p2pEscHandler);
}

function _p2pEscHandler(e) {
  if (e.key === 'Escape') _cleanup();
}

// ── PeerJS STUN config ──

var _peerConfig = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
};

// ── UI Rendering ──

function _createOverlay() {
  _removeOverlay();

  var overlay = document.createElement('div');
  overlay.className = 'p2p-overlay';
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) _cleanup();
  });

  var dialog = document.createElement('div');
  dialog.className = 'p2p-dialog';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'p2p-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.onclick = _cleanup;

  var title = document.createElement('h2');
  title.textContent = t('p2pReceive');

  var statusEl = document.createElement('div');
  statusEl.className = 'p2p-status';
  statusEl.id = 'p2p-status';

  var codeLabel = document.createElement('div');
  codeLabel.className = 'p2p-code-label';
  codeLabel.id = 'p2p-code-label';
  codeLabel.style.display = 'none';

  var codeEl = document.createElement('div');
  codeEl.className = 'p2p-code';
  codeEl.id = 'p2p-code';
  codeEl.style.display = 'none';

  var qrContainer = document.createElement('div');
  qrContainer.className = 'p2p-qr';
  qrContainer.id = 'p2p-qr';

  var progressBar = document.createElement('div');
  progressBar.className = 'p2p-progress-bar';
  progressBar.id = 'p2p-progress';
  progressBar.style.display = 'none';
  progressBar.innerHTML = '<div class="p2p-progress-fill" id="p2p-progress-fill"></div>';

  var successEl = document.createElement('div');
  successEl.className = 'p2p-success';
  successEl.id = 'p2p-success';
  successEl.style.display = 'none';

  var actionsEl = document.createElement('div');
  actionsEl.className = 'p2p-actions';
  actionsEl.id = 'p2p-actions';

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = t('p2pCancel');
  cancelBtn.onclick = _cleanup;
  actionsEl.appendChild(cancelBtn);

  var fallbackEl = document.createElement('div');
  fallbackEl.className = 'p2p-fallback';
  fallbackEl.id = 'p2p-fallback';
  fallbackEl.style.display = 'none';

  dialog.appendChild(closeBtn);
  dialog.appendChild(title);
  dialog.appendChild(statusEl);
  dialog.appendChild(qrContainer);
  dialog.appendChild(codeLabel);
  dialog.appendChild(codeEl);
  dialog.appendChild(progressBar);
  dialog.appendChild(successEl);
  dialog.appendChild(actionsEl);
  dialog.appendChild(fallbackEl);
  overlay.appendChild(dialog);

  document.body.appendChild(overlay);
  document.addEventListener('keydown', _p2pEscHandler);
  _p2pOverlayEl = overlay;
  return overlay;
}

function _updateUI() {
  var statusEl = document.getElementById('p2p-status');
  var codeLabelEl = document.getElementById('p2p-code-label');
  var codeEl = document.getElementById('p2p-code');
  var qrEl = document.getElementById('p2p-qr');
  var progressEl = document.getElementById('p2p-progress');
  var fillEl = document.getElementById('p2p-progress-fill');
  var successEl = document.getElementById('p2p-success');
  var actionsEl = document.getElementById('p2p-actions');

  if (!statusEl) return;

  switch (_session.state) {
    case P2PState.WAITING:
      statusEl.textContent = t('p2pWaiting');
      if (codeLabelEl) codeLabelEl.style.display = 'none';
      if (codeEl) codeEl.style.display = 'none';
      if (progressEl) progressEl.style.display = 'none';
      if (successEl) successEl.style.display = 'none';
      break;

    case P2PState.CONNECTED:
      statusEl.textContent = t('p2pConnected');
      if (qrEl) qrEl.style.display = 'none';
      if (codeLabelEl) {
        codeLabelEl.textContent = t('p2pConfirmCode');
        codeLabelEl.style.display = '';
      }
      if (codeEl && _session.confirmationCode) {
        codeEl.textContent = _session.confirmationCode;
        codeEl.style.display = '';
      }
      if (progressEl) progressEl.style.display = 'none';
      if (successEl) successEl.style.display = 'none';
      break;

    case P2PState.TRANSFERRING:
      statusEl.textContent = t('p2pTransferring');
      if (progressEl) progressEl.style.display = '';
      if (fillEl && _session.transferProgress) {
        var pct = _session.transferProgress.totalBytes > 0
          ? Math.round((_session.transferProgress.transferredBytes / _session.transferProgress.totalBytes) * 100)
          : 0;
        fillEl.style.width = pct + '%';
      }
      if (successEl) successEl.style.display = 'none';
      break;

    case P2PState.COMPLETE:
      statusEl.textContent = t('p2pComplete');
      if (progressEl) progressEl.style.display = 'none';
      if (successEl) {
        successEl.textContent = '\u2714';
        successEl.style.display = '';
      }
      if (actionsEl) actionsEl.style.display = 'none';
      break;

    case P2PState.ERROR:
      // Error text is set directly before calling _setState
      if (progressEl) progressEl.style.display = 'none';
      if (successEl) successEl.style.display = 'none';
      break;
  }
}

function _showError(message, showFallback) {
  var statusEl = document.getElementById('p2p-status');
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.style.color = 'var(--error)';
  }
  var qrEl = document.getElementById('p2p-qr');
  if (qrEl) qrEl.style.display = 'none';
  var codeLabelEl = document.getElementById('p2p-code-label');
  if (codeLabelEl) codeLabelEl.style.display = 'none';
  var codeEl = document.getElementById('p2p-code');
  if (codeEl) codeEl.style.display = 'none';

  if (showFallback) {
    var fallbackEl = document.getElementById('p2p-fallback');
    if (fallbackEl) {
      fallbackEl.innerHTML = '<a onclick="closeShareQR();_cleanup();showShareQR()">📤 Share QR</a> · <a onclick="_cleanup();exportNotebook()">💾 Export</a>';
      fallbackEl.style.display = '';
    }
  }

  var actionsEl = document.getElementById('p2p-actions');
  if (actionsEl) {
    actionsEl.innerHTML = '';
    if (_session.role === 'receiver') {
      var retryBtn = document.createElement('button');
      retryBtn.textContent = t('p2pRetry');
      retryBtn.onclick = function() { _cleanup(); showReceiveFromPhone(); };
      actionsEl.appendChild(retryBtn);
    }
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = t('p2pCancel');
    cancelBtn.onclick = _cleanup;
    actionsEl.appendChild(cancelBtn);
  }

  _setState(P2PState.ERROR);
}

// ── Receiver flow (PC side) ──

function showReceiveFromPhone() {
  if (_session.state !== P2PState.IDLE) return;

  _createOverlay();
  var statusEl = document.getElementById('p2p-status');
  if (statusEl) statusEl.textContent = t('p2pWaiting');

  _loadPeerJS().then(function(PeerClass) {
    var peer = new PeerClass(_peerConfig);
    _session.peer = peer;
    _session.role = 'receiver';
    _session.startTime = Date.now();

    // 10-second signaling timeout
    _session.timeoutTimer = setTimeout(function() {
      if (_session.state === P2PState.WAITING || _session.state === P2PState.IDLE) {
        _showError(t('p2pSignalingError'), true);
      }
    }, 10000);

    peer.on('open', function(id) {
      _session.peerId = id;
      clearTimeout(_session.timeoutTimer);

      // Set 5-minute session timeout
      _session.timeoutTimer = setTimeout(function() {
        if (_session.state === P2PState.WAITING) {
          _showError(t('p2pTimeout'), false);
        }
      }, 300000);

      _setState(P2PState.WAITING);

      // Generate QR code with pairing URL
      var url = 'https://s-celles.github.io/CAScad/#p2p=' + id;
      generateStaticQR(url, 'L').then(function(svg) {
        var qrEl = document.getElementById('p2p-qr');
        if (qrEl) qrEl.innerHTML = svg;
      });
    });

    // First connection accepted — pair with this device
    peer.on('connection', function(conn) {
      if (_session.paired) {
        // Reject additional connections (single-pair enforcement)
        conn.on('open', function() {
          conn.close();
        });
        // Show warning toast
        var statusEl = document.getElementById('p2p-status');
        if (statusEl) {
          var prev = statusEl.textContent;
          statusEl.textContent = t('p2pSessionFull');
          setTimeout(function() {
            if (statusEl.textContent === t('p2pSessionFull')) {
              statusEl.textContent = prev;
            }
          }, 3000);
        }
        return;
      }

      _session.paired = true;
      _session.connection = conn;
      _session.remotePeerId = conn.peer;
      _session.confirmationCode = deriveConfirmationCode(_session.peerId, _session.remotePeerId);

      // Clear the session timeout since we're now paired
      if (_session.timeoutTimer) {
        clearTimeout(_session.timeoutTimer);
        _session.timeoutTimer = null;
      }

      _setState(P2PState.CONNECTED);

      conn.on('data', function(data) {
        _handleReceiverData(data);
      });

      conn.on('close', function() {
        if (_session.state === P2PState.TRANSFERRING) {
          _showError(t('p2pConnectionLost'), false);
        }
      });

      conn.on('error', function() {
        if (_session.state === P2PState.TRANSFERRING) {
          _showError(t('p2pConnectionLost'), false);
        }
      });
    });

    peer.on('error', function(err) {
      var type = err.type || '';
      if (type === 'unavailable-id' || type === 'browser-incompatible') {
        _showError(t('p2pNotSupported'), false);
      } else {
        _showError(t('p2pSignalingError'), true);
      }
    });
  }).catch(function() {
    _showError(t('p2pLoadError'), true);
  });
}

function _handleReceiverData(data) {
  try {
    var buffer;
    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else if (data instanceof Uint8Array) {
      buffer = data.buffer;
    } else {
      // Unexpected format
      _showError(t('p2pInvalidData'), false);
      return;
    }

    _session.transferProgress = {
      totalBytes: buffer.byteLength,
      transferredBytes: buffer.byteLength,
      startTime: Date.now()
    };
    _setState(P2PState.TRANSFERRING);

    var jsonString = new TextDecoder().decode(buffer);
    var notebookData = JSON.parse(jsonString);

    // Validate notebook structure
    if (notebookData.type !== 'cascad-notebook' || !Array.isArray(notebookData.cells)) {
      _showError(t('p2pInvalidData'), false);
      return;
    }

    // Send ack
    var ack = new TextEncoder().encode(JSON.stringify({ type: 'ack', bytes: buffer.byteLength }));
    if (_session.connection) {
      _session.connection.send(ack.buffer);
    }

    _setState(P2PState.COMPLETE);

    // Close overlay and load notebook after brief delay
    setTimeout(function() {
      _cleanup();
      loadNotebookData(notebookData, { keepReactiveMode: true });
    }, 1000);
  } catch (e) {
    _showError(t('p2pInvalidData'), false);
  }
}

// ── Sender flow (Phone side) ──

function joinP2PSession(remotePeerId) {
  if (_session.state !== P2PState.IDLE) return;

  _createOverlay();
  var statusEl = document.getElementById('p2p-status');
  if (statusEl) statusEl.textContent = t('p2pWaiting');

  // Hide QR container on sender side
  var qrEl = document.getElementById('p2p-qr');
  if (qrEl) qrEl.style.display = 'none';

  _loadPeerJS().then(function(PeerClass) {
    var peer = new PeerClass(_peerConfig);
    _session.peer = peer;
    _session.role = 'sender';
    _session.startTime = Date.now();

    // 10-second signaling timeout
    _session.timeoutTimer = setTimeout(function() {
      if (_session.state === P2PState.WAITING || _session.state === P2PState.IDLE) {
        _showError(t('p2pSignalingError'), true);
      }
    }, 10000);

    peer.on('open', function(id) {
      _session.peerId = id;
      clearTimeout(_session.timeoutTimer);

      _setState(P2PState.WAITING);

      var conn = peer.connect(remotePeerId, {
        serialization: 'binary',
        reliable: true
      });

      _session.connection = conn;
      _session.remotePeerId = remotePeerId;

      conn.on('open', function() {
        _session.confirmationCode = deriveConfirmationCode(_session.peerId, _session.remotePeerId);
        _setState(P2PState.CONNECTED);

        // Start sending after a brief delay to show confirmation code
        setTimeout(function() {
          _sendNotebook();
        }, 500);
      });

      conn.on('data', function(data) {
        // Expect ack message
        try {
          var buffer;
          if (data instanceof ArrayBuffer) {
            buffer = data;
          } else if (data instanceof Uint8Array) {
            buffer = data.buffer;
          } else {
            return;
          }
          var msg = JSON.parse(new TextDecoder().decode(buffer));
          if (msg.type === 'ack') {
            _setState(P2PState.COMPLETE);
            setTimeout(function() {
              _cleanup();
            }, 3000);
          }
        } catch (e) {
          // ignore invalid ack
        }
      });

      conn.on('close', function() {
        if (_session.state === P2PState.TRANSFERRING) {
          _showError(t('p2pConnectionLost'), false);
        } else if (_session.state === P2PState.WAITING || _session.state === P2PState.CONNECTED) {
          // Rejected by receiver (session full)
          _showError(t('p2pSessionFull'), false);
        }
      });

      conn.on('error', function() {
        if (_session.state === P2PState.TRANSFERRING) {
          _showError(t('p2pConnectionLost'), false);
        }
      });
    });

    peer.on('error', function(err) {
      var type = err.type || '';
      if (type === 'unavailable-id' || type === 'browser-incompatible') {
        _showError(t('p2pNotSupported'), false);
      } else {
        _showError(t('p2pSignalingError'), true);
      }
    });
  }).catch(function() {
    _showError(t('p2pLoadError'), true);
  });
}

function _sendNotebook() {
  var notebookData = buildNotebookData();
  var jsonString = JSON.stringify(notebookData);
  var buffer = new TextEncoder().encode(jsonString);

  _session.transferProgress = {
    totalBytes: buffer.byteLength,
    transferredBytes: buffer.byteLength,
    startTime: Date.now()
  };

  _setState(P2PState.TRANSFERRING);

  if (_session.connection) {
    _session.connection.send(buffer.buffer);
  }
}

// ── Progressive enhancement: show button only if PeerJS loads ──

document.addEventListener('DOMContentLoaded', function() {
  _loadPeerJS().then(function() {
    var btn = document.getElementById('p2p-receive-btn');
    if (btn) btn.style.display = '';
  }).catch(function() {
    // PeerJS not available — button stays hidden
  });
});
