import { LitElement, html, css } from 'lit';
import './nav-bar.js';
import './login.js';
import './game-board.js';
import './ship.js';

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

  // Bypass login for now
  _onLogin(event) {
    this.route = event.detail.isLoggedIn ? 'game' : 'login'
    console.log('App login event', event.detail.isLoggedIn)
    this.route = 'game';
  }

  render() {
    return html`
    <div class="overall-container">
      ${this.route === 'game' ? html`
        <nav-bar></nav-bar>
      ` : ''}
      
      <div class="flex-container">
        <div class="left-column">
          <div class="login-container">
            <login-element @login=${this._onLogin}></login-element>
          </div>
          ${this.route === 'game' ? html`
          <div class="instruction-container">
            <instruction-component></instruction-component>
          </div>
          ` : ''}
        </div>

        ${this.route === 'game' ? html`
        <div class="right-column">
          <game-board></game-board>
        </div>
        ` : ''} 
      </div>
    </div>
    `;
  }

  static styles = css`
  .overall-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: gray;
    display: flex;
    flex-direction: column;
  } 

  .flex-container {
    display: flex;
    width: 100%;
    height: 100%;
    padding: 0;
    justify-content: center; 
  }

  .left-column {
    position: absolute;
    top: 60px; 
    left: 5px;
    z-index: 5;
    display: none;
  }

  .login-container {
    width: 100%;
    display: flex;
    justify-content: flex-start;
  }

  .instruction-container {
    width: 100%;
    padding: 20px;
    box-sizing: border-box;
  }

  .right-column {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    padding-top: 70px; 
    padding-bottom: 10px; 
  }

  /* Media query for mobile devices */
  @media (max-width: 768px) {
    .flex-container {
      flex-direction: column;
      align-items: center;
    }

    .left-column {
      position: absolute;
      top: 60px; 
      left: 5px;
    }

    .right-column {
      width: 100%;
      padding-top: 80px; 
      padding-bottom: 10px;
    }
  }
  `;
}

customElements.define('app-element', App);