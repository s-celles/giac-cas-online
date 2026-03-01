# Contributing to CAScad

Thank you for your interest in contributing to CAScad! This guide explains how to get started.

## Prerequisites

- A modern browser (Chrome 83+, Firefox 80+, Safari 15+, Edge 83+)
- A local HTTP server (e.g. `npx serve .` or `python3 -m http.server`)
- [giac.js](https://www-fourier.univ-grenoble-alpes.fr/~parisse/giacjs.tar.gz) placed in the project root

## Getting Started

1. Fork the repository and clone your fork
2. Download `giac.js` and place it in the project root
3. Start a local server:
   ```bash
   npx serve .
   ```
4. Open `http://localhost:3000` in your browser

> **Note**: Opening `index.html` via `file://` will not work due to ES module imports.

## Architecture

CAScad is a **zero-build-step** browser application. All JavaScript is ES2020+ loaded via `<script>` tags (order matters — see `index.html`). External dependencies are loaded from CDN.

Key files:

| File | Purpose |
|------|---------|
| `index.html` | HTML shell, toolbar, script loading order |
| `js/kernel-registry.js` | Multi-kernel abstraction |
| `js/io.js` | Export/import, `buildNotebookData()` / `loadNotebookData()` |
| `js/cells.js` | Cell management |
| `js/reactive-dag.js` | Reactive dependency graph |
| `js/qr-sharing.js` | QR code sharing and scanning |
| `js/p2p-transfer.js` | WebRTC P2P notebook transfer |
| `js/boot.js` | Startup sequence (loaded last) |
| `js/i18n/*.js` | Translation files (10 languages) |
| `css/notebook.css` | All styles |

## Code Style

- **JavaScript ES2020+** — no transpilation, no TypeScript
- Use `var` for function-scoped variables (existing codebase convention)
- Use `function` declarations (not arrow functions) for top-level functions
- Lazy-load CDN dependencies with the cached module pattern:
  ```javascript
  var _module = null;
  function _loadModule() {
    if (_module) return Promise.resolve(_module);
    return import('https://cdn.example.com/lib').then(function(mod) {
      _module = mod.default || mod;
      return _module;
    });
  }
  ```
- All user-facing strings must use the `t()` i18n helper and `data-i18n` attributes
- No `eval()` of untrusted input

## Adding a New Feature

1. Create a feature branch from `main`
2. If adding a new JS module, create it in `js/` and add a `<script>` tag in `index.html` (order matters — after dependencies, before `boot.js`)
3. Add translation keys to **all 10** language files in `js/i18n/`
4. Add CSS to `css/notebook.css`, reusing existing patterns (overlays, dialogs, etc.)
5. Test manually in at least Chrome and one other browser

## Internationalization

All 10 language files must be updated when adding UI strings:

`en.js`, `fr.js`, `es.js`, `de.js`, `el.js`, `ar.js`, `hi.js`, `ru.js`, `zh.js`, `ja.js`

Use camelCase keys and add them in the same section across all files.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Testing

The project uses **manual browser testing** — there is no automated test framework. Before submitting changes:

1. Verify the application loads without console errors
2. Test your changes in Chrome and at least one other browser
3. Check that existing features still work (run cells, export/import, QR sharing)
4. If your change involves i18n, switch languages and verify strings render correctly

## Submitting Changes

1. Push your branch to your fork
2. Open a pull request against `main`
3. Describe what your change does and how to test it
4. Link any related issues

## Reporting Issues

Use [GitHub Issues](https://github.com/s-celles/CAScad/issues). Include:

- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

By contributing, you agree that your contributions will be licensed under the [GPL-3.0](LICENSE.txt) license.
