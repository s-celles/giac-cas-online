'use strict';

// QR NOTEBOOK SHARING
// ─────────────────────────────────────────────────────────────

var STATIC_QR_THRESHOLD = 2200;
var DEFAULT_FPS = 5;
var DEFAULT_CHUNK_SIZE = 300;
var QR_PROTOCOL_VERSION = 1;

// ── CRC16-CCITT ──────────────────────────────────────────────

function crc16(str) {
  var crc = 0xFFFF;
  for (var i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (var j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return (crc & 0xFFFF).toString(16).padStart(4, '0');
}

// ── Serialization ────────────────────────────────────────────

var _typeToCode = { math: 'M', raw: 'X', text: 'T' };
var _codeToType = { M: 'math', X: 'raw', T: 'text' };

function serializeNotebook() {
  return cells.map(function(c) {
    var el = c.element;
    var type = el.dataset.type;
    var code = _typeToCode[type] || 'X';
    var content = '';
    if (type === 'math') {
      var mf = el.querySelector('math-field');
      if (mf) content = mf.value; // LaTeX — round-trips via ce.parse()
    } else if (type === 'slider') {
      // Serialize slider expression as raw Xcas
      code = 'X';
      content = el.dataset.expression || '';
    } else {
      var ta = el.querySelector('textarea');
      if (ta) content = ta.value;
    }
    // Escape newlines within content
    content = content.replace(/\n/g, '\\n');
    return code + ':' + content;
  }).join('\n');
}

function deserializeNotebook(text) {
  var lines = text.split('\n');
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var match = line.match(/^([MXT]):([\s\S]*)$/);
    if (!match) {
      if (line.trim()) console.warn('QR deserialize: skipping invalid line:', line);
      continue;
    }
    var type = _codeToType[match[1]];
    var content = match[2].replace(/\\n/g, '\n');
    result.push({ type: type, content: content });
  }
  if (result.length === 0) return null;
  return result;
}

// ── Compression ──────────────────────────────────────────────

var _lzStringModule = null;

function _loadLZString() {
  if (_lzStringModule) return Promise.resolve(_lzStringModule);
  return import('https://cdn.jsdelivr.net/npm/lz-string/+esm').then(function(mod) {
    _lzStringModule = mod.default || mod;
    return _lzStringModule;
  });
}

function compressNotebook() {
  var serialized = serializeNotebook();
  return _loadLZString().then(function(LZString) {
    return LZString.compressToEncodedURIComponent(serialized);
  });
}

function decompressNotebook(data) {
  return _loadLZString().then(function(LZString) {
    var text = LZString.decompressFromEncodedURIComponent(data);
    if (!text) return null;
    return text;
  });
}

// ── QR Generation ────────────────────────────────────────────

var _qrModule = null;

function _loadQRCode() {
  if (_qrModule) return Promise.resolve(_qrModule);
  return import('https://cdn.jsdelivr.net/npm/@cheprasov/qrcode/+esm').then(function(mod) {
    var lib = mod.default || mod;
    _qrModule = lib;
    return lib;
  });
}

function generateStaticQR(data, level) {
  return _loadQRCode().then(function(lib) {
    var QRCodeSVG = lib.QRCodeSVG || lib;
    var qr = new QRCodeSVG(data, { level: level || 'L' });
    return qr.toString();
  });
}

// ── URL Generation ───────────────────────────────────────────

function generateNotebookURL(compressed, encrypted) {
  var prefix = encrypted ? '#nbe=' : '#nb=';
  return location.origin + location.pathname + prefix + compressed;
}

// ── Animated QR (Chunking & Frames) ─────────────────────────

function chunkData(compressed, chunkSize) {
  chunkSize = chunkSize || DEFAULT_CHUNK_SIZE;
  var chunks = [];
  for (var i = 0; i < compressed.length; i += chunkSize) {
    chunks.push(compressed.substring(i, i + chunkSize));
  }
  return chunks;
}

function buildFrames(compressed, chunkSize) {
  var chunks = chunkData(compressed, chunkSize);
  var total = chunks.length;
  return chunks.map(function(chunk, i) {
    var checksum = crc16(chunk);
    return 'XCAS:' + QR_PROTOCOL_VERSION + ':' + i + ':' + total + ':' + checksum + ':' + chunk;
  });
}

var _animatedState = {
  frames: null,
  currentIndex: 0,
  cycleCount: 0,
  intervalId: null,
  active: false,
  fps: DEFAULT_FPS,
  chunkSize: DEFAULT_CHUNK_SIZE
};

function startAnimatedQR(frames, fps) {
  _animatedState.frames = frames;
  _animatedState.fps = fps || DEFAULT_FPS;
  _animatedState.currentIndex = 0;
  _animatedState.cycleCount = 0;
  _animatedState.active = true;

  var container = document.getElementById('share-qr-code');
  var progress = document.getElementById('share-qr-progress');
  if (!container) return;

  function showFrame() {
    var frame = _animatedState.frames[_animatedState.currentIndex];
    generateStaticQR(frame, 'L').then(function(svg) {
      if (!_animatedState.active) return;
      container.innerHTML = svg;
      if (progress) {
        progress.textContent = t('frameProgress')
          .replace('{current}', _animatedState.currentIndex + 1)
          .replace('{total}', _animatedState.frames.length)
          .replace('{cycle}', _animatedState.cycleCount + 1);
      }
    });
    _animatedState.currentIndex++;
    if (_animatedState.currentIndex >= _animatedState.frames.length) {
      _animatedState.currentIndex = 0;
      _animatedState.cycleCount++;
    }
  }

  showFrame();
  _animatedState.intervalId = setInterval(showFrame, 1000 / _animatedState.fps);
}

function stopAnimatedQR() {
  if (_animatedState.intervalId) {
    clearInterval(_animatedState.intervalId);
    _animatedState.intervalId = null;
  }
  _animatedState.active = false;
}

// ── Encryption (Web Crypto API) ──────────────────────────────

function _deriveKey(password, salt) {
  var enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']).then(function(keyMaterial) {
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  });
}

