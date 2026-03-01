#!/usr/bin/env node
'use strict';

// Generate GIAC help data files from aide_cas sources
// Usage: node scripts/generate-help.js [--validate]
//
// Fetches:
//   https://raw.githubusercontent.com/s-celles/giac/main/doc/aide_cas
//   https://raw.githubusercontent.com/s-celles/giac/main/doc/de/aide_cas
//
// Outputs:
//   js/help/help-en.js  (English descriptions + params + aliases)
//   js/help/help-fr.js  (French descriptions + params + aliases)
//   js/help/help-es.js  (Spanish descriptions + params + aliases)
//   js/help/help-el.js  (Greek descriptions + params + aliases)
//   js/help/help-de.js  (German descriptions + params + aliases)
//   js/help/help-zh.js  (Chinese descriptions + params + aliases)
//   js/help/help-details.js  (shared: examples + related commands)

const fs = require('fs');
const path = require('path');
const https = require('https');

const MAIN_URL = 'https://raw.githubusercontent.com/s-celles/giac/main/doc/aide_cas';
const DE_URL = 'https://raw.githubusercontent.com/s-celles/giac/main/doc/de/aide_cas';

const LANG_CODES = {
  1: 'fr',
  2: 'en',
  3: 'es',
  4: 'el',
  5: 'de',
  8: 'zh'
};

const LANG_NAMES = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  el: 'Greek',
  de: 'German',
  zh: 'Chinese (Simplified)',
  ar: 'Arabic',
  hi: 'Hindi',
  ja: 'Japanese',
  ru: 'Russian'
};

// Languages without aide_cas translations — generated with empty descriptions,
// relying on English fallback in the UI
const EXTRA_LANGS = ['ar', 'hi', 'ja', 'ru'];

const OUTPUT_DIR = path.join(__dirname, '..', 'js', 'help');

// ── Fetch helper ─────────────────────────────────────────────

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Parse aide_cas ───────────────────────────────────────────

function parseAideCas(text) {
  const entries = [];
  const blocks = text.split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.length > 0);
    if (lines.length === 0) continue;

    // Find the # line (command name)
    const headerLine = lines.find(l => l.startsWith('# '));
    if (!headerLine) continue;

    const names = headerLine.substring(2).trim().split(/\s+/);
    const primary = names[0];
    const aliases = names.slice(1);

    const entry = {
      primary,
      aliases,
      descriptions: {},  // langCode -> description
      params: '',
      related: [],
      examples: []
    };

    for (const line of lines) {
      if (line.startsWith('# ')) continue;

      // Check for numeric prefix (language code or syntax)
      const prefixMatch = line.match(/^(-?\d+)\s+(.*)/);
      if (prefixMatch) {
        const code = parseInt(prefixMatch[1]);
        const content = prefixMatch[2].trim();

        if (code === 0) {
          entry.params = content;
        } else if (code < 0) {
          // Related command (-1 to -14)
          if (content) entry.related.push(content);
        } else if (LANG_CODES[code]) {
          entry.descriptions[LANG_CODES[code]] = content;
        }
      } else if (!line.startsWith('# ')) {
        // Example line (no numeric prefix)
        entry.examples.push(line.trimStart());
      }
    }

    entries.push(entry);
  }

  return entries;
}

function parseDeAideCas(text) {
  // German supplement: pairs of lines — # command followed by 5 description
  // No blank lines between entries, so parse line by line
  const overrides = {};
  const lines = text.split('\n');
  let currentCmd = null;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      currentCmd = line.substring(2).trim().split(/\s+/)[0];
    } else if (currentCmd) {
      const match = line.match(/^5\s+(.*)/);
      if (match) {
        overrides[currentCmd] = match[1].trim();
        currentCmd = null;
      }
    }
  }

  return overrides;
}

// ── Build data structures ────────────────────────────────────

