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
 <div class="overall-container">
    <div class="login-container">
      <login-element @login=${this._onLogin}></login-element>
    </div>

    

    ${this.route === 'game' ? html`
    <div>
     
      <game-board></game-board>
      <div class="text-container">
      <div class="instruction-box">
      <div class="message">Place 4 ships on your board. Tap on Player Board 4 times</div>
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
    
  .text-container {
    position: absolute;
    top: 50px; 
    left: -235px;
  } 
    
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
        bottom: 60px; /* Adjust this value to position it higher or lower */
        left: 5px; /* Align with the login element */ 
        font-weight: bold;
        background-color: rgba(255, 255, 255, 0.8); /* Semi-transparent white background */
        border: 2px solid orange; /* Border color */
        border-radius: 8px; /* Rounded corners */
        padding: 10px; /* Padding inside the box */
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow for depth */
        width: 250px; /* Fixed width for the instruction box */
        text-align: center; /* Center the text */
        font-size: 0.75em; /* Adjust font size for better readability */
      } 

      /* Styles for landscape mode */
    @media (orientation: landscape) {
        .instruction-box {
            bottom: 150px; /* Adjust this value for landscape positioning */
            left: 290px;
            top: 60px; 
            width: 90px;
            height: 190px;
            font-size: 0.75em; 
            font-weight: bold;             
            /* You can add more styles specific to landscape here */
        }
    }

    /* Styles for portrait mode */
    @media (orientation: portrait) {
        .instruction-box {
            bottom: 50px; /* Adjust this value for portrait positioning */
            /* You can add more styles specific to portrait here */
        }
    } 

    login-element {
      position: absolute; /* Use absolute positioning */
      top: 50px; /* Adjust this value to move it vertically */
      left: 75px; /* Adjust this value to move it horizontally */
      /* You can also use right or bottom properties if needed */
    } 

    /* Media query for desktop */
    @media (min-width: 1024px) {
      .game-container {
        flex-direction: column; /* Keep side by side for desktop */
      }

      game-board {
        width: 30vmin; /* Adjust size for desktop */
        height: 30vmin; /* Adjust size for desktop */
      }

      .instruction-box {
        bottom: 80px; /* Adjust position for desktop */
        left: 10px; /* Adjust position for desktop */
      }
    } 

  `;

  getOrientation(boardContainer, playerBoard, enemyBoard) {
    // Check for Windows or macOS
    const isWindows = /Windows/i.test(navigator.userAgent);
    const isMac = /Macintosh/i.test(navigator.userAgent);
    
    // Check if it's a desktop environment with stricter conditions
    const isDesktop = (isWindows || isMac) && window.innerWidth > 1024 && window.innerHeight > 600;

    // Check if it's a desktop environment first
    if (isDesktop) {
      console.log("Detected desktop environment");
      if (boardContainer) {
          boardContainer.style.flexDirection = 'row'; // Default to row for desktop
          boardContainer.style.justifyContent = 'space-around'; // Space boards evenly
      }
      return; // Exit the function after handling desktop
    }
    let _orn = screen.orientation ? screen.orientation.type : (screen.mozOrientation || screen.msOrientation);
    console.log('Current orientation:', _orn); // Debugging line
  
    // Update the viewport based on the orientation
    const viewport = document.getElementById("viewport");
    console.log('Viewport:', viewport);
    // const boardContainer = document.querySelector('.board-container'); // Adjust selector as needed
    // const playerBoard = document.querySelector('.player-board .board'); // Adjust selector as needed
    // const enemyBoard = document.querySelector('.enemy-board .board'); // Adjust selector as needed
  
    if (_orn.includes('portrait')) {
      console.log("Scaling boards to fit portrait");
      console.log('boardContainer', boardContainer)
        viewport.setAttribute("content", "width=device-width, initial-scale=1.0");
        // Reset styles for portrait
        if (boardContainer) {
            boardContainer.style.flexDirection = 'column'; // Column for portrait
            boardContainer.style.justifyContent = 'flex-start'; // flex-start for portrait

            // Remove redundant size and margin settings
            // playerBoard.style.width = '40vmin'; // Reset to original size
            // playerBoard.style.height = '40vmin'; // Reset to original size
            // enemyBoard.style.width = '40vmin'; // Reset to original size
            // enemyBoard.style.height = '40vmin'; // Reset to original size
            // playerBoard.style.margin = '0px'; // Reset to original size
            // enemyBoard.style.margin = '0px'; // Reset to original size
        }
    }  // else if (_orn.includes('landscape')) {
    //     console.log("Scaling boards to fit landscape");
    //     console.log('boardContainer', boardContainer)
  
    //     // viewport.setAttribute("content", "width=600px, initial-scale=1.0"); // Adjust width for landscape
    //     if (boardContainer) {
    //         boardContainer.style.flexDirection = 'row'; // Change to row for landscape
    //         boardContainer.style.justifyContent = 'space-around'; // Space boards evenly
    //         playerBoard.style.margin = '5px'; // Set smaller margin for player board
    //         enemyBoard.style.margin = '5px'; // Set smaller margin for enemy board
    //     }
    // }
  } 

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

        // Board landscape mode 
        gameBoard.addEventListener('board-ready', (event) => {
          const { boardContainer, playerBoard, enemyBoard } = event.detail;
          console.log('Board Container:', boardContainer);
          console.log('Player Board:', playerBoard);
          console.log('Enemy Board:', enemyBoard);
          console.log("HELLOLOLOLOL")
          // Now you can call getOrientation or any other logic you need
          this.getOrientation(boardContainer, playerBoard, enemyBoard); // Pass the boardContainer to getOrientation
      });

        // Call getOrientation when the game board is ready
        // this.getOrientation();
      } else {
        console.error('Game board element not found.');
      }
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._checkOrientation(); // Initial check on load
    window.addEventListener('resize', this._checkOrientation.bind(this)); // Add event listener for resize
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this._checkOrientation.bind(this)); // Clean up event listener
    super.disconnectedCallback();
  }

  _checkOrientation() {
     // Attempt to find the game board directly in the shadow root
     const gameBoard = this.shadowRoot.querySelector('game-board');

      // Check if the game board exists
    if (gameBoard) {
      const boardContainer = gameBoard.shadowRoot.querySelector('.board-container'); 
      const playerBoard = gameBoard.shadowRoot.querySelector('.player-board .board'); 
      const enemyBoard = gameBoard.shadowRoot.querySelector('.enemy-board .board');

    // Ensure all elements are found before calling getOrientation
      if (boardContainer && playerBoard && enemyBoard) {
        this.getOrientation(boardContainer, playerBoard, enemyBoard); // Call getOrientation with selected elements
      } else {
        console.warn('Board elements not found in game board, please ensure the game board is loaded.');
      }
    } else {
      console.warn('Game board not found, please ensure it is rendered.');
    }
  }

}





customElements.define('app-element', App);