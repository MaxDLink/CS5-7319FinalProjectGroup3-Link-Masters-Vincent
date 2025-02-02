import { LitElement, html, css } from 'lit';
import { EnemyAI } from './enemy-ai.js';
import './winner-popup.js'; // Import the popup component

// sounds.js import 
import { sounds } from './sounds.js'; 

class GameBoard extends LitElement {
  static properties = {
    playerBoard: { type: Array },
    enemyBoard: { type: Array },
    winner: { type: String },
    gameEnded: { type: Boolean },
    shipsPlaced: { type: Number }, // Track number of ships placed
    message: { type: String }, // Added for the new message
  };

  constructor() {
    super();
    // 4 columns, 6 rows -- make this dynamic and make the 4 on line 183 dynamic too 
    this.playerBoard = Array(4).fill().map(() => Array(4).fill('')); // this.playerBoard = Array(10).fill().map(() => Array(10).fill(''));
    this.enemyBoard = Array(4).fill().map(() => Array(4).fill('')); // this.enemyBoard = Array(10).fill().map(() => Array(10).fill(''));

    // Instantiate the enemy AI
    this.enemyAI = new EnemyAI();

    // Initialize turn state
    this.isPlayerTurn = false;

    // Place ships on the player's board
    this.placeShip(this.playerBoard, 0, 0);
    this.placeShip(this.playerBoard, 1, 1);
    this.placeShip(this.playerBoard, 2, 2);
    this.placeShip(this.playerBoard, 3, 3);

    // Place enemy ships on the enemy board
    this.placeEnemyShips();

    this.winner = '';
    this.gameEnded = false;
    this.shipsPlaced = 0; // Initialize ships placed count
    this.message = 'Place 4 ships on your board. Tap on Player Board 4 times'; // Initial message
  }

  connectedCallback() {
    super.connectedCallback();
    // Call updateViewport when the component is connected to the DOM
    // this.updateViewport();
    // window.addEventListener('orientationchange', this.updateViewport.bind(this));
  }

  updateViewport() {
    console.log('updateViewport function called');
    let orn = getOrientation();
    const board = this.shadowRoot.querySelector('.board'); // Use shadowRoot to access the board
    if (orn.includes('portrait')) {
      document.getElementById("viewport").setAttribute("content", "width=device-width, initial-scale=1.0");
      // Reset styles for portrait
      if (board) {
        board.style.width = '40vmin'; // Reset to original size
        board.style.height = '40vmin'; // Reset to original size
      }
    } else if (orn.includes('landscape')) {
      console.log("Scaling boards to fit landscape");
      const boardSize = '40vmin'; // Define a common size for both width and height
      document.getElementById("viewport").setAttribute("content", "width=900px, initial-scale=1.0"); // Adjust width for landscape
      console.log("landscape!"); // Print to console when in landscape mode
      // Adjust styles for landscape
      if (board) {
        console.log("Accessing boards to scale them");
        boardContainer.style.flexDirection = 'row'; // Change to row for landscape
        boardContainer.style.justifyContent = 'space-around'; // Space boards evenly
        playerBoard.style.margin = '10px'; // Set margin for player board
        enemyBoard.style.margin = '10px'; // Set margin for enemy board
      }
    }
  }

  render() {
    // Call updateViewport after rendering the boards
    const result = html`
      <div class="board-container">
        <div class="enemy-board">
          <h3>Enemy Board</h3>
          <div class="board">
            ${this.enemyBoard.map((row, rowIndex) => html`
              <div class="row">
                ${row.map((cell, colIndex) => html`
                  <div class="cell ${cell === 'X' ? 'hit-enemy' : cell === 'O' ? 'miss' : ''}" @click="${() => this.handleEnemyCellClick(rowIndex, colIndex)}">
                    ${cell === '🚢' ? '' : cell}
                  </div> 
                `)}
              </div>
            `)}
          </div>
        </div>
        <div class="player-board">
          <h3>Player Board</h3>
          <div class="board">
            ${this.playerBoard.map((row, rowIndex) => html`
              <div class="row">
                ${row.map((cell, colIndex) => html`
                  <div class="cell ${cell === '🚢' ? 'ship' : ''}" @click="${() => this.placeShip(rowIndex, colIndex)}">
                    ${cell}
                  </div> 
                `)}
              </div>
            `)}
          </div>
        </div>
      </div>
      <winner-popup
        .winner="${this.winner}"
        .visible="${!!this.winner}"
        @popup-closed="${this.resetGame}">
      </winner-popup>
    `;

    // dispatch event to handle landscape mode on mobile 
    // Dispatch events after rendering
    setTimeout(() => {
      const boardContainer = this.shadowRoot.querySelector('.board-container');
      const playerBoard = this.shadowRoot.querySelector('.player-board');
      const enemyBoard = this.shadowRoot.querySelector('.enemy-board');


      console.log('Board Container:', boardContainer);
      console.log('Player Board:', playerBoard);
      console.log('Enemy Board:', enemyBoard);

      // Check if elements are found
      if (boardContainer && playerBoard && enemyBoard) {
        this.dispatchEvent(new CustomEvent('board-ready', {
          detail: {
              boardContainer,
              playerBoard,
              enemyBoard
          }
        }));
      } else {
        console.error('One or more board elements are null:', { boardContainer, playerBoard, enemyBoard });
      }
    }, 0); // Adjust the delay as necessary
    // this.updateViewport(); // Ensure the viewport is updated after rendering
    return result;
  }

  checkWin(board) {
    // Check if all ships ('🚢') have been hit ('X')
    return board.every(row => row.every(cell => cell !== '🚢'));
  }