function encryptData(compressed, password) {
  var salt = crypto.getRandomValues(new Uint8Array(16));
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var enc = new TextEncoder();
  return _deriveKey(password, salt).then(function(key) {
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(compressed));
  }).then(function(ciphertext) {
    // Concatenate salt(16) + iv(12) + ciphertext
    var buf = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    buf.set(salt, 0);
    buf.set(iv, salt.length);
    buf.set(new Uint8Array(ciphertext), salt.length + iv.length);
    // Base64 encode for URL safety
    var binary = '';
    for (var i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  });
}

function decryptData(encrypted, password) {
  // URL-safe base64 decode
  var b64 = encrypted.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  var binary = atob(b64);
  var buf = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

  var salt = buf.slice(0, 16);
  var iv = buf.slice(16, 28);
  var ciphertext = buf.slice(28);

  return _deriveKey(password, salt).then(function(key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ciphertext);
  }).then(function(plaintext) {
    return new TextDecoder().decode(plaintext);
  });
}

// ── QR Scanner ───────────────────────────────────────────────

var _jsQRModule = null;
var _scanSession = null;
var _scanAnimFrame = null;
var _scanStream = null;

function _loadJsQR() {
  if (_jsQRModule) return Promise.resolve(_jsQRModule);
  return import('https://cdn.jsdelivr.net/npm/jsqr/+esm').then(function(mod) {
    _jsQRModule = mod.default || mod;
    return _jsQRModule;
  });
}

