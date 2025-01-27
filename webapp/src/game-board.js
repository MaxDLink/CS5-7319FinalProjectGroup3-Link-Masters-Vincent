import { LitElement, html, css } from 'lit';
import { EnemyAI } from './enemy-ai.js';
import './winner-popup.js'; // Import the popup component

class GameBoard extends LitElement {
  static properties = {
    playerBoard: { type: Array },
    enemyBoard: { type: Array },
    winner: { type: String },
    gameEnded: { type: Boolean },
  };

  // TODO - 4 columns, 6 rows
  // static ROWS = 4;
  // static COLUMNS = 6;

  constructor() {
    super();
    // 4 columns, 6 rows -- make this dynamic and make the 4 on line 183 dynamic too 
    this.playerBoard = Array(4).fill().map(() => Array(4).fill('')); // this.playerBoard = Array(10).fill().map(() => Array(10).fill(''));
    this.enemyBoard = Array(4).fill().map(() => Array(4).fill('')); // this.enemyBoard = Array(10).fill().map(() => Array(10).fill(''));

    // Instantiate the enemy AI
    this.enemyAI = new EnemyAI();

    // Initialize turn state
    this.isPlayerTurn = true;

    // Place ships on the player's board
    this.placeShip(this.playerBoard, 0, 0);
    this.placeShip(this.playerBoard, 1, 1);
    this.placeShip(this.playerBoard, 2, 2);
    this.placeShip(this.playerBoard, 3, 3);

    // Place enemy ships on the enemy board
    this.placeEnemyShips();

    this.winner = '';
    this.gameEnded = false;
  }

  connectedCallback() {
    super.connectedCallback();
    // Call updateViewport when the component is connected to the DOM
    this.updateViewport();
    window.addEventListener('orientationchange', this.updateViewport.bind(this));
  }

  updateViewport() {
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
        board.style.width = boardSize; // Set common width
        board.style.height = boardSize; // Set common height
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
            ${this.playerBoard.map((row) => html`
              <div class="row">
                ${row.map((cell) => html`
                  <div class="cell ${cell === 'X' ? 'hit-player' : cell === 'O' ? 'miss' : ''}">
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
    this.updateViewport(); // Ensure the viewport is updated after rendering
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
      this.enemyAI.attack(this.playerBoard);
      if (this.checkWin(this.playerBoard)) {
        console.log('Enemy wins!');
        this.endGame('Enemy');
        return; // Stop further actions
      }
      this.requestUpdate(); // Ensure the component re-renders
      this.switchTurn();
    }
  }

  switchTurn() {
    this.isPlayerTurn = !this.isPlayerTurn;
    console.log(`Turn switched. Is it player's turn? ${this.isPlayerTurn}`);
  }

  placeShip(board, row, col) {
    if (board[row][col] === '') {
      board[row][col] = '🚢';
    } else {
      console.error('Position already occupied or out of bounds');
    }
  }

  placeEnemyShips() {
    const shipCount = 5;
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
    // Add logic to reset the game state if needed
  }

  static styles = css`
    .board-container {
      display: flex;
      flex-direction: column; <!-- for vertical board alignment -->
      justify-content: space-between; <!-- for vertical board alignment -->
      align-items: center;
      height: 100vh;
      width: 100vw;
      background-color: #f0f0f0;
    }
    .player-board, .enemy-board {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .board {
      display: grid;
      grid-template-columns: repeat(4, 1fr); // change 4 to change board size 
      grid-gap: 2px;
      width: 40vmin;
      height: 40vmin;
    }
    .row {
      display: contents;
    }
       .cell {
      background-color: lightblue;
      border: 1px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background-color 0.3s;
      font-size: 5vmin; // Use viewport width for responsive font size
      width: 10vmin; // Use viewport width for responsive width
      height: 10vmin; // Use viewport width for responsive height
      box-sizing: border-box; // Ensure padding and border are included in the element's total width and height
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
    .cell:hover {
      background-color: #add8e6;
    }
  `;
}

customElements.define('game-board', GameBoard);