function buildHelpData(entries, deOverrides) {
  // Merge German supplement
  for (const entry of entries) {
    if (deOverrides[entry.primary] && !entry.descriptions.de) {
      entry.descriptions.de = deOverrides[entry.primary];
    }
    // Also check aliases
    for (const alias of entry.aliases) {
      if (deOverrides[alias] && !entry.descriptions.de) {
        entry.descriptions.de = deOverrides[alias];
      }
    }
  }

  // Build per-language data and shared details
  const langs = ['en', 'fr', 'es', 'el', 'de', 'zh'];
  const allLangs = [...langs, ...EXTRA_LANGS];
  const perLang = {};
  for (const lang of allLangs) {
    perLang[lang] = { cmds: {}, aliases: {} };
  }
  const details = {};

  for (const entry of entries) {
    const name = entry.primary;

    // Per-language entries
    for (const lang of allLangs) {
      perLang[lang].cmds[name] = {
        d: entry.descriptions[lang] || '',
        p: entry.params
      };
      if (entry.aliases.length > 0) {
        perLang[lang].cmds[name].a = entry.aliases;
      }

      // Alias map
      for (const alias of entry.aliases) {
        // Only add if alias is not also a primary command
        if (!entries.some(e => e.primary === alias)) {
          perLang[lang].aliases[alias] = name;
        }
      }
    }

    // Shared details (language-independent)
    if (entry.related.length > 0 || entry.examples.length > 0) {
      details[name] = {};
      if (entry.related.length > 0) details[name].r = entry.related;
      if (entry.examples.length > 0) details[name].e = entry.examples;
    }
  }

  return { perLang, details };
}

// ── Generate JS files ────────────────────────────────────────

function escapeStr(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function generatePerLangFile(lang, data) {
  const langName = LANG_NAMES[lang] || lang;
  const cmdCount = Object.keys(data.cmds).length;
  const aliasCount = Object.keys(data.aliases).length;
  const descCount = Object.values(data.cmds).filter(e => e.d).length;
  const coverage = ((descCount / cmdCount) * 100).toFixed(1);
  const date = new Date().toISOString().split('T')[0];

  let js = `'use strict';\n`;
  js += `// Auto-generated from giac aide_cas — do not edit manually\n`;
  js += `// Generated: ${date}\n`;
  js += `// Language: ${langName} (${lang})\n`;
  js += `// Commands: ${cmdCount} | Aliases: ${aliasCount} | Descriptions: ${descCount} (${coverage}%)\n`;
  js += `// Source: https://raw.githubusercontent.com/s-celles/giac/main/doc/aide_cas\n\n`;
  js += `var GIAC_HELP = {\n`;
  js += `  cmds: {\n`;

  const cmdNames = Object.keys(data.cmds).sort();
  for (let i = 0; i < cmdNames.length; i++) {
    const name = cmdNames[i];
    const entry = data.cmds[name];
    const parts = [];
    parts.push(`d:'${escapeStr(entry.d)}'`);
    if (entry.p) parts.push(`p:'${escapeStr(entry.p)}'`);
    if (entry.a && entry.a.length > 0) {
      parts.push(`a:[${entry.a.map(a => `'${escapeStr(a)}'`).join(',')}]`);
    }
    const comma = i < cmdNames.length - 1 ? ',' : '';
    js += `    '${escapeStr(name)}':{${parts.join(',')}}${comma}\n`;
  }

  js += `  },\n`;
  js += `  aliases: {\n`;

  const aliasNames = Object.keys(data.aliases).sort();
  for (let i = 0; i < aliasNames.length; i++) {
    const alias = aliasNames[i];
    const primary = data.aliases[alias];
    const comma = i < aliasNames.length - 1 ? ',' : '';
    js += `    '${escapeStr(alias)}':'${escapeStr(primary)}'${comma}\n`;
  }

  js += `  }\n`;
  js += `};\n`;

  return js;
}

function generateDetailsFile(details) {
  const date = new Date().toISOString().split('T')[0];
  const entryCount = Object.keys(details).length;

  let js = `'use strict';\n`;
  js += `// Auto-generated from giac aide_cas — do not edit manually\n`;
  js += `// Generated: ${date}\n`;
  js += `// Entries with examples/related: ${entryCount}\n`;
  js += `// Source: https://raw.githubusercontent.com/s-celles/giac/main/doc/aide_cas\n\n`;
  js += `var GIAC_HELP_DETAILS = {\n`;

  const names = Object.keys(details).sort();
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const entry = details[name];
    const parts = [];
    if (entry.r && entry.r.length > 0) {
      parts.push(`r:[${entry.r.map(r => `'${escapeStr(r)}'`).join(',')}]`);
    }
    if (entry.e && entry.e.length > 0) {
      parts.push(`e:[${entry.e.map(e => `'${escapeStr(e)}'`).join(',')}]`);
    }
    const comma = i < names.length - 1 ? ',' : '';
    js += `  '${escapeStr(name)}':{${parts.join(',')}}${comma}\n`;
  }

  js += `};\n`;

  return js;
}