function showScanQR() {
  if (document.getElementById('scan-qr-overlay')) return;

  var overlay = document.createElement('div');
  overlay.id = 'scan-qr-overlay';
  overlay.className = 'scan-qr-overlay';

  var video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.className = 'scan-viewfinder';

  var canvas = document.createElement('canvas');
  canvas.style.display = 'none';

  var statusBar = document.createElement('div');
  statusBar.className = 'scan-status';
  statusBar.id = 'scan-status';
  statusBar.textContent = t('scanStatus');

  var progressBar = document.createElement('div');
  progressBar.className = 'scan-progress-bar';
  progressBar.id = 'scan-progress';
  progressBar.innerHTML = '<div class="scan-progress-fill" id="scan-progress-fill"></div>';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'scan-close';
  closeBtn.textContent = '\u00d7';
  closeBtn.onclick = closeScanQR;

  overlay.appendChild(video);
  overlay.appendChild(canvas);
  overlay.appendChild(statusBar);
  overlay.appendChild(progressBar);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  _scanSession = { totalFrames: 0, receivedChunks: {}, receivedCount: 0, complete: false };

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(stream) {
    _scanStream = stream;
    video.srcObject = stream;
    video.play();
    _loadJsQR().then(function(jsQR) {
      startScanLoop(jsQR, video, canvas);
    });
  }).catch(function(err) {
    console.warn('Camera access denied:', err);
    statusBar.textContent = t('cameraError');
    statusBar.classList.add('error');
  });

  document.addEventListener('keydown', _scanEscHandler);
}

function startScanLoop(jsQR, video, canvas) {
  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  function tick() {
    if (!_scanStream) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        handleDecodedQR(code.data);
      }
    }
    _scanAnimFrame = requestAnimationFrame(tick);
  }
  _scanAnimFrame = requestAnimationFrame(tick);
}

function handleDecodedQR(data) {
  // Static QR URL
  if (data.indexOf('#nb=') !== -1) {
    var nbData = data.split('#nb=')[1];
    if (nbData) {
      closeScanQR();
      decompressNotebook(nbData).then(function(text) {
        if (!text) { alert(t('corruptData')); return; }
        var cellData = deserializeNotebook(text);
        if (!cellData) { alert(t('corruptData')); return; }
        _loadDeserializedCells(cellData);
      });
      return;
    }
  }

  // Encrypted static QR URL
  if (data.indexOf('#nbe=') !== -1) {
    var nbeData = data.split('#nbe=')[1];
    if (nbeData) {
      closeScanQR();
      _showPasswordPrompt(function(password) {
        decryptData(nbeData, password).then(function(text) {
          var cellData = deserializeNotebook(text);
          if (!cellData) { alert(t('corruptData')); return; }
          _loadDeserializedCells(cellData);
        }).catch(function() { alert(t('wrongPassword')); });
      });
      return;
    }
  }

  // Animated QR frame
  if (data.indexOf('XCAS:') === 0) {
    var parts = data.split(':');
    if (parts.length < 6) return;
    var frameIndex = parseInt(parts[2], 10);
    var totalFrames = parseInt(parts[3], 10);
    var frameCrc = parts[4];
    // Chunk data may contain colons, rejoin everything after 5th colon
    var chunkData = parts.slice(5).join(':');

    // Validate CRC
    if (crc16(chunkData) !== frameCrc) return;

    if (!_scanSession) return;
    _scanSession.totalFrames = totalFrames;

    // Ignore duplicates
    if (_scanSession.receivedChunks[frameIndex] !== undefined) return;

    _scanSession.receivedChunks[frameIndex] = chunkData;
    _scanSession.receivedCount++;

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    // Update progress UI
    var statusEl = document.getElementById('scan-status');
    var fillEl = document.getElementById('scan-progress-fill');
    if (statusEl) {
      statusEl.textContent = t('scanStatus') + ' ' + _scanSession.receivedCount + '/' + totalFrames;
    }
    if (fillEl) {
      fillEl.style.width = Math.round((_scanSession.receivedCount / totalFrames) * 100) + '%';
    }

    // Check completion
    if (_scanSession.receivedCount === totalFrames) {
      _scanSession.complete = true;
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      if (statusEl) statusEl.textContent = t('scanComplete');

      // Reconstruct
      var chunks = [];
      for (var i = 0; i < totalFrames; i++) {
        chunks.push(_scanSession.receivedChunks[i]);
      }
      var compressed = chunks.join('');

      closeScanQR();
      decompressNotebook(compressed).then(function(text) {
        if (!text) { alert(t('corruptData')); return; }
        var cellData = deserializeNotebook(text);
        if (!cellData) { alert(t('corruptData')); return; }
        _loadDeserializedCells(cellData);
      });
    }
  }
}

