#!/usr/bin/env node
'use strict';

/**
 * Computes a hash of all app shell files and writes it into sw.js.
 * Run before committing: node scripts/update-sw-hash.js
 *
 * This ensures the browser detects sw.js has changed whenever any
 * cached file is modified, triggering a service worker update.
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SW_PATH = path.join(ROOT, 'sw.js');

// Files to hash (same as SHELL_FILES in sw.js, minus './')
const FILES = [
  'index.html',
  'css/notebook.css',
  'favicon.ico',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'manifest.webmanifest',
  'js/i18n/en.js', 'js/i18n/fr.js', 'js/i18n/es.js',
  'js/i18n/de.js', 'js/i18n/el.js', 'js/i18n/ar.js',
  'js/i18n/hi.js', 'js/i18n/ru.js', 'js/i18n/zh.js',
  'js/i18n/ja.js', 'js/i18n.js',
  'js/giac-commands.js', 'js/giac-init.js', 'js/mathjson-giac.js',
  'js/kernel-registry.js', 'js/kernel-giac.js',
  'js/kernel-compute-engine.js',
  'js/state.js', 'js/io.js', 'js/plot-rendering.js',
  'js/reactive-dag.js', 'js/dag-diagram.js',
  'js/cells.js', 'js/execution.js', 'js/actions.js',
  'js/examples.js',
  'js/fountain.js', 'js/qr-sharing.js', 'js/p2p-transfer.js',
  'js/command-menu-data.js', 'js/command-menu.js',
  'js/help/help-en.js',
  'js/command-help.js', 'js/command-discovery.js',
  'js/boot.js', 'js/slider-components.js'
];

// Compute combined hash
const hash = crypto.createHash('sha256');
for (const file of FILES) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    hash.update(fs.readFileSync(fullPath));
  } else {
    console.warn('Warning: file not found:', file);
  }
}
const shortHash = hash.digest('hex').slice(0, 10);

// Update CACHE_HASH in sw.js
let sw = fs.readFileSync(SW_PATH, 'utf8');
const oldMatch = sw.match(/var CACHE_HASH = '([^']+)'/);
if (!oldMatch) {
  console.error('Error: CACHE_HASH not found in sw.js');
  process.exit(1);
}

if (oldMatch[1] === shortHash) {
  console.log('No change — CACHE_HASH is already', shortHash);
  process.exit(0);
}

sw = sw.replace(
  /var CACHE_HASH = '[^']+'/,
  "var CACHE_HASH = '" + shortHash + "'"
);
fs.writeFileSync(SW_PATH, sw);
console.log('Updated CACHE_HASH:', oldMatch[1], '→', shortHash);
