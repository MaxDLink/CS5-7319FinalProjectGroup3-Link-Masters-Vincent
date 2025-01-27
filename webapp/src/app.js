import { LitElement, html, css } from 'lit';

class App extends LitElement {


  static get properties() {
    return {
      route: {type: String}
    }
  }
  
  constructor() {
    super();
    this.route = '';
    console.log('App constructor')
  }

  _onLogin(event) {
    this.route = event.detail.isLoggedIn ? 'game' : 'login'
    console.log('App login event', event.detail.isLoggedIn)
    this.route = 'game'; // bypass login for now
  }

  render() {
    return html`

    <div class="login-container">
      <login-element @login=${this._onLogin}></login-element>
    </div>

    ${this.route === 'game' ? html`
    <div>
      <game-board></game-board>
    </div>
     ` : ''}

    `;
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

customElements.define('app-element', App);