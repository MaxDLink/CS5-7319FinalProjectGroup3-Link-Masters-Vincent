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

    <div class="instruction-box">
      <div class="message">Place 4 ships on your board. Tap on Player Board 4 times</div>
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

    .message {
        color: orange; /* Style the message text */
        margin: 0; /* Remove default margin */
        font-size: 1.2em; /* Adjust font size for better readability */
      }

      .instruction-box {
        position: absolute;
        bottom: 50px; /* Adjust this value to position it higher or lower */
        left: -15px; /* Align with the login element */
        background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent white background */
        border: 2px solid orange; /* Border color */
        border-radius: 8px; /* Rounded corners */
        padding: 10px; /* Padding inside the box */
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
        width: 250px; /* Fixed width for the instruction box */
        text-align: center; /* Center the text */
        font-size: 0.8em; /* Adjust font size for better readability */
      }
  `;

  updated(changedProperties) {
    if (changedProperties.has('route') && this.route === 'game') {
      const gameBoard = this.shadowRoot.querySelector('game-board');
      if (gameBoard) {
        gameBoard.addEventListener('message-updated', (event) => {
          const messageElement = this.shadowRoot.querySelector('.instruction-box'); // Select the message element
          messageElement.textContent = event.detail; // Update the message text

          messageElement.classList.add('message'); // apply message class for styles 
          console.log('Message updated to: ', event.detail);
        });
      } else {
        console.error('Game board element not found.');
      }
    }
  }

}



customElements.define('app-element', App);