function closeScanQR() {
  if (_scanAnimFrame) {
    cancelAnimationFrame(_scanAnimFrame);
    _scanAnimFrame = null;
  }
  if (_scanStream) {
    _scanStream.getTracks().forEach(function(t) { t.stop(); });
    _scanStream = null;
  }
  var el = document.getElementById('scan-qr-overlay');
  if (el) el.remove();
  _scanSession = null;
  document.removeEventListener('keydown', _scanEscHandler);
}

function _scanEscHandler(e) {
  if (e.key === 'Escape') closeScanQR();
}

// ── Load deserialized cells into notebook ────────────────────

function _loadDeserializedCells(cellData) {
  // Build a loadNotebookData-compatible object
  // version: 2 so math cells go through ce.parse(LaTeX) path
  var data = {
    version: 2,
    cells: cellData.map(function(c) {
      return { type: c.type, content: c.content };
    })
  };
  loadNotebookData(data, { keepReactiveMode: true });
}

// ── Share QR Dialog ──────────────────────────────────────────

var _shareQRWakeLock = null;

function showShareQR(opts) {
  opts = opts || {};
  if (document.getElementById('share-qr-overlay')) return;

  if (cells.length === 0) {
    alert(t('emptyNotebook'));
    return;
  }

  compressNotebook().then(function(compressed) {
    var overlay = document.createElement('div');
    overlay.id = 'share-qr-overlay';
    overlay.className = 'share-qr-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'share-qr-dialog';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'share-qr-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.onclick = closeShareQR;

    var title = document.createElement('h2');
    title.textContent = t('shareQR');

    // Password field
    var passwordGroup = document.createElement('div');
    passwordGroup.className = 'share-password-group';
    var passwordLabel = document.createElement('label');
    passwordLabel.textContent = t('sharePassword');
    var passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.id = 'share-qr-password';
    passwordInput.placeholder = t('sharePassword');
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(passwordInput);

    var qrContainer = document.createElement('div');
    qrContainer.className = 'share-qr-code';
    qrContainer.id = 'share-qr-code';
    qrContainer.style.display = 'none';

    var progressEl = document.createElement('div');
    progressEl.className = 'qr-progress';
    progressEl.id = 'share-qr-progress';

    var urlDisplay = document.createElement('div');
    urlDisplay.className = 'share-qr-url';
    urlDisplay.id = 'share-qr-url';
    urlDisplay.style.display = 'none';

    // Animated QR controls
    var controls = document.createElement('div');
    controls.className = 'animated-qr-controls';
    controls.id = 'animated-qr-controls';
    controls.style.display = 'none';
    controls.innerHTML =
      '<div class="qr-slider-group"><label>' + t('frameRate') + '</label><input type="range" id="qr-fps-slider" min="1" max="12" value="' + DEFAULT_FPS + '"><span id="qr-fps-value">' + DEFAULT_FPS + ' fps</span></div>' +
      '<div class="qr-slider-group"><label>' + t('chunkSize') + '</label><input type="range" id="qr-chunk-slider" min="100" max="800" step="50" value="' + DEFAULT_CHUNK_SIZE + '"><span id="qr-chunk-value">' + DEFAULT_CHUNK_SIZE + ' B</span></div>' +
      '<button id="qr-stop-btn" onclick="toggleAnimatedQR()">' + t('stopAnimation') + '</button>';

    var actions = document.createElement('div');
    actions.className = 'share-qr-actions';

    var generateBtn = document.createElement('button');
    generateBtn.className = 'primary';
    generateBtn.textContent = t('generateQR');
    generateBtn.onclick = function() {
      var pw = passwordInput.value;
      _generateAndDisplayQR(compressed, pw);
    };

    var copyBtn = document.createElement('button');
    copyBtn.id = 'share-copy-btn';
    copyBtn.textContent = t('copyUrl');
    copyBtn.style.display = 'none';
    copyBtn.onclick = function() { copyNotebookURL(); };

    actions.appendChild(generateBtn);
    actions.appendChild(copyBtn);

    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(passwordGroup);
    dialog.appendChild(qrContainer);
    dialog.appendChild(progressEl);
    dialog.appendChild(controls);
    dialog.appendChild(urlDisplay);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeShareQR();
    });

    document.body.appendChild(overlay);
    document.addEventListener('keydown', _shareEscHandler);

    // QR is generated only after user clicks the generate button

    // Wire slider events
    var fpsSlider = document.getElementById('qr-fps-slider');
    var chunkSlider = document.getElementById('qr-chunk-slider');
    if (fpsSlider) {
      fpsSlider.oninput = function() {
        document.getElementById('qr-fps-value').textContent = this.value + ' fps';
        if (_animatedState.active) {
          stopAnimatedQR();
          var newFrames = buildFrames(compressed, parseInt(chunkSlider.value, 10));
          startAnimatedQR(newFrames, parseInt(this.value, 10));
        }
      };
    }
    if (chunkSlider) {
      chunkSlider.oninput = function() {
        document.getElementById('qr-chunk-value').textContent = this.value + ' B';
        if (_animatedState.active) {
          stopAnimatedQR();
          var newFrames = buildFrames(compressed, parseInt(this.value, 10));
          startAnimatedQR(newFrames, parseInt(fpsSlider.value, 10));
        }
      };
    }

    // Wake Lock for mobile display
    if (opts.wakeLock && navigator.wakeLock) {
      navigator.wakeLock.request('screen').then(function(lock) {
        _shareQRWakeLock = lock;
      }).catch(function() {});
    }
  });
}

