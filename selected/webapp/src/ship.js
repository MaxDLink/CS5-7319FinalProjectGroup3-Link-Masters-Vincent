import { LitElement, html, css } from 'lit';

class Ship extends LitElement {
  render() {
    return html`<div class="icon">🚢</div>`;
  }

  static styles = css`
    .icon {
      font-size: 40px;
      position: absolute;
      top: 40px; /* Adjust as needed */
      left: 40px; /* Adjust as needed */
    }
  `;
}

customElements.define('ship-element', Ship);