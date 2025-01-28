import { LitElement, html, css } from 'lit';

class ClickHandlerComponent extends LitElement {
  static styles = css`
    button {
      margin: 5px;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
    }
  `;

  constructor() {
    super();
    this.clickCounts = {
      TutorialButton: 1, // Starts at 1 for immediate activation
    };
  }

  handleButtonClick(event, buttonId) {
    event.preventDefault();
    this.clickCounts[buttonId] = (this.clickCounts[buttonId] || 0) + 1;

    if (this.clickCounts[buttonId] === 2) {
      console.log(`${buttonId} activated!`);
      const loginElement = this.shadowRoot.querySelector('login-element');
      if (loginElement) {
        // loginElement.login(); // Uncomment this to call the login method
      } else {
        console.error(`${buttonId}: Login element not found!`);
      }
      this.resetClickCounts(buttonId);
    } else {
      console.log(`Selector moved for ${buttonId}.`);
    }
  }

  resetClickCounts(buttonId) {
    this.clickCounts[buttonId] = 0;
    if (buttonId !== 'TutorialButton') {
      this.clickCounts['TutorialButton'] = 0;
    }
  }

  render() {
    return html`
      <div>
        <button @click=${(e) => this.handleButtonClick(e, 'TutorialButton')}>Tutorial</button>
        <button @click=${(e) => this.handleButtonClick(e, 'LoginButton')}>Login</button>
        <button @click=${(e) => this.handleButtonClick(e, 'ProfileButton')}>Profile</button>
        <button @click=${(e) => this.handleButtonClick(e, 'PlayAgainButton')}>Play Again</button>
        <button @click=${(e) => this.handleButtonClick(e, 'ChatButton')}>Chat</button>
        <login-element></login-element>
      </div>
    `;
  }
}

customElements.define('click-handler-component', ClickHandlerComponent);