  handleEnemyCellClick(row, col) {
    if (this.gameEnded) return;
    if (!this.isPlayerTurn) { // if it's not the player's turn, skip the player 
      console.log("It's not the player's turn.");
      return;
    }
    // Check if the cell has already been hit or missed
    if (this.enemyBoard[row][col] === 'X' || this.enemyBoard[row][col] === 'O') {
      console.log('Cell already hit or missed. No action taken.');
      return; // Prevent further action if the cell is already marked
  }
    console.log(`Player attacks: ${row}, ${col}`);
    if (this.enemyBoard[row][col] === '🚢') {
      console.log('Hit!');

      // sounds.js 
      sounds.initAudioContext(); // ensure the audio context is initialized
      sounds.HitEnemy();

      this.enemyBoard[row][col] = 'X'; // Mark hit
      if (this.checkWin(this.enemyBoard)) {
        console.log('Player wins!');
        this.endGame('Player');
        return; // Stop further actions
      }
    } else {
      console.log('Miss!');
      this.enemyBoard[row][col] = 'O'; // Mark miss
    }
    this.requestUpdate(); // Ensure the component re-renders
    this.switchTurn();
    this.enemyMove();
  }

  enemyMove() {
    if (this.gameEnded) return;
    if (!this.isPlayerTurn) {
      // Add a timeout for the enemy's move
      setTimeout(() => {
        this.enemyAI.attack(this.playerBoard);
        if (this.checkWin(this.playerBoard)) {
          console.log('Enemy wins!');
          this.endGame('Enemy');
          return; // Stop further actions
        }
        this.requestUpdate(); // Ensure the component re-renders
        this.switchTurn(); // switch to player's turn 
      }, 1000); // Delay of 1000 milliseconds (1 second)
    }
  }

  
  switchTurn() {
    this.isPlayerTurn = !this.isPlayerTurn;
    console.log(`Turn switched. Is it player's turn? ${this.isPlayerTurn}`);
    
    // Update message based on whose turn it is
    if (this.isPlayerTurn) {
      this.message = 'Tap on the enemy\'s board to try to hit ships'; // Update message for player's turn
    } else {
      this.message = 'Wait for the enemy\'s turn'; // Update message for enemy's turn
    }
    this.requestUpdate(); // Re-render to show updated message
  }

  placeShip(row, col) {
    console.log('Placing player ships at:', row, col);
    if (this.shipsPlaced < 4 && this.playerBoard[row][col] === '') {
      this.playerBoard[row][col] = '🚢'; // Place ship
      this.shipsPlaced++; // Increment ships placed count
      this.requestUpdate(); // Re-render the component

      // Change message to "Game Start" if all ships are placed
      if (this.shipsPlaced === 4) {
        this.message = 'Tap on the enemy\'s board to try to hit ships';
        this.requestUpdate(); // Re-render to show updated message
        console.log('Dispatching message-updated event with message:', this.message); // Debugging line
        this.dispatchEvent(new CustomEvent('message-updated', { detail: this.message })); // Dispatch event
        // this.switchTurn(); // Start the player's turn
        console.log("all ships placed, enemy moves first");
        this.enemyMove(); // enemy moves first 
      }
    }
  }

  placeEnemyShips() {
    const shipCount = 4; // only 4 ships on enemy board 
    let placedShips = 0;

    while (placedShips < shipCount) {
      // make this dynamic along with board size 
      const row = Math.floor(Math.random() * 4);
      const col = Math.floor(Math.random() * 4);

      if (this.enemyBoard[row][col] === '') {
        this.enemyBoard[row][col] = '🚢';
        console.log(`Placed enemy ship at: ${row}, ${col}`);
        placedShips++;
      }
    }
  }

  endGame(winner) {
    console.log(`${winner} wins!`);
    this.winner = winner;
    this.gameEnded = true;
    // Optionally, add logic to disable further clicks
  }

  resetGame() {
    this.winner = '';
    this.gameEnded = false;
    this.shipsPlaced = 0; // Reset ships placed count
    // Add logic to reset the game state if needed
  }

  // TODO - take out flex-direction column in .board-container and take out @media (max-width: 768px) fields. Only style the horizontal and vertical boards in app.js @media tag for more encapsulation 
  static styles = css`
    .board-container {
      position: relative; 
      top: 50px;
      display: flex;
      flex-direction: column; 
      justify-content: flex-start; //flex-start for portrait 
      align-items: center;
      width: 100%;
      background-color: grey;
      margin: 0;
      padding: 0;
      
    }
    .message {
      color: orange; /* Style the message text */
      margin: 0; /* Remove default margin */
      font-size: 1.2em; /* Adjust font size for better readability */
    }
    .player-board, .enemy-board {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0px; // margin 0px for portrait 
      padding: 0px;
      position: relative;
      top: -20px; 
    }
    h3 {
      color: yellow; /* Set the color of the headings to yellow */
    }
    .board {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 2px solid darkgrey;
      width: 40vmin;
      height: 40vmin;
    }
    .row {
      display: contents;
    }
    .cell {
      background-color: lightblue;
      border: 4.5px solid #ccc;
      border-color: darkgrey;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.3s;
      font-size: 5vmin;
      width: 10vmin;
      height: 10vmin;
      box-sizing: border-box;
    }
    .cell:hover {
      background-color: #add8e6;
    }
    .cell.ship {
      background-color: blue;
    }
    .cell.hit-enemy {
      background-color: green;
      color: white;
    }
    .cell.hit-player {
      background-color: red;
      color: white;
    }
    .cell.miss {
      background-color: lightgray;
    }

    
    @media (max-width: 768px) { 
    .board-container {
      flex-direction: row;
    }
    .player-board {
      margin: 5px; 
    }
    .enemy-board {
      margin: 5px; 
      
    }
  }
  `;
}

customElements.define('game-board', GameBoard);