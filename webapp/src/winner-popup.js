import { LitElement, html, css } from 'lit';

class WinnerPopup extends LitElement {
  static properties = {
    winner: { type: String },
    visible: { type: Boolean },
  };

  constructor() {
    super();
    this.winner = '';
    this.visible = false;
  }

  render() {
    if (!this.visible) return html``;

    return html`
      <div class="popup">
        <div class="content">
          <h2>${this.winner} wins!</h2>
          <button @click="${this.closePopup}">Close</button>
        </div>
      </div>
    `;
  }

  closePopup() {
    this.visible = false;
    this.dispatchEvent(new CustomEvent('popup-closed'));
  }

  static styles = css`
    .popup {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 10px;
    }
    .content {
      background-color: orange;
      padding: 20px;
      border-radius: 5px;
      text-align: center;
    }
    button {
      margin-top: 10px;

    }
    button:hover {
      background-color:rgb(255, 255, 255);
    }
  `;
}

customElements.define('winner-popup', WinnerPopup);
