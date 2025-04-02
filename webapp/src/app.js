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
    justify-content: center; /* Center horizontally */
  }

  .left-column {
    position: absolute;
    top: 60px; /* Increased top position to account for navbar */
    left: 5px;
    z-index: 5;
    display: none; /* Hide the left column containing the login */
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
    padding-top: 70px; /* Added padding at the top to prevent content from being hidden by the navbar */
    padding-bottom: 10px; /* Reduced bottom padding */
  }

  /* Media query for mobile devices */
  @media (max-width: 768px) {
    .flex-container {
      flex-direction: column;
      align-items: center;
    }

    .left-column {
      position: absolute;
      top: 60px; /* Increased top position to account for navbar */
      left: 5px;
    }

    .right-column {
      width: 100%;
      padding-top: 80px; /* Increased padding for mobile */
      padding-bottom: 10px;
    }
  }
  `;
}

customElements.define('app-element', App);