function _generateAndDisplayQR(compressed, password) {
  var qrContainer = document.getElementById('share-qr-code');
  var urlDisplay = document.getElementById('share-qr-url');
  var controlsEl = document.getElementById('animated-qr-controls');
  var progressEl = document.getElementById('share-qr-progress');

  if (!qrContainer) return;
  qrContainer.style.display = '';
  qrContainer.innerHTML = '<p>Generating...</p>';
  if (urlDisplay) urlDisplay.style.display = '';
  var copyBtn = document.getElementById('share-copy-btn');
  if (copyBtn) copyBtn.style.display = '';

  var doGenerate = function(payload, isEncrypted) {
    var url = generateNotebookURL(payload, isEncrypted);
    if (urlDisplay) {
      urlDisplay.textContent = url.length > 120 ? url.substring(0, 120) + '...' : url;
      urlDisplay.dataset.fullUrl = url;
    }

    if (payload.length < STATIC_QR_THRESHOLD) {
      // Static QR
      if (controlsEl) controlsEl.style.display = 'none';
      if (progressEl) progressEl.textContent = '';
      stopAnimatedQR();
      generateStaticQR(url, 'L').then(function(svg) {
        qrContainer.innerHTML = svg;
      });
    } else {
      // Animated QR
      if (controlsEl) controlsEl.style.display = '';
      var chunkSize = parseInt((document.getElementById('qr-chunk-slider') || {}).value, 10) || DEFAULT_CHUNK_SIZE;
      var fps = parseInt((document.getElementById('qr-fps-slider') || {}).value, 10) || DEFAULT_FPS;
      var frames = buildFrames(payload, chunkSize);
      startAnimatedQR(frames, fps);
    }
  };

  if (password) {
    encryptData(compressed, password).then(function(encrypted) {
      doGenerate(encrypted, true);
    }).catch(function(err) {
      qrContainer.innerHTML = '<p class="error">Encryption failed: ' + err.message + '</p>';
    });
  } else {
    doGenerate(compressed, false);
  }
}

function toggleAnimatedQR() {
  var btn = document.getElementById('qr-stop-btn');
  if (_animatedState.active) {
    stopAnimatedQR();
    if (btn) btn.textContent = t('resumeAnimation');
  } else if (_animatedState.frames) {
    startAnimatedQR(_animatedState.frames, _animatedState.fps);
    if (btn) btn.textContent = t('stopAnimation');
  }
}

