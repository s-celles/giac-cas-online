'use strict';

// ─────────────────────────────────────────────────────────────
// SECTION 1 — INTERNATIONALIZATION (i18n)
//
// All user-facing strings live in LOCALES. Any element with
// data-i18n="key" is auto-updated when the locale changes.
//
// To add a language:
//   1. Add an entry to LOCALES
//   2. Add an <option> in #lang-select
// ─────────────────────────────────────────────────────────────

const LOCALES = {
  en: {
    title: 'Xcas Notebook',
    subtitle: 'Reactive CAS — MathJSON ↔ Giac via WebAssembly',
    giacLoading: 'Loading Giac…',
    giacReady: 'Giac ready',
    giacError: 'Giac init error',
    giacDemo: 'Demo mode (Giac not loaded)',
    addMath: '+ Math', addRaw: '+ Xcas raw', addText: '+ Text',
    runAll: '▶ Run all', clearOutputs: '✕ Clear outputs',
    exportBtn: '💾 Export', importBtn: '📂 Import',
    shortcutRun: 'Run', shortcutRunNew: 'Run + new cell',
    showMathJSON: 'Show MathJSON',
    cellMath: 'Math', cellRaw: 'Xcas', cellText: 'Text',
    placeholderRaw: 'Xcas syntax (e.g. factor(x^4-1))',
    placeholderText: 'Notes, Markdown…',
    computing: 'Computing…',
    giacNotReady: '⏳ Giac is still loading…',
    errorPrefix: '✗ Error:',
    moveUp: 'Move up', moveDown: 'Move down',
    deleteCell: 'Delete', runCell: 'Run',
    modeVisual: 'Visual math input', modeRaw: 'Raw Xcas syntax',
    invalidJson: 'Invalid JSON file',
    welcomeTitle: '# Welcome to the Xcas Notebook',
    welcomeBody: 'Type math visually (MathJSON) or use raw Xcas syntax.\nTick **Show MathJSON** at the bottom to inspect the conversion pipeline.',
    plot3dNotSupported: '3D plots are not yet supported. Use 2D plot commands instead.',
    plotCoordinates: 'Coordinates',
    reactiveToggle: 'Reactive',
    pendingEvaluation: 'Pending…',
    dependencyError: 'Dependency error: upstream cell failed',
    cyclicDependency: 'Circular dependency detected',
    duplicateVariable: 'Duplicate variable definition',
    brokenDependency: 'Broken dependency: upstream cell deleted',
    staleOutputWarning: 'Some outputs may be stale. Re-evaluate all?',
    reEvalAll: 'Re-evaluate all',
    cancelCascade: 'Cancel',
    reactiveReady: 'Reactive mode enabled. Click "Run all" to build the dependency graph and evaluate.',
    runAllReactive: '▶ Run all (reactive)',
  },
  fr: {
    title: 'Notebook Xcas',
    subtitle: 'Calcul formel réactif — MathJSON ↔ Giac via WebAssembly',
    giacLoading: 'Chargement de Giac…',
    giacReady: 'Giac prêt',
    giacError: 'Erreur init Giac',
    giacDemo: 'Mode démo (Giac non chargé)',
    addMath: '+ Math', addRaw: '+ Xcas brut', addText: '+ Texte',
    runAll: '▶ Tout exécuter', clearOutputs: '✕ Effacer sorties',
    exportBtn: '💾 Exporter', importBtn: '📂 Importer',
    shortcutRun: 'Exécuter', shortcutRunNew: 'Exécuter + nouvelle cellule',
    showMathJSON: 'Afficher MathJSON',
    cellMath: 'Math', cellRaw: 'Xcas', cellText: 'Texte',
    placeholderRaw: 'Syntaxe Xcas (ex : factor(x^4-1))',
    placeholderText: 'Notes, Markdown…',
    computing: 'Calcul en cours…',
    giacNotReady: '⏳ Giac en chargement…',
    errorPrefix: '✗ Erreur :',
    moveUp: 'Monter', moveDown: 'Descendre',
    deleteCell: 'Supprimer', runCell: 'Exécuter',
    modeVisual: 'Saisie math visuelle', modeRaw: 'Syntaxe Xcas brute',
    invalidJson: 'Fichier JSON invalide',
    welcomeTitle: '# Bienvenue dans le Notebook Xcas',
    welcomeBody: 'Saisissez des maths visuellement (MathJSON) ou en syntaxe Xcas brute.\nCochez **Afficher MathJSON** en bas pour inspecter la conversion.',
    plot3dNotSupported: 'Les graphiques 3D ne sont pas encore pris en charge. Utilisez les commandes de tracé 2D.',
    plotCoordinates: 'Coordonnées',
    reactiveToggle: 'Réactif',
    pendingEvaluation: 'En attente…',
    dependencyError: 'Erreur de dépendance : la cellule amont a échoué',
    cyclicDependency: 'Dépendance circulaire détectée',
    duplicateVariable: 'Définition de variable en double',
    brokenDependency: 'Dépendance cassée : cellule amont supprimée',
    staleOutputWarning: 'Certaines sorties peuvent être obsolètes. Tout réévaluer ?',
    reEvalAll: 'Tout réévaluer',
    cancelCascade: 'Annuler',
    reactiveReady: 'Mode réactif activé. Cliquez sur « Tout exécuter » pour construire le graphe de dépendances et évaluer.',
    runAllReactive: '▶ Tout exécuter (réactif)',
  },
  es: {
    title: 'Cuaderno Xcas',
    subtitle: 'CAS reactivo — MathJSON ↔ Giac vía WebAssembly',
    giacLoading: 'Cargando Giac…',
    giacReady: 'Giac listo',
    giacError: 'Error al iniciar Giac',
    giacDemo: 'Modo demo (Giac no cargado)',
    addMath: '+ Mate', addRaw: '+ Xcas directo', addText: '+ Texto',
    runAll: '▶ Ejecutar todo', clearOutputs: '✕ Limpiar salidas',
    exportBtn: '💾 Exportar', importBtn: '📂 Importar',
    shortcutRun: 'Ejecutar', shortcutRunNew: 'Ejecutar + nueva celda',
    showMathJSON: 'Mostrar MathJSON',
    cellMath: 'Mate', cellRaw: 'Xcas', cellText: 'Texto',
    placeholderRaw: 'Sintaxis Xcas (ej: factor(x^4-1))',
    placeholderText: 'Notas, Markdown…',
    computing: 'Calculando…',
    giacNotReady: '⏳ Giac está cargando…',
    errorPrefix: '✗ Error:',
    moveUp: 'Subir', moveDown: 'Bajar',
    deleteCell: 'Eliminar', runCell: 'Ejecutar',
    modeVisual: 'Entrada visual', modeRaw: 'Sintaxis Xcas directa',
    invalidJson: 'Archivo JSON no válido',
    welcomeTitle: '# Bienvenido al Cuaderno Xcas',
    welcomeBody: 'Escribe matemáticas visualmente (MathJSON) o usa sintaxis Xcas directa.\nMarca **Mostrar MathJSON** abajo para inspeccionar la conversión.',
    plot3dNotSupported: 'Los gráficos 3D aún no son compatibles. Usa comandos de gráficos 2D.',
    plotCoordinates: 'Coordenadas',
    reactiveToggle: 'Reactivo',
    pendingEvaluation: 'Pendiente…',
    dependencyError: 'Error de dependencia: la celda anterior falló',
    cyclicDependency: 'Dependencia circular detectada',
    duplicateVariable: 'Definición de variable duplicada',
    brokenDependency: 'Dependencia rota: celda anterior eliminada',
    staleOutputWarning: 'Algunas salidas pueden estar desactualizadas. ¿Reevaluar todo?',
    reEvalAll: 'Reevaluar todo',
    cancelCascade: 'Cancelar',
    reactiveReady: 'Modo reactivo activado. Haga clic en "Ejecutar todo" para construir el grafo de dependencias y evaluar.',
    runAllReactive: '▶ Ejecutar todo (reactivo)',
  },
  de: {
    title: 'Xcas Notizbuch',
    subtitle: 'Reaktives CAS — MathJSON ↔ Giac via WebAssembly',
    giacLoading: 'Giac wird geladen…',
    giacReady: 'Giac bereit',
    giacError: 'Giac Init-Fehler',
    giacDemo: 'Demo-Modus (Giac nicht geladen)',
    addMath: '+ Mathe', addRaw: '+ Xcas direkt', addText: '+ Text',
    runAll: '▶ Alles ausführen', clearOutputs: '✕ Ausgaben löschen',
    exportBtn: '💾 Exportieren', importBtn: '📂 Importieren',
    shortcutRun: 'Ausführen', shortcutRunNew: 'Ausführen + neue Zelle',
    showMathJSON: 'MathJSON anzeigen',
    cellMath: 'Mathe', cellRaw: 'Xcas', cellText: 'Text',
    placeholderRaw: 'Xcas-Syntax (z.B. factor(x^4-1))',
    placeholderText: 'Notizen, Markdown…',
    computing: 'Berechnung…',
    giacNotReady: '⏳ Giac wird noch geladen…',
    errorPrefix: '✗ Fehler:',
    moveUp: 'Nach oben', moveDown: 'Nach unten',
    deleteCell: 'Löschen', runCell: 'Ausführen',
    modeVisual: 'Visuelle Mathe-Eingabe', modeRaw: 'Direkte Xcas-Syntax',
    invalidJson: 'Ungültige JSON-Datei',
    welcomeTitle: '# Willkommen im Xcas Notizbuch',
    welcomeBody: 'Gib Mathematik visuell ein (MathJSON) oder nutze direkte Xcas-Syntax.\nAktiviere **MathJSON anzeigen** unten, um die Konvertierung zu prüfen.',
    plot3dNotSupported: '3D-Grafiken werden noch nicht unterstützt. Verwenden Sie 2D-Plotbefehle.',
    plotCoordinates: 'Koordinaten',
    reactiveToggle: 'Reaktiv',
    pendingEvaluation: 'Ausstehend…',
    dependencyError: 'Abhängigkeitsfehler: vorgelagerte Zelle fehlgeschlagen',
    cyclicDependency: 'Zirkuläre Abhängigkeit erkannt',
    duplicateVariable: 'Doppelte Variablendefinition',
    brokenDependency: 'Abhängigkeit unterbrochen: vorgelagerte Zelle gelöscht',
    staleOutputWarning: 'Einige Ausgaben könnten veraltet sein. Alle neu auswerten?',
    reEvalAll: 'Alle neu auswerten',
    cancelCascade: 'Abbrechen',
    reactiveReady: 'Reaktiver Modus aktiviert. Klicken Sie auf „Alles ausführen", um den Abhängigkeitsgraphen aufzubauen und auszuwerten.',
    runAllReactive: '▶ Alles ausführen (reaktiv)',
  },
};

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
  });
  document.documentElement.lang = currentLocale;
}

/** Set locale, refresh UI, persist preference */
function setLocale(locale) {
  if (!LOCALES[locale]) return;
  currentLocale = locale;
  document.getElementById('lang-select').value = locale;
  applyI18n();
  try { localStorage.setItem('xcas-nb-locale', locale); } catch(e) {}
}

/** Auto-detect from stored preference or browser language */
function detectLocale() {
  try {
    const s = localStorage.getItem('xcas-nb-locale');
    if (s && LOCALES[s]) return s;
  } catch(e) {}
  const lang = (navigator.language || '').slice(0, 2);
  return LOCALES[lang] ? lang : 'en';
}
