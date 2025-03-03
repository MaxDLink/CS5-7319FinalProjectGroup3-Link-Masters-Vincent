/*
 * I made several changes to this file to accommodate the new top navigation bar:
 * 1. Moved the nav-bar component to the top level of the overall-container
 * 2. Created a dedicated instruction-container for better organization
 * 3. Added padding to the flex-container to prevent content from being hidden behind the fixed nav bar
 * 4. Adjusted the left column to align to the top instead of center
 * 5. Created specific containers for login and instructions with proper spacing
 * 6. Updated the media query to increase padding for the nav bar on mobile
 */
import { LitElement, html, css } from 'lit';
import './nav-bar.js';
import './instructions.js';
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

  _onLogin(event) {
    this.route = event.detail.isLoggedIn ? 'game' : 'login'
    console.log('App login event', event.detail.isLoggedIn)
    this.route = 'game'; // bypass login for now
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
    position: relative; /* Set positioning context */
    width: 100vw; /* Full width */
    height: 100vh; /* Full height */
    margin: 0; /* Remove default margin */
    padding: 0; /* Remove default padding */
    overflow: hidden; /* Prevent overflow */
    background-color: gray; /* Set background color */
    display: flex; /* Use flexbox for layout */
    flex-direction: column; /* Stack children vertically */
  } 

  .flex-container {
    display: flex; /* Use flexbox for layout */
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    padding-top: 70px; /* Add padding to account for the fixed nav bar */
  }

  .left-column {
    flex: 1; /* Take up equal space */
    display: flex;
    flex-direction: column; /* Stack children vertically */
    justify-content: flex-start; /* Align to top */
    align-items: center; /* Center content horizontally */
    padding-top: 20px; /* Add some padding at the top */
  }

  .login-container {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    padding-left: 20px;
  }

  .instruction-container {
    margin-top: 30px;
  }

  .right-column {
    flex: 2; 
    display: flex;
    justify-content: center; 
    align-items: center; 
  }

  @media (max-width: 768px) { 
    .flex-container {
      flex-direction: column; 
      padding-top: 90px; /* Increase padding for mobile */
    }
    
    .left-column {
      order: 1; 
    }
    
    .right-column {
      order: 2; 
      display: flex; 
      width: 100%; 
    }
    
    .instruction-container {
      margin-top: 10px;
    }
  }
  `;
}

customElements.define('app-element', App);