// ─────────────────────────────────────────────────────────────
// SLIDER WEB COMPONENTS (Lit.js)
//
// <slider-param> — a single slider with label and value display.
// Dispatches 'slider-change' CustomEvent when moved.
// ─────────────────────────────────────────────────────────────

import { LitElement, html, css } from 'https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js';

class SliderParam extends LitElement {
  static properties = {
    name:  { type: String },
    label: { type: String },
    min:   { type: Number },
    max:   { type: Number },
    step:  { type: Number },
    value: { type: Number }
  };

  static styles = css`
    :host { display: block; }
    .slider-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem 0;
    }
    label {
      min-width: var(--slider-label-width, 140px);
      font-size: 0.85rem;
      color: var(--text, #222);
    }
    input[type=range] {
      flex: 1;
      min-width: 120px;
      accent-color: var(--slider-track-color, var(--accent, #4a90d9));
      height: 6px;
      cursor: pointer;
    }
    .slider-value {
      min-width: 3.5em;
      text-align: right;
      font-family: monospace;
      font-size: 0.85rem;
      color: var(--text, #222);
    }
  `;

  constructor() {
    super();
    this.name = '';
    this.label = '';
    this.min = 0;
    this.max = 100;
    this.step = 1;
    this.value = 50;
  }

  render() {
    return html`
      <div class="slider-row">
        <label>${this.label}</label>
        <input type="range"
          .min=${String(this.min)}
          .max=${String(this.max)}
          .step=${String(this.step)}
          .value=${String(this.value)}
          @input=${this._onInput}>
        <span class="slider-value">${this._formatValue(this.value)}</span>
      </div>
    `;
  }

  _formatValue(v) {
    if (this.step >= 1) return String(v);
    var decimals = String(this.step).split('.')[1];
    return Number(v).toFixed(decimals ? decimals.length : 2);
  }

  _onInput(e) {
    this.value = parseFloat(e.target.value);
    this.dispatchEvent(new CustomEvent('slider-change', {
      detail: { name: this.name, value: this.value },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('slider-param', SliderParam);

// Signal readiness to the main app
if (window._litResolve) window._litResolve();
console.log('Slider components loaded (Lit.js)');
