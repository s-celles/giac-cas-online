# rnGIAC — Reactive Notebook GIAC

An interactive, browser-based computer algebra notebook powered by [Giac/Xcas](https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac.html) with reactive cell evaluation.

**[Live Demo](https://s-celles.github.io/giac-cas-online/)** (if deployed via GitHub Pages)

## Features

- **Reactive DAG execution** — Cells automatically re-evaluate when their dependencies change, powered by [Observable Runtime](https://github.com/nicklockwood/runtime)
- **Visual math input** — LaTeX-style editing with [MathLive](https://mathlive.io/) and a custom virtual keyboard (fractions, integrals, sums, products, Greek letters)
- **MathJSON-first pipeline** — Math cells use MathJSON internally: MathField -> MathJSON -> Xcas (Giac), LaTeX used only for display
- **Interactive 2D plots** — `plot(sin(x))`, `plotfunc`, `plotparam`, `plotpolar`, `plotimplicit`, `plotfield`, `plotcontour`, `plotode`, `plotseq` rendered with [JSXGraph](https://jsxgraph.org/) (zoom, pan, coordinates)
- **3D surface plots** — `plotfunc(x^2+y^2,[x,y])` rendered with WebGL
- **Statistical charts** — `histogram`, `barplot`, `camembert`, `boxwhisker`, `scatterplot`
- **Geometry** — `circle`, `segment`, `point` and more
- **LaTeX output** — Results rendered with [KaTeX](https://katex.org/)
- **Internationalization** — 9 languages: English, French, Spanish, German, Arabic (RTL), Hindi, Russian, Chinese, Japanese
- **Export/Import** — Save and reload notebooks as JSON (v3 format with MathJSON, backward-compatible with v2)
- **Reactive/Manual toggle** — Switch between automatic cascade and manual cell-by-cell execution

## Getting Started

1. Download [giac.js](https://www-fourier.univ-grenoble-alpes.fr/~parisse/giacjs.tar.gz) and place it in the project root
2. Serve the directory with any static HTTP server:
   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```
3. Open `http://localhost:3000` (or `:8000`) in a modern browser
4. Wait for "Giac ready" status, then start computing

> **Note**: A local HTTP server is required because the project uses ES module imports. Opening `index.html` directly via `file://` will not work.

## Project Structure

```
index.html              HTML shell (header, toolbar, notebook container)
css/
  notebook.css          All styles
js/
  i18n.js               Internationalization (9 locales)
  giac-init.js          CortexJS Compute Engine + Giac initialization
  mathjson-xcas.js      MathJSON -> Xcas string converter
  state.js              Shared application state
  io.js                 Export/Import + utilities
  plot-rendering.js     2D/3D plot rendering (SVG, gr2d, JSXGraph, WebGL)
  reactive-dag.js       Reactive DAG with Observable Runtime
  cells.js              Cell management, debug panel, mode switching
  execution.js          Cell execution engine
  actions.js            Global actions (run all, delete, move)
  boot.js               Startup sequence, virtual keyboard config, demo cells
giac.js                 Giac/Xcas engine (asm.js, not included — download separately)
```

## Examples

The notebook comes pre-loaded with demo cells covering:

| Category | Examples |
|----------|----------|
| **Reactive chain** | `a := 5`, `a^2`, `b := a + 3` |
| **Calculus** | `\frac{x^4-1}{x^2+1}`, `\int \frac{1}{x^2+1} dx`, `\frac{d}{dx}(\sin(x) \cdot e^x)`, `\lim_{x\to 0} \frac{\sin(x)}{x}` |
| **Finite sums/products** | `\sum_{k=1}^{n} k`, `\prod_{k=1}^{n} k`, `\sum_{k=1}^{10} k^2` |
| **Infinite series** | `\sum_{n=1}^{\infty} \frac{1}{n^2}` (Basel), `\sum_{n=0}^{\infty} \frac{(-1)^n}{2n+1}` (Leibniz) |
| **Algebra** | `solve(x^2 - 3*x + 2 = 0, x)`, `eigenvalues([[1,2],[3,4]])` |
| **2D plots** | `plot(sin(x))`, `plotfunc([sin(x),cos(x)],x)`, `plotimplicit(x^2+y^2-1,x,y)` |
| **3D plots** | `plotfunc(x^2+y^2,[x,y])`, `plotfunc(sin(x)*cos(y),[x,y])` |
| **Statistics** | `histogram(...)`, `barplot(...)`, `camembert(...)`, `boxwhisker(...)`, `scatterplot(...)` |
| **Geometry** | `circle(0,2); segment([0,0],[2,0]); point(1,1)` |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+Enter` | Run current cell |
| `Ctrl+Enter` | Run current cell + add new cell |
| `Ctrl+Shift+Enter` | Run current cell only (no reactive cascade) |

## Technology Stack

- **Giac/Xcas** (asm.js) — Computer algebra engine
- **MathLive** — Math input web component
- **CortexJS Compute Engine** — LaTeX -> MathJSON parsing
- **KaTeX** — LaTeX rendering
- **JSXGraph** — Interactive 2D plots
- **Observable Runtime** — Reactive dependency graph
- No build step, no bundler — pure browser ES2020+

## Related Projects

- [Giac/Xcas](https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac.html) — Computer algebra system by Bernard Parisse
- [KaTeX](https://katex.org/) — Fast LaTeX math rendering for the web
- [JSXGraph](https://jsxgraph.org/) — Interactive geometry and function plotting in the browser
- [Observable Runtime](https://github.com/observablehq/runtime) — Reactive dataflow runtime for dependency graphs
- [MathLive](https://mathlive.io/) — Web component for math input editing
- [CortexJS Compute Engine](https://cortexjs.io/compute-engine/) — LaTeX/MathJSON parsing and symbolic computation

## Credits

- [Giac/Xcas](https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac.html) by Bernard Parisse
- [MathLive](https://mathlive.io/) by Arno Gourdol
- Virtual keyboard layout inspired by [B. Parisse's math2d.html](https://www-fourier.univ-grenoble-alpes.fr/~parisse/test/math2d.html)

## License

GPL-3.0 — See [LICENSE.txt](LICENSE.txt)
