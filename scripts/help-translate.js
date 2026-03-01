#!/usr/bin/env node
'use strict';

// Help translation pipeline utilities
//
// Extract:  node scripts/help-translate.js extract [--chunks N]
//   Reads js/help/help-en.js → outputs /tmp/help-translate/chunk-NNN.json
//
// Build:    node scripts/help-translate.js build <lang> <translations-dir>
//   Reads translations + help-en.js structure → js/help/help-<lang>.js

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HELP_DIR = path.join(__dirname, '..', 'js', 'help');
const TMP_DIR = '/tmp/help-translate';

// ── Load help-en.js via VM sandbox ──────────────────────────

function loadHelpData(lang) {
  const file = path.join(HELP_DIR, `help-${lang}.js`);
  const code = fs.readFileSync(file, 'utf8');
  const sandbox = {};
  vm.runInNewContext(code, sandbox);
  return sandbox.GIAC_HELP;
}

// ── Extract command → export chunks of descriptions ─────────

function extract(numChunks) {
  const help = loadHelpData('en');
  const cmds = Object.keys(help.cmds).sort();
  const descriptions = {};
  let withDesc = 0;

  for (const cmd of cmds) {
    const d = help.cmds[cmd].d;
    if (d) {
      descriptions[cmd] = d;
      withDesc++;
    }
  }

  console.log(`Extracted ${withDesc} descriptions from ${cmds.length} commands`);

  // Split into chunks
  const keys = Object.keys(descriptions);
  const chunkSize = Math.ceil(keys.length / numChunks);
  fs.mkdirSync(TMP_DIR, { recursive: true });

  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, keys.length);
    const chunk = {};
    for (let j = start; j < end; j++) {
      chunk[keys[j]] = descriptions[keys[j]];
    }
    const file = path.join(TMP_DIR, `chunk-${String(i + 1).padStart(3, '0')}.json`);
    fs.writeFileSync(file, JSON.stringify(chunk, null, 2));
    console.log(`  chunk-${String(i + 1).padStart(3, '0')}.json: ${Object.keys(chunk).length} entries (${keys[start]}..${keys[end - 1]})`);
  }

  console.log(`\nChunks written to ${TMP_DIR}/`);
  console.log(`Total: ${withDesc} descriptions in ${numChunks} chunks`);
}

// ── Build help file from translations ───────────────────────

const LANG_NAMES = {
  ar: 'Arabic', hi: 'Hindi', ja: 'Japanese', ru: 'Russian',
  en: 'English', fr: 'French', es: 'Spanish', el: 'Greek',
  de: 'German', zh: 'Chinese (Simplified)'
};

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function build(lang, translationsDir) {
  // Load English structure
  const enHelp = loadHelpData('en');
  const cmds = Object.keys(enHelp.cmds).sort();

  // Load all translation chunk files
  const translations = {};
  const files = fs.readdirSync(translationsDir).filter(f => f.endsWith('.json')).sort();
  for (const file of files) {
    const chunk = JSON.parse(fs.readFileSync(path.join(translationsDir, file), 'utf8'));
    Object.assign(translations, chunk);
  }

  const translatedCount = Object.values(translations).filter(v => v).length;
  console.log(`Loaded ${translatedCount} translations from ${files.length} files`);

  // Generate help file
  const langName = LANG_NAMES[lang] || lang;
  const aliasCount = Object.keys(enHelp.aliases).length;
  const coverage = ((translatedCount / cmds.length) * 100).toFixed(1);
  const date = new Date().toISOString().split('T')[0];

  let js = `'use strict';\n`;
  js += `// Auto-generated from giac aide_cas — translated descriptions\n`;
  js += `// Generated: ${date}\n`;
  js += `// Language: ${langName} (${lang})\n`;
  js += `// Commands: ${cmds.length} | Aliases: ${aliasCount} | Descriptions: ${translatedCount} (${coverage}%)\n`;
  js += `// Source: https://raw.githubusercontent.com/s-celles/giac/main/doc/aide_cas\n\n`;
  js += `var GIAC_HELP = {\n`;
  js += `  cmds: {\n`;

  for (let i = 0; i < cmds.length; i++) {
    const name = cmds[i];
    const entry = enHelp.cmds[name];
    const desc = translations[name] || '';
    const parts = [];
    parts.push(`d:'${escapeStr(desc)}'`);
    if (entry.p) parts.push(`p:'${escapeStr(entry.p)}'`);
    if (entry.a && entry.a.length > 0) {
      parts.push(`a:[${entry.a.map(a => `'${escapeStr(a)}'`).join(',')}]`);
    }
    const comma = i < cmds.length - 1 ? ',' : '';
    js += `    '${escapeStr(name)}':{${parts.join(',')}}${comma}\n`;
  }

  js += `  },\n`;
  js += `  aliases: {\n`;

  const aliasNames = Object.keys(enHelp.aliases).sort();
  for (let i = 0; i < aliasNames.length; i++) {
    const alias = aliasNames[i];
    const primary = enHelp.aliases[alias];
    const comma = i < aliasNames.length - 1 ? ',' : '';
    js += `    '${escapeStr(alias)}':'${escapeStr(primary)}'${comma}\n`;
  }

  js += `  }\n`;
  js += `};\n`;

  const outFile = path.join(HELP_DIR, `help-${lang}.js`);
  fs.writeFileSync(outFile, js);
  console.log(`Written ${outFile} (${(js.length / 1024).toFixed(1)} KB, ${coverage}% coverage)`);
}

// ── CLI ─────────────────────────────────────────────────────

const cmd = process.argv[2];
if (cmd === 'extract') {
  const chunksIdx = process.argv.indexOf('--chunks');
  const numChunks = chunksIdx >= 0 ? parseInt(process.argv[chunksIdx + 1]) : 4;
  extract(numChunks);
} else if (cmd === 'build') {
  const lang = process.argv[3];
  const dir = process.argv[4];
  if (!lang || !dir) {
    console.error('Usage: node scripts/help-translate.js build <lang> <translations-dir>');
    process.exit(1);
  }
  build(lang, dir);
} else {
  console.error('Usage:');
  console.error('  node scripts/help-translate.js extract [--chunks N]');
  console.error('  node scripts/help-translate.js build <lang> <translations-dir>');
  process.exit(1);
}
