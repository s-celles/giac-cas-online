'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 1 — INTERNATIONALIZATION (i18n)
//
// All user-facing strings live in LOCALES. Any element with
// data-i18n="key" is auto-updated when the locale changes.
//
// Each language is defined in its own file under js/i18n/.
//
// To add a language:
//   1. Create js/i18n/<code>.js  with  var I18N_XX = { … };
//   2. Add a <script> tag in index.html before this file
//   3. Add an entry to LOCALES below
//   4. Add an <option> in #lang-select
// ─────────────────────────────────────────────────────────────

const LOCALES = {
  en: I18N_EN,
  fr: I18N_FR,
  es: I18N_ES,
  de: I18N_DE,
  ar: I18N_AR,
  hi: I18N_HI,
  ru: I18N_RU,
  zh: I18N_ZH,
  ja: I18N_JA,
};

const RTL_LOCALES = ['ar'];

let currentLocale = 'en';

/** Look up a translation key; falls back to English */
function t(key) {
  return LOCALES[currentLocale]?.[key] ?? LOCALES.en[key] ?? key;
}

/** Refresh all data-i18n elements + dynamic placeholders */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('.cell').forEach(cell => {
    const ta = cell.querySelector('textarea');
    if (ta && cell.dataset.type === 'raw')  ta.placeholder = t('placeholderRaw');
    if (ta && cell.dataset.type === 'text') ta.placeholder = t('placeholderText');
    // Refresh i18n-bound text cells
    if (ta && cell.dataset.i18nContent) {
      var keys = cell.dataset.i18nContent.split(',');
      ta.value = keys.map(function(k) { return t(k.trim()); }).join('\n\n');
      if (typeof renderTextCell === 'function') renderTextCell(cell.id);
    }
  });
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = RTL_LOCALES.includes(currentLocale) ? 'rtl' : 'ltr';
}

/** Set locale, refresh UI, persist preference */
function setLocale(locale) {
  if (!LOCALES[locale]) return;
  currentLocale = locale;
  document.getElementById('lang-select').value = locale;
  applyI18n();
  if (typeof setupMathKeyboard === 'function') setupMathKeyboard();
  try { localStorage.setItem('giac-nb-locale', locale); } catch(e) {}
}

/** Auto-detect from stored preference or browser language */
function detectLocale() {
  try {
    const s = localStorage.getItem('giac-nb-locale') || localStorage.getItem('xcas-nb-locale');
    if (s && LOCALES[s]) return s;
  } catch(e) {}
  const lang = (navigator.language || '').slice(0, 2);
  return LOCALES[lang] ? lang : 'en';
}
