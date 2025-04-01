import { css, html } from 'lit';
import { GameBoard } from './game-board.js';
import { sounds } from './sounds.js';

/**
 * Base mixin for tutorial game boards
 */
const TutorialBaseMixin = (Base) =>
  class extends Base {
    static get properties() {
      return {
        ...super.properties,
        boardWidth: { type: Number },
        boardHeight: { type: Number },
        gameEnded: { type: Boolean },
        winner: { type: String },
        message: { type: String },
        instructionText: { type: String },
        isTutorialMode: { type: Boolean },
        playerBoard: { type: Array },
        enemyBoard: { type: Array },
        shipsPlaced: { type: Number },
        maxShips: { type: Number }
      };
    }

    constructor() {
      super();
      this.boardWidth = 4;  // Width of the board (number of columns)
      this.boardHeight = 1; // Height of the board (number of rows)
      this.maxShips = 4;    // Total number of ships that can be placed
      this.gameEnded = false;
      this.winner = null;
      this.message = '';
      this.instructionText = '';
      this.isTutorialMode = true;
      this.shipsPlaced = 0;
      this.playerBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      this.enemyBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
    }

    static styles = [
      super.styles,
      css`
        :host {
          --board-size: 4;
          --board-width: 280px; /* Fixed board width */
          --cell-size: calc(var(--board-width) / 4); /* Cells will be 1/4 of board width */
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .game-card {
          background-color: var(--background-color);
          border-radius: 16px;
          padding: 20px;
          width: 100%;
          max-width: 600px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .boards-wrapper {
          display: flex;
          flex-direction: column;
          gap: 40px;
          align-items: center;
          width: 100%;
        }

        .board-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
        }

        .board {
          width: var(--board-width);
          height: calc(var(--board-width) / 4); /* Make board 1/4 as tall as wide */
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: 1fr;
          gap: 2px;
          background-color: #1a1a1a;
          padding: 10px;
          border-radius: 12px;
          box-sizing: border-box;
        }

        .cell {
          width: 100%;
          height: 100%;
          aspect-ratio: 1;
          font-size: 1.5em;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: #2a2a2a;
          border: 1px solid #333;
          border-radius: 4px;
        }

        .cell:hover {
          background-color: #3a3a3a;
          transform: scale(1.02);
        }

        .tutorial-highlight {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .message, .instruction-text {
          color: var(--text-color);
          text-align: center;
          margin: 10px 0;
          width: 100%;
        }

        .board-title {
          font-size: 1.2em;
          color: #3498db;
          margin: 0;
          text-align: center;
        }

        .ship {
          background-color: var(--ship-color);
        }

        .hit {
          background-color: var(--hit-color);
        }

        .miss {
          background-color: var(--miss-color);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          :host {
            --board-width: 240px;
          }
          
          .cell {
            font-size: 1.2em;
          }
        }

        @media (max-width: 480px) {
          :host {
            --board-width: 200px;
          }
          
          .cell {
            font-size: 1em;
          }
        }
      `
    ];

    render() {
      return html`
        <div class="game-card">
          <div class="message">${this.message}</div>
          <div class="instruction-text">${this.instructionText}</div>
          
          <div class="boards-wrapper">
            <div class="board-section enemy-section">
              <div class="board-title">Enemy Board</div>
              <div class="board">
                ${Array(1).fill().map((_, row) => 
                  Array(4).fill().map((_, col) => html`
                    <div class="cell 
                         ${this.enemyBoard[row][col] === 'X' ? 'hit' : ''} 
                         ${this.enemyBoard[row][col] === 'O' ? 'miss' : ''}"
                         @click="${() => this.handleEnemyCellClick(row, col)}">
                      ${this.enemyBoard[row][col] === 'X' ? '💥' : 
                        this.enemyBoard[row][col] === 'O' ? '💦' : ''}
                    </div>
                  `)
                )}
              </div>
            </div>
            
            <div class="board-section player-section">
              <div class="board-title">Player Board</div>
              <div class="board">
                ${Array(1).fill().map((_, row) => 
                  Array(4).fill().map((_, col) => html`
                    <div class="cell 
                         ${this.playerBoard[row][col] === 'X' ? 'hit' : ''} 
                         ${this.playerBoard[row][col] === 'S' ? 'ship' : ''}"
                         @click="${() => this.handlePlayerCellClick(row, col)}">
                      ${this.playerBoard[row][col] === 'X' ? '💀' : 
                        this.playerBoard[row][col] === 'S' ? '🚢' : ''}
                    </div>
                  `)
                )}
              </div>
            </div>
          </div>
        </div>
      `;
    }
  };

