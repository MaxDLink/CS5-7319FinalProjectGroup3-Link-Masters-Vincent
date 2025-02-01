import { LitElement, html, css } from 'lit';
import './nav-bar.js';
import './instructions.js';

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
 <div class="overall-container">
    <div class="login-container">
     <login-element @login=${this._onLogin}></login-element>
    </div>

    

    ${this.route === 'game' ? html`
    <div>
      <!-- game board when login was mandatory -->
      <game-board></game-board>
      <instruction-component></instruction-component>
      <nav-bar></nav-bar>
    </div>
    </div>
    </div>
     ` : ''}

    `;
  }

  static styles = css`
  .overall-container {
   position: relative; /* Set positioning context */
      width: 100vw; /* Full width */
      height: 100vh; /* Full height */
      margin: 0; /* Remove default margin */
      padding: 0; /* Remove default padding */
      overflow: hidden; /* Prevent overflow */
      background-color: gray; /* Set background color */
      display: flex; /* Use flexbox for layout */
      flex-direction: column; /* Stack children vertically */
      justify-content: center; /* Center content vertically */
      align-items: center; /* Center content horizontally */
      
  } 

  `;

}





customElements.define('app-element', App);