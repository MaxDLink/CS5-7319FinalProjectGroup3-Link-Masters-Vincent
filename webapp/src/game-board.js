import { LitElement, html, css } from 'lit';
import { EnemyAI } from './enemy-ai.js';

class GameBoard extends LitElement {
  static properties = {
    playerBoard: { type: Array },
    enemyBoard: { type: Array },
  };

  constructor() {
    super();
    this.playerBoard = Array(10).fill().map(() => Array(10).fill(''));
    this.enemyBoard = Array(10).fill().map(() => Array(10).fill(''));

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
  }

  render() {
    return html`
      <div class="board-container">
        <div class="player-board">
          <h3>Player Board</h3>
          <div class="board">
            ${this.playerBoard.map((row) => html`
              <div class="row">
                ${row.map((cell) => html`
                  <div class="cell">
                    ${cell}
                  </div> 
                `)}
              </div>
            `)}
          </div>
        </div>
        <div class="enemy-board">
          <h3>Enemy Board</h3>
          <div class="board">
            ${this.enemyBoard.map((row, rowIndex) => html`
              <div class="row">
                ${row.map((cell, colIndex) => html`
                  <div class="cell" @click="${() => this.handleEnemyCellClick(rowIndex, colIndex)}">
                    ${cell === '🚢' ? '' : cell}
                  </div> 
                `)}
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  handleEnemyCellClick(row, col) {
    if (!this.isPlayerTurn) {
      console.log("It's not the player's turn.");
      return;
    }
    console.log(`Player attacks: ${row}, ${col}`);
    if (this.enemyBoard[row][col] === '🚢') {
      console.log('Hit!');
      this.enemyBoard[row][col] = 'X'; // Mark hit
    } else {
      console.log('Miss!');
      this.enemyBoard[row][col] = 'O'; // Mark miss
    }
    this.switchTurn();
    this.enemyMove();
  }

  enemyMove() {
    if (!this.isPlayerTurn) {
      this.enemyAI.attack(this.playerBoard);
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
      const row = Math.floor(Math.random() * 10);
      const col = Math.floor(Math.random() * 10);

      if (this.enemyBoard[row][col] === '') {
        this.enemyBoard[row][col] = '🚢';
        console.log(`Placed enemy ship at: ${row}, ${col}`);
        placedShips++;
      }
    }
  }

  static styles = css`
    .board-container {
      display: flex;
      justify-content: space-around;
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
      grid-template-columns: repeat(10, 1fr);
      grid-gap: 2px;
      width: 45vmin;
      height: 45vmin;
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
    }
    .cell:hover {
      background-color: #add8e6;
    }
  `;
}

customElements.define('game-board', GameBoard);