/**
 * Mixin for the initial game board overview
 */
const GameBoardOverviewMixin = (Base) =>
  class extends TutorialBaseMixin(Base) {
    constructor() {
      super();
      this.message = 'Welcome to Battle Ship!';
      this.instructionText = 'This is your game board. You\'ll place your ships here.';
      this.playerBoard = Array(this.boardWidth).fill().map(() => Array(this.boardHeight).fill(''));
      this.enemyBoard = Array(this.boardWidth).fill().map(() => Array(this.boardHeight).fill(''));
    }

    handlePlayerCellClick(row, col) {
      // Highlight the clicked cell to show interactivity
      const cell = this.shadowRoot.querySelector(`.player-section .cell:nth-child(${row * this.boardWidth + col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }

    handleEnemyCellClick(row, col) {
      // Highlight the clicked cell to show interactivity
      const cell = this.shadowRoot.querySelector(`.enemy-section .cell:nth-child(${row * this.boardWidth + col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }
  };

/**
 * Mixin for the ship placement tutorial
 */
const ShipPlacementMixin = (Base) =>
  class extends TutorialBaseMixin(Base) {
    constructor() {
      super();
      this.message = 'Place your ships!';
      this.instructionText = 'Click on your board to place your ships.';
      this.shipsPlaced = 0;
      // Initialize boards using the dimensions from parent
      this.playerBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      this.enemyBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      this.isTutorialMode = true;
    }

    handlePlayerCellClick(row, col) {
      console.log('Player clicked:', row, col);
      if (this.shipsPlaced >= this.maxShips) return;
      
      if (this.playerBoard[row][col] === '') {
        // Create a new board with the ship placed
        this.playerBoard = this.playerBoard.map((r, i) => 
          i === row ? r.map((c, j) => j === col ? 'S' : c) : r
        );
        this.shipsPlaced++;
        sounds.initAudioContext();
        sounds.HitPlayer();

        if (this.shipsPlaced === this.maxShips) {
          this.message = 'All ships placed!';
          this.instructionText = 'Great job! You\'ve placed all your ships.';
        } else {
          this.message = `Place ${this.maxShips - this.shipsPlaced} more ships!`;
          this.instructionText = 'Click on your board to place your ships.';
        }
        this.requestUpdate();
      } else {
        this.message = 'You already placed a ship here!';
        this.instructionText = 'Choose an empty cell to place your ship.';
        setTimeout(() => {
          this.message = `Place ${this.maxShips - this.shipsPlaced} more ships!`;
          this.instructionText = 'Click on your board to place your ships.';
          this.requestUpdate();
        }, 1000);
      }
    }

    handleEnemyCellClick(row, col) {
      this.message = 'First place all your ships!';
      this.instructionText = `Place ${this.maxShips - this.shipsPlaced} more ships on your board.`;
      setTimeout(() => {
        if (this.shipsPlaced < this.maxShips) {
          this.message = `Place ${this.maxShips - this.shipsPlaced} more ships!`;
          this.instructionText = 'Click on your board to place your ships.';
          this.requestUpdate();
        }
      }, 1000);
    }
  };

/**
 * Mixin for the enemy attack tutorial
 */
const EnemyAttackMixin = (Base) =>
  class extends TutorialBaseMixin(Base) {
    constructor() {
      super();
      this.message = 'Watch out! The enemy is attacking!';
      this.instructionText = 'The enemy will attack your ships.';
      // Pre-fill the board with ships for demonstration
      this.playerBoard = Array(this.boardWidth).fill().map(() => Array(this.boardWidth).fill('S'));
      this.enemyBoard = Array(this.boardWidth).fill().map(() => Array(this.boardWidth).fill(''));
      this.attackCount = 0;
      this.maxAttacks = 3;
      this.hasStartedAttacking = false;
      // Indicate this is tutorial mode
      this.isTutorialMode = true;
      
      // Add properties for fireball animation
      this.animatingEnemyFireball = false;
      this.enemyFireballPosition = { x: 0, y: 0 };
    }

    connectedCallback() {
      super.connectedCallback();
      // Use IntersectionObserver to detect when section is visible
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.hasStartedAttacking) {
            this.hasStartedAttacking = true;
            // Start demo attacks when visible
            setTimeout(() => this.startEnemyAttacks(), 1000);
          }
        });
      }, { threshold: 0.5 });

      observer.observe(this);
    }

    startEnemyAttacks() {
      if (this.attackCount < this.maxAttacks) {
        setTimeout(() => {
          this.simulateEnemyAttack();
          this.attackCount++;
          if (this.attackCount < this.maxAttacks) {
            this.startEnemyAttacks();
          }
        }, 2000);
      }
    }

    simulateEnemyAttack() {
      const row = Math.floor(Math.random() * this.boardWidth);
      const col = Math.floor(Math.random() * this.boardWidth);
      
      // Start fireball animation before the attack
      this.startEnemyFireballAnimation(row, col);

      // Delay the attack result until after the animation
      setTimeout(() => {
        if (this.playerBoard[row][col] === 'S') {
          this.playerBoard[row][col] = 'X';
          this.message = 'Enemy hit your ship!';
          this.instructionText = 'When the enemy hits your ship, it\'s marked with an X.';
          sounds.initAudioContext();
          sounds.HitPlayer();
          this.createExplosion(row, col, false);
        } else {
          this.playerBoard[row][col] = 'O';
          this.message = 'Enemy missed!';
          this.instructionText = 'When the enemy misses, it\'s marked with an O.';
          this.createWaterSplash(row, col, false);
        }
        this.requestUpdate();
      }, 1000); // Wait for fireball animation to complete
    }

    startEnemyFireballAnimation(targetRow, targetCol) {
      // Get the positions of the player board and enemy board
      const playerBoard = this.shadowRoot.querySelector('.player-section .board');
      const enemyBoard = this.shadowRoot.querySelector('.enemy-section .board');
      const targetCell = playerBoard.querySelectorAll('.cell')[targetRow * this.boardWidth + targetCol];
      
      if (!playerBoard || !enemyBoard || !targetCell) {
        console.error('Could not find elements for enemy animation');
        return;
      }
      
      // Get the positions
      const enemyRect = enemyBoard.getBoundingClientRect();
      const targetRect = targetCell.getBoundingClientRect();
      
      // Calculate start and end positions
      const startX = enemyRect.left + enemyRect.width / 2;
      const startY = enemyRect.top + enemyRect.height / 2;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;
      
      // Start animation
      this.animatingEnemyFireball = true;
      this.enemyFireballPosition = { x: startX, y: startY };
      
      // Force a synchronous update
      this.requestUpdate();
      
      // Animate the fireball
      const animationDuration = 800; // ms
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Use easing function for smooth animation
        const easeProgress = progress * (2 - progress);
        
        // Update fireball position
        this.enemyFireballPosition = {
          x: startX + (endX - startX) * easeProgress,
          y: startY + (endY - startY) * easeProgress
        };
        
        this.requestUpdate();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.animatingEnemyFireball = false;
          this.requestUpdate();
        }
      };
      
      requestAnimationFrame(animate);
    }

    handlePlayerCellClick(row, col) {
      // Just visual feedback during enemy attacks
      const cell = this.shadowRoot.querySelector(`.player-section .cell:nth-child(${row * this.boardWidth + col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }

    handleEnemyCellClick(row, col) {
      this.message = 'Wait for the enemy to finish attacking!';
      this.instructionText = 'The enemy is taking their turn.';
      setTimeout(() => {
        this.message = 'Watch out! The enemy is attacking!';
      }, 1000);
    }
  };

/**
 * Mixin for the player attack tutorial
 */
const PlayerAttackMixin = (Base) =>
  class extends TutorialBaseMixin(Base) {
    constructor() {
      super();
      this.message = 'Your turn to attack!';
      this.instructionText = 'Click on the enemy\'s board to attack.';
      this.playerBoard = Array(this.boardWidth).fill().map(() => Array(this.boardWidth).fill('S'));
      this.enemyBoard = Array(this.boardWidth).fill().map(() => Array(this.boardWidth).fill(''));
      this.hits = 0;
      this.maxHits = 2;
      
      // Place some enemy ships
      this.placeEnemyShips();
    }

    placeEnemyShips() {
      const shipCount = 2;
      let placed = 0;
      
      while (placed < shipCount) {
        const row = Math.floor(Math.random() * this.boardWidth);
        const col = Math.floor(Math.random() * this.boardWidth);
        
        if (this.enemyBoard[row][col] === '') {
          this.enemyBoard[row][col] = 'S';
          placed++;
        }
      }
    }

    handleEnemyCellClick(row, col) {
      if (this.enemyBoard[row][col] === 'X' || this.enemyBoard[row][col] === 'O') return;
      
      if (this.enemyBoard[row][col] === 'S') {
        this.enemyBoard[row][col] = 'X';
        this.hits++;
        this.message = 'Hit! You sunk an enemy ship!';
        this.instructionText = 'Great shot! Keep attacking to find all enemy ships.';
        sounds.initAudioContext();
        sounds.HitEnemy();
        this.createExplosion(row, col, true);

        if (this.hits === this.maxHits) {
          this.message = 'Victory! You sunk all enemy ships!';
          this.instructionText = 'You\'ve completed the tutorial!';
          this.gameEnded = true;
          this.winner = 'Player';
          sounds.initAudioContext();
          sounds.Victory();
        }
      } else {
        this.enemyBoard[row][col] = 'O';
        this.message = 'Miss! Try again!';
        this.instructionText = 'Keep searching for enemy ships.';
        this.createWaterSplash(row, col, true);
      }
      
      this.requestUpdate();
    }

    handlePlayerCellClick(row, col) {
      // Allow player to see their ships but not modify them
      const cell = this.shadowRoot.querySelector(`.player-section .cell:nth-child(${row * this.boardWidth + col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }
  };

/**
 * Mixin for the victory screen tutorial
 */
const VictoryScreenMixin = (Base) =>
  class extends TutorialBaseMixin(Base) {
    constructor() {
      super();
      this.message = 'Victory!';
      this.instructionText = 'You\'ve sunk all enemy ships!';
      this.playerBoard = Array(this.boardWidth).fill().map(() => Array(this.boardWidth).fill('S'));
      this.enemyBoard = Array(this.boardWidth).fill().map(() => Array(this.boardWidth).fill('X'));
      this.gameEnded = true;
      this.winner = 'Player';
    }

    handlePlayerCellClick(row, col) {
      // Highlight cells to show the final state
      const cell = this.shadowRoot.querySelector(`.player-section .cell:nth-child(${row * this.boardWidth + col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }

    handleEnemyCellClick(row, col) {
      // Highlight cells to show the final state
      const cell = this.shadowRoot.querySelector(`.enemy-section .cell:nth-child(${row * this.boardWidth + col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }
  };

// Create and export the tutorial game board components
export const GameBoardOverview = GameBoardOverviewMixin(GameBoard);
export const ShipPlacementBoard = ShipPlacementMixin(GameBoard);
export const EnemyAttackBoard = EnemyAttackMixin(GameBoard);
export const PlayerAttackBoard = PlayerAttackMixin(GameBoard);
export const VictoryScreenBoard = VictoryScreenMixin(GameBoard);

// Register the custom elements
customElements.define('game-board-overview', GameBoardOverview);
customElements.define('ship-placement-board', ShipPlacementBoard);
customElements.define('enemy-attack-board', EnemyAttackBoard);
customElements.define('player-attack-board', PlayerAttackBoard);
customElements.define('victory-screen-board', VictoryScreenBoard); 