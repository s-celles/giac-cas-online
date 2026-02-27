'use strict';

// FOUNTAIN CODES (LT CODES) FOR QR NOTEBOOK SHARING
// ─────────────────────────────────────────────────────────────
// Wraps `luby-transform` CDN library for fountain encoding/decoding.
// Frame format: XCAS:F:1:{k}:{bytes}:{checksum}:{indices}:{base64data}

var FOUNTAIN_PROTOCOL_VERSION = 1;

// ── CDN Loader ──────────────────────────────────────────────

var _ltModule = null;

function _loadLT() {
  if (_ltModule) return Promise.resolve(_ltModule);
  return import('https://cdn.jsdelivr.net/npm/luby-transform/+esm').then(function(mod) {
    _ltModule = mod.default || mod;
    return _ltModule;
  });
}

// ── Base64url helpers ───────────────────────────────────────

function _base64urlEncode(bytes) {
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function _base64urlDecode(str) {
  try {
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch (e) {
    return null;
  }
}

// ── Frame Serialization ─────────────────────────────────────
// Frame: XCAS:F:{version}:{k}:{bytes}:{checksum}:{indices_csv}:{base64data}
// - k: number of source blocks
// - bytes: compressed data length (used by luby-transform decoder)
// - checksum: encoder checksum (used by luby-transform decoder)
// - indices_csv: comma-separated block indices (e.g., "0,3,7")
// - base64data: base64url-encoded XOR'd block data

function parseFountainFrame(str) {
  if (str.indexOf('XCAS:F:') !== 0) return null;
  var parts = str.split(':');
  // XCAS:F:ver:k:bytes:checksum:indices:base64data => 8 parts minimum
  if (parts.length < 8) return null;
  var version = parseInt(parts[2], 10);
  var k = parseInt(parts[3], 10);
  var bytes = parseInt(parts[4], 10);
  var checksum = parseInt(parts[5], 10);
  var indicesStr = parts[6];
  // base64 payload may contain colons — rejoin after 7th colon
  var payload = parts.slice(7).join(':');
  if (isNaN(version) || isNaN(k) || isNaN(bytes) || isNaN(checksum)) return null;

  var indices = indicesStr.split(',').map(function(s) { return parseInt(s, 10); });
  if (indices.some(isNaN)) return null;

  var data = _base64urlDecode(payload);
  if (!data) return null;

  return {
    version: version,
    k: k,
    bytes: bytes,
    checksum: checksum,
    indices: indices,
    data: data
  };
}

function buildFountainFrame(block) {
  // block: EncodedBlock {k, bytes, checksum, indices, data}
  var indicesStr = block.indices.join(',');
  var payload = _base64urlEncode(block.data);
  return 'XCAS:F:' + FOUNTAIN_PROTOCOL_VERSION + ':' +
    block.k + ':' + block.bytes + ':' + block.checksum + ':' +
    indicesStr + ':' + payload;
}

// ── Fountain Encoder ────────────────────────────────────────

function createFountainEncoder(data, blockSize) {
  // data: Uint8Array, blockSize: integer
  // Returns a Promise resolving to {k, next()}
  blockSize = blockSize || 300;

  return _loadLT().then(function(lt) {
    // compress=false since data is already LZString-compressed
    var encoder = lt.createEncoder(data, blockSize, false);

    // fountain() is a generator — get an iterator
    var gen = encoder.fountain();

    return {
      k: encoder.k,
      blockSize: blockSize,
      totalBytes: data.length,
      next: function() {
        var block = gen.next().value;
        return buildFountainFrame(block);
      }
    };
  });
}

// ── Fountain Decoder ────────────────────────────────────────

function FountainDecoder() {
  this.k = 0;
  this.decodedCount = 0;
  this.receivedCount = 0;
  this.complete = false;
  this._decoder = null;
  this._result = null;
}

FountainDecoder.prototype.addPacket = function(frameStr) {
  var self = this;
  var parsed = parseFountainFrame(frameStr);
  if (!parsed) return Promise.resolve({ decoded: self.decodedCount, total: self.k, complete: false });

  // Initialize on first packet
  if (!self.k) {
    self.k = parsed.k;
  }

  // Discard packets from different sessions
  if (parsed.k !== self.k) {
    return Promise.resolve({ decoded: self.decodedCount, total: self.k, complete: self.complete });
  }

  return _loadLT().then(function(lt) {
    if (!self._decoder) {
      self._decoder = lt.createDecoder();
    }

    // Build an EncodedBlock as expected by luby-transform
    var block = {
      k: parsed.k,
      bytes: parsed.bytes,
      checksum: parsed.checksum,
      indices: parsed.indices,
      data: parsed.data
    };

    self.receivedCount++;

    try {
      var isComplete = self._decoder.addBlock(block);
      self.decodedCount = self._decoder.decodedCount || 0;

      if (isComplete) {
        self.complete = true;
        self._result = self._decoder.getDecoded();
      }
    } catch (e) {
      // Checksum mismatch or other error — ignore this block
      console.warn('Fountain decode error:', e.message);
    }

    return { decoded: self.decodedCount, received: self.receivedCount, total: self.k, complete: self.complete };
  });
};

FountainDecoder.prototype.getResult = function() {
  return this._result;
};
