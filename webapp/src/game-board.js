import { LitElement, html, css } from 'lit';

class GameBoard extends LitElement {
  static properties = {
    playerBoard: { type: Array },
    enemyBoard: { type: Array },
  };

  constructor() {
    super();
    this.playerBoard = Array(10).fill().map(() => Array(10).fill(''));
    this.enemyBoard = Array(10).fill().map(() => Array(10).fill(''));

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
            ${this.playerBoard.map((row, rowIndex) => html`
              <div class="row">
                ${row.map((cell, colIndex) => html`
                  <div class="cell" @click="${() => this.handleCellClick(rowIndex, colIndex)}">
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
                    <!-- Do not display ships on the enemy board -->
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

  // Function to place a ship on a given board
  placeShip(board, row, col) {
    if (board[row][col] === '') {
      board[row][col] = '🚢';
    } else {
      console.error('Position already occupied or out of bounds');
    }
  }

  // Function to place enemy ships on the enemy board in random positions
  placeEnemyShips() {
    const shipCount = 5; // Number of ships to place
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

  handleCellClick(row, col) {
    console.log(`Cell clicked: ${row}, ${col}`);
  }

  handleEnemyCellClick(row, col) {
    console.log(`Enemy cell clicked: ${row}, ${col}`);
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