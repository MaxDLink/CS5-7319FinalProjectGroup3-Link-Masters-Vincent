import { LitElement, html, css } from 'lit';

class GameBoard extends LitElement {
  static properties = {
    board: { type: Array },
  };

  constructor() {
    super();
    this.board = Array(10).fill().map(() => Array(10).fill(''));
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

  handleCellClick(row, col) {
    // Handle cell click logic, e.g., place a ship or make a guess
    console.log(`Cell clicked: ${row}, ${col}`);
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