// ── Validation ───────────────────────────────────────────────

function validate(perLang, details) {
  const errors = [];

  // Check all alias targets exist
  for (const lang of Object.keys(perLang)) {
    const data = perLang[lang];
    for (const [alias, primary] of Object.entries(data.aliases)) {
      if (!data.cmds[primary]) {
        errors.push(`[${lang}] Alias '${alias}' points to unknown command '${primary}'`);
      }
    }
  }

  // Check English has no empty descriptions
  const enData = perLang.en;
  let emptyEn = 0;
  for (const [name, entry] of Object.entries(enData.cmds)) {
    if (!entry.d) emptyEn++;
  }
  if (emptyEn > 0) {
    errors.push(`[en] ${emptyEn} commands have empty English descriptions`);
  }

  // Check related commands reference valid command names
  for (const [name, detail] of Object.entries(details)) {
    if (detail.r) {
      for (const rel of detail.r) {
        if (!enData.cmds[rel] && !enData.aliases[rel]) {
          // Not an error, just a warning — related commands may not all be documented
        }
      }
    }
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const doValidate = process.argv.includes('--validate');

  console.log('Fetching main aide_cas...');
  const mainText = await fetch(MAIN_URL);
  console.log(`  ${mainText.length} bytes, ${mainText.split('\n').length} lines`);

  console.log('Fetching German supplement...');
  const deText = await fetch(DE_URL);
  console.log(`  ${deText.length} bytes, ${deText.split('\n').length} lines`);

  console.log('Parsing...');
  const entries = parseAideCas(mainText);
  console.log(`  ${entries.length} command entries from main file`);

  const deOverrides = parseDeAideCas(deText);
  console.log(`  ${Object.keys(deOverrides).length} German supplement entries`);

  console.log('Building data structures...');
  const { perLang, details } = buildHelpData(entries, deOverrides);
  const allLangs = ['en', 'fr', 'es', 'el', 'de', 'zh', ...EXTRA_LANGS];

  // Summary table
  console.log('\n=== Summary ===');
  console.log('Language  | Commands | Aliases | Descriptions | Coverage');
  console.log('----------|----------|---------|--------------|--------');
  for (const lang of allLangs) {
    const data = perLang[lang];
    const cmdCount = Object.keys(data.cmds).length;
    const aliasCount = Object.keys(data.aliases).length;
    const descCount = Object.values(data.cmds).filter(e => e.d).length;
    const coverage = ((descCount / cmdCount) * 100).toFixed(1);
    const marker = EXTRA_LANGS.includes(lang) ? ' (fallback)' : '';
    console.log(`${(lang + '       ').slice(0, 9)} | ${String(cmdCount).padStart(8)} | ${String(aliasCount).padStart(7)} | ${String(descCount).padStart(12)} | ${coverage}%${marker}`);
  }

  const detailCount = Object.keys(details).length;
  const exampleCount = Object.values(details).reduce((sum, d) => sum + (d.e ? d.e.length : 0), 0);
  console.log(`\nDetails: ${detailCount} entries, ${exampleCount} total examples`);

  // Validation
  if (doValidate) {
    console.log('\n=== Validation ===');
    const errors = validate(perLang, details);
    if (errors.length === 0) {
      console.log('All validations passed.');
    } else {
      for (const err of errors) {
        console.log(`  ERROR: ${err}`);
      }
    }
  }

  // Write files
  console.log('\n=== Writing files ===');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const lang of allLangs) {
    const filename = `help-${lang}.js`;
    const content = generatePerLangFile(lang, perLang[lang]);
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), content);
    console.log(`  ${filename}: ${(content.length / 1024).toFixed(1)} KB`);
  }

  const detailsContent = generateDetailsFile(details);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'help-details.js'), detailsContent);
  console.log(`  help-details.js: ${(detailsContent.length / 1024).toFixed(1)} KB`);

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
