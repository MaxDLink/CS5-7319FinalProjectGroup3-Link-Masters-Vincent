import { LitElement, html, css } from 'lit';

class GameBoard extends LitElement {
  static properties = {
    board: { type: Array },
  };

  constructor() {
    super();
    this.board = Array(10).fill().map(() => Array(10).fill(''));

    // place ship on the board 
    this.placeShip(0, 0);
    this.placeShip(1, 1);
    this.placeShip(2, 2);
    this.placeShip(3, 3);
  }

  render() {
    return html`
      <div class="board-container">
        <div class="board">
          ${this.board.map((row, rowIndex) => html`
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
    `;
  }

  // function to place a ship on the board. To place a ship we update the board 
  placeShip(row, col) {
    // Check if the position is within bounds and not already occupied
    if (this.board[row][col] === '') {
      // Mark the position on the board
      this.board[row][col] = '🚢';
    } else {
      console.error('Position already occupied or out of bounds');
    }
  }

  handleCellClick(row, col) {
    // Handle cell click logic, e.g., place a ship or make a guess
    console.log(`Cell clicked: ${row}, ${col}`);

    // place ship with clicking 
//   // Create a new ship element
//   const ship = document.createElement('ship-element');
  
//   // Calculate the position based on the cell size
//   const cellSize = 90 / 10; // Assuming the board is 90vmin and has 10 cells
//   ship.style.position = 'absolute';
//   ship.style.top = `${row * cellSize}vmin`;
//   ship.style.left = `${col * cellSize}vmin`;
  
//   // Append the ship to the board
//   this.shadowRoot.querySelector('.board-container').appendChild(ship);
  }

  static styles = css`
    .board-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100vw;
      background-color: #f0f0f0;
    }
    .board {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      grid-gap: 2px;
      width: 90vmin;
      height: 90vmin;
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