function copyNotebookURL() {
  var urlEl = document.getElementById('share-qr-url');
  var url = urlEl ? (urlEl.dataset.fullUrl || urlEl.textContent) : '';
  if (!url) return;
  navigator.clipboard.writeText(url).then(function() {
    var btn = document.getElementById('share-copy-btn');
    if (btn) {
      btn.textContent = t('urlCopied');
      setTimeout(function() { btn.textContent = t('copyUrl'); }, 2000);
    }
  });
}

function closeShareQR() {
  stopAnimatedQR();
  if (_shareQRWakeLock) {
    _shareQRWakeLock.release().catch(function() {});
    _shareQRWakeLock = null;
  }
  var el = document.getElementById('share-qr-overlay');
  if (el) el.remove();
  document.removeEventListener('keydown', _shareEscHandler);
}

function _shareEscHandler(e) {
  if (e.key === 'Escape') closeShareQR();
}

// ── Password Prompt Dialog ───────────────────────────────────

function _showPasswordPrompt(onSubmit) {
  if (document.getElementById('password-prompt-overlay')) return;

  var overlay = document.createElement('div');
  overlay.id = 'password-prompt-overlay';
  overlay.className = 'password-prompt-overlay';

  var dialog = document.createElement('div');
  dialog.className = 'password-prompt-dialog';

  var title = document.createElement('h3');
  title.textContent = t('passwordPrompt');

  var input = document.createElement('input');
  input.type = 'password';
  input.className = 'password-input';
  input.id = 'password-prompt-input';
  input.placeholder = t('sharePassword');

  var errorEl = document.createElement('div');
  errorEl.className = 'password-error';
  errorEl.id = 'password-prompt-error';

  var actions = document.createElement('div');
  actions.className = 'password-prompt-actions';

  var submitBtn = document.createElement('button');
  submitBtn.className = 'primary';
  submitBtn.textContent = 'OK';
  submitBtn.onclick = function() {
    var pw = input.value;
    if (!pw) return;
    errorEl.textContent = '';
    _closePasswordPrompt();
    onSubmit(pw);
  };

  var cancelBtn = document.createElement('button');
  cancelBtn.textContent = t('cancelCascade');
  cancelBtn.onclick = _closePasswordPrompt;

  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);

  dialog.appendChild(title);
  dialog.appendChild(input);
  dialog.appendChild(errorEl);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);

  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) _closePasswordPrompt();
  });

  document.body.appendChild(overlay);
  input.focus();

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') submitBtn.click();
    if (e.key === 'Escape') _closePasswordPrompt();
  });
}

function _closePasswordPrompt() {
  var el = document.getElementById('password-prompt-overlay');
  if (el) el.remove();
}

// ── Phone → PC Transfer ──────────────────────────────────────

function shareToPC() {
  compressNotebook().then(function(compressed) {
    var url = generateNotebookURL(compressed, false);
    if (navigator.share) {
      navigator.share({ title: 'rnGIAC', url: url }).catch(function() {});
    } else {
      navigator.clipboard.writeText(url).then(function() {
        alert(t('urlCopied'));
      });
    }
  });
}

function displayQRForPC() {
  showShareQR({ wakeLock: true });
}

function importViaQR() {
  showScanQR();
}

// ── URL Loading (called from boot.js) ────────────────────────

function loadFromURLHash() {
  var hash = location.hash;
  if (!hash) return false;

  if (hash.indexOf('#nb=') === 0) {
    var data = hash.substring(4);
    decompressNotebook(data).then(function(text) {
      if (!text) { alert(t('corruptData')); return; }
      var cellData = deserializeNotebook(text);
      if (!cellData) { alert(t('corruptData')); return; }
      _loadDeserializedCells(cellData);
      history.replaceState(null, '', location.pathname);
    });
    return true;
  }

  if (hash.indexOf('#nbe=') === 0) {
    var encData = hash.substring(5);
    _showPasswordPrompt(function(password) {
      decryptData(encData, password).then(function(text) {
        var cellData = deserializeNotebook(text);
        if (!cellData) { alert(t('corruptData')); return; }
        _loadDeserializedCells(cellData);
        history.replaceState(null, '', location.pathname);
      }).catch(function() {
        alert(t('wrongPassword'));
      });
    });
    return true;
  }

  return false;
}
