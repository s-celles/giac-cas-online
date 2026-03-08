# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Help query support in math mode cells: `?commandname`, `help(commandname)`, `?`, and `help()` now work in visual (math2d) mode, producing identical output to raw mode cells

## [0.1.3] - 2026-03-03

### Fixed
- Remove custom HTML splash screen to avoid double splash on Android PWA

## [0.1.0] - 2026-03-03

### Added

- Base Conversions example notebook: decimal/binary/hex/octal conversions, `to_bin_str()`/`to_hex_str()` helpers, bitwise operations, RGB color decomposition, with i18n support (10 languages)
- Enter key executes math cells in visual mode (Shift+Enter still works for all cell types)
- Cell-to-diagram navigation: click `In[n]` label to open flow diagram and highlight the corresponding node
- Unevaluated cells styled with reduced opacity and dashed border (full opacity on focus)
- LaTeX round-trip preservation when switching between Math visual and Math raw modes (uses `latex(quote())` for Giac→LaTeX conversion)
- Cell flow diagram: toggleable Mermaid flowchart panel showing notebook cell dependency graph with error propagation visualization, live updates via MutationObserver, and i18n support (10 languages)
- P2P notebook transfer from phone to PC via WebRTC (no webcam required) — scan QR code on PC, verify 4-digit confirmation code, transfer notebook over encrypted data channel using PeerJS
- Programming example notebook: variables, conditionals (ifte, if/then/else), for/while loops, user-defined functions, recursion, list operations, Collatz conjecture, Newton's method (with multi-line code formatting)
- Display GIAC warnings/info messages in cell output (previously only visible in browser console)
- CAS function support in math-field: inline shortcuts for ~70 GIAC functions (expand, factor, csolve, etc.) with LaTeX normalization pipeline
- GIAC error detection: errors displayed as styled messages instead of garbled LaTeX rendering
- Avoid double evaluation: `caseval('latex(result)')` instead of re-evaluating the expression

- QR notebook sharing: share notebooks via static or animated QR codes
- Animated QR protocol (`XCAS:1:{i}:{total}:{crc}:{chunk}`) for large notebooks exceeding single QR capacity
- Camera-based QR scanner using jsQR for receiving shared notebooks
- Password-protected sharing with AES-GCM encryption (Web Crypto API) and `#nbe=` URL prefix
- URL-based notebook loading from hash fragment (`#nb=` unencrypted, `#nbe=` encrypted)
- Share QR dialog with copy URL, password field, animated QR controls (fps/chunk size sliders)
- Phone-to-PC transfer via Web Share API with Wake Lock support
- LZString compression for compact notebook serialization
- Fountain codes (LT codes) for QR notebook sharing: rateless erasure encoding eliminates the "last frame" problem — receiver can decode from any sufficient subset of packets (~k+10%)
- Encoding mode toggle in Share QR dialog: Fountain (default) or Sequential
- Scanner auto-detects fountain (`XCAS:F:`) vs legacy sequential (`XCAS:1:`) format
- Fountain encoder via `luby-transform` CDN library with CRC-32 frame validation
- Fountain decoder with incremental progress display ("Decoded X/K")
- Fountain codes work with password-encrypted notebooks (auto-detects encryption on decode)
- i18n keys for QR sharing features in all 9 locales
- Export format now includes `type: "xcas-notebook"` and `created` timestamp fields
- Import validates `type` field for `.xcas.json` files

- JSXGraph 3D surface plots: `plotfunc(expr,[x,y])`, `plot3d(expr,[x,y])`, and `plotparam3d([X,Y,Z],[u,v])` render interactive 3D surfaces via JSXGraph view3d
- JSXGraph 3D parametric curves: `plotparam3d([X,Y,Z],[t])` renders interactive 3D trajectories via JSXGraph `curve3d`
- 3D Curve (Helix) example with interactive slider for number of turns
- Support for explicit domain ranges in 3D plots (e.g., `[x=-3..3,y=-3..3]`)
- 3D examples: Surface, Parametric Surface, Surface + Sliders in the example library
- i18n keys for 3D plot features in all 9 locales

- MathJSON-first pipeline: math cells now use MathJSON as canonical internal representation instead of LaTeX
- Export format v3 with `mathjson` field for math cells
- Backward-compatible import of v2 notebooks (LaTeX content auto-converted to MathJSON)
- Fallback for unparseable v2 LaTeX: imported as raw cell with console warning
- `addCell()` accepts optional `initialMathJson` parameter

### Fixed

- 3D surface plots with external Giac variables (e.g., slider-bound `a`, `b`) now render correctly — `resolveGiacVars()` substitutes Giac variable values before creating JS functions

### Changed

- Split `js/examples.js` into individual files under `examples/` (one per notebook) for better maintainability
- 3D plot rendering uses JSXGraph native 3D API (view3d, functiongraph3d, parametricsurface3d) instead of Giac's Emscripten SDL/WebGL pipeline
- `getXcasExpr()` reads MathJSON directly from `mf.expression.json` instead of re-parsing LaTeX via `latexToXcas()`
- `updateDebug()` reads MathJSON directly from math-field instead of CortexJS `ce.parse()`
- `setCellMode()` uses `mf.expression.json` for math-to-raw conversion
- Export format version bumped from 2 to 3

### Removed

- One-sided limit LaTeX workaround (`limitDir` regex) in `latexToXcas()` — no longer needed with MathJSON-first pipeline
