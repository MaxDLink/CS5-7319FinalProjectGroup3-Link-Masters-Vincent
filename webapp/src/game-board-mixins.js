import { css, html } from 'lit';
import { GameBoard } from './game-board.js';
import { sounds } from './sounds.js';
import { LitElement } from 'lit';

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
        maxShips: { type: Number },
        isPlayerTurn: { type: Boolean },
        lastHitPosition: { type: Object },
        lastEnemyHitPosition: { type: Object },
        hitResult: { type: String },
        enemyHitResult: { type: String },
        animatingFireball: { type: Boolean },
        fireballPosition: { type: Object },
        animatingEnemyFireball: { type: Boolean },
        enemyFireballPosition: { type: Object }
      };
    }

    constructor() {
      super();
      // Board configuration
      this.boardWidth = 4;
      this.boardHeight = 1;
      this.maxShips = 4;
      
      // Game state
      this.gameEnded = false;
      this.winner = null;
      this.message = '';
      this.instructionText = '';
      this.isTutorialMode = true;
      this.shipsPlaced = 0;
      this.isPlayerTurn = true;
      
      // Initialize boards
      this.playerBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      this.enemyBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      
      // Hit tracking
      this.lastHitPosition = null;
      this.lastEnemyHitPosition = null;
      this.hitResult = null;
      this.enemyHitResult = null;
      
      // Animation state
      this.animatingFireball = false;
      this.fireballPosition = null;
      this.animatingEnemyFireball = false;
      this.enemyFireballPosition = null;
      
      // Ship positions
      this.playerShipPositions = [];
      this.enemyShipPositions = [];
      
      // Override backend-related properties
      this.gameId = null;
      this.wins = 0;
      this.losses = 0;
    }

    async connectedCallback() {
      // Initialize properties before calling super
      if (!this.gameId) {
        this.gameId = null;
        this.isPlayerTurn = true;
        this.gameEnded = false;
      }

      // Call super if it exists, but don't wait for it
      if (super.connectedCallback) {
        try {
          super.connectedCallback();
        } catch (error) {
          console.warn('Error in parent connectedCallback, continuing with tutorial initialization:', error);
        }
      }

      // Add event listener for game reset
      window.addEventListener('game-reset', () => {
        this.resetGame();
      });

      // Request an update to render initial state
      this.requestUpdate();
    }

    // Override backend-related methods to do nothing in tutorial mode
    async createGame() {
      // Do nothing in tutorial mode
      return Promise.resolve({ gameId: null });
    }

    async updateGame() {
      // Do nothing in tutorial mode
      return Promise.resolve();
    }

    async getGame() {
      // Do nothing in tutorial mode
      return Promise.resolve({
        gameId: null,
        playerBoard: this.playerBoard,
        enemyBoard: this.enemyBoard,
        shipsPlaced: this.shipsPlaced,
        status: 'IN_PROGRESS',
        isPlayerTurn: this.isPlayerTurn
      });
    }

    async deleteGame() {
      // Do nothing in tutorial mode
      return Promise.resolve();
    }

    // Override game state methods
    switchTurn() {
      // Do nothing in tutorial mode
      return;
    }

    checkWin() {
      // Do nothing in tutorial mode
      return false;
    }

    endGame() {
      // Do nothing in tutorial mode
      return;
    }

    resetGame() {
      // Reset only local state
      this.winner = null;
      this.gameEnded = false;
      this.playerBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      this.enemyBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
      this.shipsPlaced = 0;
      this.message = '';
      this.instructionText = '';
      this.isPlayerTurn = true;
      this.requestUpdate();
    }

    // Override animation methods to ensure they work in tutorial mode
    createExplosion(row, col, isEnemyBoard) {
      if (!this.shadowRoot) return;
      try {
        super.createExplosion?.(row, col, isEnemyBoard);
      } catch (error) {
        console.warn('Error creating explosion effect:', error);
      }
    }

    createWaterSplash(row, col, isEnemyBoard) {
      if (!this.shadowRoot) return;
      try {
        super.createWaterSplash?.(row, col, isEnemyBoard);
      } catch (error) {
        console.warn('Error creating water splash effect:', error);
      }
    }

    static styles = css`
        :host {
          --board-size: 4;
          --board-width: 280px;
          --cell-size: calc(var(--board-width) / 4);
          --ship-color: rgba(52, 152, 219, 0.7);
          --hit-color: rgba(46, 204, 113, 0.7);
          --miss-color: rgba(231, 76, 60, 0.7);
          display: flex;
          justify-content: center;
          width: 100%;
        }

        .game-card {
          background-color: #1e1e1e;
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
          position: relative;
        }

        .board-section .board {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: var(--board-width);
        }

        .board-section .cell {
          flex: 1;
          min-width: 0;
          min-height: 0;
        }

        .board {
          width: var(--board-width);
          height: calc(var(--board-width) / 4);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-template-rows: 1fr;
          gap: 2px;
          background-color: #1a1a1a;
          padding: 10px;
          border-radius: 12px;
          box-sizing: border-box;
          position: relative;
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
          box-sizing: border-box;
          position: relative;
          margin: 0;
          padding: 0;
        }

        .cell:hover {
          background-color: #3a3a3a;
          transform: scale(1.02);
        }

        .cell.ship {
          background-color: var(--ship-color);
        }

        .cell.hit {
          background-color: var(--hit-color);
        }

        .cell.miss {
          background-color: var(--miss-color);
        }

        .cell.player-ship-hit {
          background-color: var(--miss-color);
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
          color: #ffffff;
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
    `;

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
                         ${this.enemyBoard[row][col] === 'O' ? 'miss' : ''}
                         ${this.enemyBoard[row][col] === 'S' ? 'ship' : ''}"
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
                         ${this.playerBoard[row][col] === 'X' ? 'player-ship-hit' : ''}
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
      this.playerBoard = Array(1).fill().map(() => Array(4).fill(''));
      this.enemyBoard = Array(1).fill().map(() => Array(4).fill(''));
    }

    handlePlayerCellClick(row, col) {
      // Just highlight the cell to show interactivity
      const cell = this.shadowRoot.querySelector(`.player-section .cell:nth-child(${col + 1})`);
      if (cell) {
        cell.classList.add('tutorial-highlight');
        setTimeout(() => cell.classList.remove('tutorial-highlight'), 1000);
      }
    }

    handleEnemyCellClick(row, col) {
      // Just highlight the cell to show interactivity
      const cell = this.shadowRoot.querySelector(`.enemy-section .cell:nth-child(${col + 1})`);
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
      this.message = 'Click on the player board cells to place your ships!';
      this.instructionText = 'Click on your board to place your ships.';
      this.shipsPlaced = 0;
      // Initialize empty 1x4 boards
      this.playerBoard = Array(1).fill().map(() => Array(4).fill(''));
      this.enemyBoard = Array(1).fill().map(() => Array(4).fill(''));
    }

    handlePlayerCellClick(row, col) {
      if (this.shipsPlaced >= this.maxShips) return;
      
      if (this.playerBoard[row][col] === '') {
        // Place a ship
        this.playerBoard[row][col] = 'S';
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
      this.message = 'Place your ships first!';
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
    static get properties() {
      return {
        ...super.properties,
        isVisible: { type: Boolean }
      };
    }

    constructor() {
      super();
      this.message = 'Watch out! The enemy is attacking!';
      this.instructionText = 'The enemy will attack your ships.';
      // Initialize player board with ships and empty enemy board
      this.playerBoard = Array(1).fill().map(() => Array(4).fill('S'));
      this.enemyBoard = Array(1).fill().map(() => Array(4).fill(''));
      this.attackCount = 0;
      this.maxAttacks = 4;
      this.hasStartedAttacking = false;
      this.isVisible = false;
      // Override turn-based properties
      this.isPlayerTurn = false;
      this.gameEnded = false;
    }

    firstUpdated() {
      super.firstUpdated?.();
      this.setupVisibilityObserver();
    }

    setupVisibilityObserver() {
      // Create intersection observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            this.isVisible = entry.isIntersecting;
            if (this.isVisible && !this.hasStartedAttacking) {
              console.log('Enemy attack section is visible, starting attack sequence...');
              this.hasStartedAttacking = true;
              this.startAttackSequence();
            }
          });
        },
        {
          root: null,
          rootMargin: '0px',
          threshold: 0.7 // Requires 70% visibility to trigger
        }
      );

      // Start observing the board section
      requestAnimationFrame(() => {
        const boardSection = this.shadowRoot?.querySelector('.board-section');
        if (boardSection) {
          observer.observe(boardSection);
          console.log('Observing enemy attack board section');
        } else {
          console.warn('Board section not found for observation');
        }
      });
    }

    startAttackSequence() {
      console.log('Starting enemy attack sequence');
      // Schedule all four attacks with increasing delays
      for (let i = 0; i < this.maxAttacks; i++) {
        setTimeout(() => {
          if (this.isVisible) {
            this.performAttack(i);
          }
        }, 2000 * (i + 1)); // 2 seconds between each attack
      }
    }

    async performAttack(position) {
      if (!this.isVisible) return;

      const row = 0;
      const col = position;

      // Get board elements
      const playerBoard = this.shadowRoot?.querySelector('.player-section .board');
      const enemyBoard = this.shadowRoot?.querySelector('.enemy-section .board');
      const cells = this.shadowRoot?.querySelectorAll('.player-section .cell');
      const targetCell = cells?.[col];

      if (!playerBoard || !enemyBoard || !targetCell) {
        console.warn('Required elements not found for enemy attack animation');
        return;
      }

      // Start enemy fireball animation
      const enemyRect = enemyBoard.getBoundingClientRect();
      const targetRect = targetCell.getBoundingClientRect();

      // Calculate positions
      const startX = enemyRect.left + enemyRect.width / 2;
      const startY = enemyRect.top + enemyRect.height / 2;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      // Set up enemy fireball
      this.animatingEnemyFireball = true;
      this.enemyFireballPosition = { x: startX, y: startY };
      this.requestUpdate();

      // Animate the fireball
      const animationDuration = 1000;
      const startTime = performance.now();

      const animateFireball = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        const easeOutQuad = t => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        
        this.enemyFireballPosition = {
          x: startX + (endX - startX) * easedProgress,
          y: startY + (endY - startY) * easedProgress
        };
        
        this.requestUpdate();
        
        if (progress < 1) {
          requestAnimationFrame(animateFireball);
        } else {
          setTimeout(() => {
            this.animatingEnemyFireball = false;
            this.requestUpdate();

            // Process the hit
            if (this.playerBoard[row][col] === 'S') {
              this.playerBoard[row][col] = 'X';
              this.message = 'Enemy hit your ship!';
              this.instructionText = 'When the enemy hits your ship, it\'s marked with an X.';
              sounds.initAudioContext();
              sounds.HitPlayer();
              
              try {
                this.createExplosion(row, col, false);
              } catch (error) {
                console.warn('Error creating explosion effect:', error);
              }
            }
            
            this.requestUpdate();
          }, 100);
        }
      };

      requestAnimationFrame(animateFireball);
    }

    handlePlayerCellClick(row, col) {
      // Just visual feedback during enemy attacks
      const cell = this.shadowRoot?.querySelector(`.player-section .cell:nth-child(${col + 1})`);
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

    disconnectedCallback() {
      super.disconnectedCallback?.();
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
      // Initialize player board with ships but enemy board empty (ships are hidden)
      this.playerBoard = Array(1).fill().map(() => Array(4).fill('S'));
      this.enemyBoard = Array(1).fill().map(() => Array(4).fill('')); // Changed from 'S' to ''
      this.enemyShipPositions = [0, 1, 2, 3]; // Track ship positions internally
      this.hits = 0;
      this.maxHits = 4;
    }

    firstUpdated() {
      super.firstUpdated?.();
      // Ensure the boards are rendered before allowing interactions
      this.requestUpdate();
    }

    handleEnemyCellClick(row, col) {
      if (this.enemyBoard[row][col] === 'X' || this.enemyBoard[row][col] === 'O') return;
      
      // Get board elements after they're definitely in the DOM
      const playerBoard = this.shadowRoot?.querySelector('.player-section .board');
      const enemyBoard = this.shadowRoot?.querySelector('.enemy-section .board');
      const targetCell = enemyBoard?.querySelectorAll('.cell')[col];

      if (!playerBoard || !enemyBoard || !targetCell) {
        console.warn('Required elements not found for animation');
        return;
      }

      // Start fireball animation
      const playerRect = playerBoard.getBoundingClientRect();
      const targetRect = targetCell.getBoundingClientRect();

      // Calculate start and end positions
      const startX = playerRect.left + playerRect.width / 2;
      const startY = playerRect.top + playerRect.height / 2;
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;

      // Set up fireball animation
      this.animatingFireball = true;
      this.fireballPosition = { x: startX, y: startY };
      this.requestUpdate();

      // Animate the fireball
      const animationDuration = 800;
      const startTime = performance.now();

      const animateFireball = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        const easeOutQuad = t => t * (2 - t);
        const easedProgress = easeOutQuad(progress);
        
        this.fireballPosition = {
          x: startX + (endX - startX) * easedProgress,
          y: startY + (endY - startY) * easedProgress
        };
        
        this.requestUpdate();
        
        if (progress < 1) {
          requestAnimationFrame(animateFireball);
        } else {
          setTimeout(() => {
            this.animatingFireball = false;
            this.requestUpdate();
            
            // Process the hit after fireball animation
            if (this.enemyShipPositions.includes(col)) { // Check against internal ship positions
              this.enemyBoard[row][col] = 'X';
              this.hits++;
              this.message = 'Hit! You sunk an enemy ship!';
              this.instructionText = 'Great shot! Keep attacking to find all enemy ships.';
              sounds.initAudioContext();
              sounds.HitEnemy();
              
              try {
                this.createExplosion(row, col, true);
              } catch (error) {
                console.warn('Error creating explosion effect:', error);
              }

              if (this.hits === this.maxHits) {
                this.message = 'Victory! You sunk all enemy ships!';
                this.instructionText = 'You\'ve completed the tutorial!';
                sounds.initAudioContext();
                sounds.Victory();
              }
            } else {
              this.enemyBoard[row][col] = 'O';
              this.message = 'Miss! Try again!';
              this.instructionText = 'Keep searching for enemy ships.';
              
              try {
                this.createWaterSplash(row, col, true);
              } catch (error) {
                console.warn('Error creating water splash effect:', error);
              }
            }
            
            this.requestUpdate();
          }, 100);
        }
      };

      requestAnimationFrame(animateFireball);
    }

    handlePlayerCellClick(row, col) {
      // Allow player to see their ships but not modify them
      const cell = this.shadowRoot?.querySelector(`.player-section .cell:nth-child(${col + 1})`);
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

// Register the custom elements
customElements.define('game-board-overview', GameBoardOverview);
customElements.define('ship-placement-board', ShipPlacementBoard);
customElements.define('enemy-attack-board', EnemyAttackBoard);
customElements.define('player-attack-board', PlayerAttackBoard);

/**
 * Custom game board for battleship that doesn't inherit from GameBoard
 */
export class CustomBattleBoard extends LitElement {
  static get properties() {
    return {
      enemyBoard: { type: Array },
      playerBoard: { type: Array },
      message: { type: String },
      instructionText: { type: String }
    };
  }

  constructor() {
    super();
    // Fixed 4x1 board dimensions
    this.boardWidth = 4;
    this.boardHeight = 1;
    
    // Initialize enemy and player boards
    this.enemyBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
    this.playerBoard = Array(this.boardHeight).fill().map(() => Array(this.boardWidth).fill(''));
    
    // Set up player board with ships and skulls for display
    this.playerBoard[0][0] = 'X'; // skull
    this.playerBoard[0][1] = 'X'; // skull
    this.playerBoard[0][2] = 'S'; // ship
    this.playerBoard[0][3] = 'S'; // ship
    
    // Default messages
    this.message = 'Enemy hit your ship!';
    this.instructionText = 'When the enemy hits your ship, it\'s marked with an X.';
  }

  render() {
    return html`
      <div class="game-card">
        <h2 class="title">${this.message}</h2>
        <p class="instruction">${this.instructionText}</p>
        
        <div class="board-section">
          <h3 class="board-title">Enemy Board</h3>
          <div class="board enemy-board">
            ${this.enemyBoard[0].map((cell, index) => html`
              <div class="cell" data-position="${index}"></div>
            `)}
          </div>
        </div>
        
        <div class="board-section">
          <h3 class="board-title">Player Board</h3>
          <div class="board player-board">
            ${this.playerBoard[0].map((cell, index) => html`
              <div class="cell ${cell === 'X' ? 'hit' : ''} ${cell === 'S' ? 'ship' : ''}"
                   data-position="${index}">
                ${cell === 'X' ? html`<span class="skull">💀</span>` : 
                  cell === 'S' ? html`<span class="ship-icon">🚢</span>` : ''}
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        --board-width: 280px;
        --cell-size: calc(var(--board-width) / 4);
        display: flex;
        justify-content: center;
        width: 100%;
      }

      .game-card {
        background-color: #1e1e1e;
        border-radius: 16px;
        padding: 20px;
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .title {
        color: #ffffff;
        margin: 0 0 8px 0;
        text-align: center;
        font-size: 1.5em;
      }

      .instruction {
        color: #ffffff;
        text-align: center;
        margin: 0 0 20px 0;
        font-size: 1em;
      }

      .board-section {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin: 20px 0;
      }

      .board-title {
        font-size: 1.2em;
        color: #3498db;
        margin: 0 0 10px 0;
        text-align: center;
      }

      .board {
        width: var(--board-width);
        height: var(--cell-size);
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: 1fr;
        gap: 4px;
        background-color: #2a2a2a;
        padding: 8px;
        border-radius: 8px;
      }

      .cell {
        width: 100%;
        height: 100%;
        aspect-ratio: 1;
        background-color: #3a3a3a;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .cell.hit {
        background-color: rgba(231, 76, 60, 0.7);
      }

      .cell.ship {
        background-color: rgba(52, 152, 219, 0.7);
      }

      .skull, .ship-icon {
        font-size: 1.5em;
      }

      /* Responsive adjustments */
      @media (max-width: 600px) {
        :host {
          --board-width: 240px;
        }
      }
    `;
  }
}

// Define the custom elements
customElements.define('custom-battle-board', CustomBattleBoard);

/**
 * Enemy attack board with custom implementation
 */
export class CustomEnemyAttackBoard extends CustomBattleBoard {
  static get properties() {
    return {
      ...super.properties,
      isVisible: { type: Boolean },
      hasStartedAttacking: { type: Boolean },
      animatingEnemyFireball: { type: Boolean },
      enemyFireballPosition: { type: Object }
    };
  }

  constructor() {
    super();
    this.message = 'Enemy hit your ship!';
    this.instructionText = 'When the enemy hits your ship, it\'s marked with an X.';
    
    // Set player board with all ships for this view
    this.playerBoard[0][0] = 'S'; // ship (will become skull)
    this.playerBoard[0][1] = 'S'; // ship (will become skull)
    this.playerBoard[0][2] = 'S'; // ship 
    this.playerBoard[0][3] = 'S'; // ship
    
    // Observer and animation state
    this.isVisible = false;
    this.hasStartedAttacking = false;
    this.animatingEnemyFireball = false;
    this.enemyFireballPosition = null;
    this.attackCount = 0;
    this.maxAttacks = 4;
  }

  firstUpdated() {
    super.firstUpdated?.();
    this.setupVisibilityObserver();
  }

  setupVisibilityObserver() {
    // Create intersection observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          this.isVisible = entry.isIntersecting;
          if (this.isVisible && !this.hasStartedAttacking) {
            console.log('Enemy attack section is visible, starting attack sequence...');
            this.hasStartedAttacking = true;
            this.startAttackSequence();
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: 0.7 // Requires 70% visibility to trigger
      }
    );

    // Start observing the component
    requestAnimationFrame(() => {
      const boardSection = this.shadowRoot?.querySelector('.game-card');
      if (boardSection) {
        observer.observe(boardSection);
        console.log('Observing enemy attack board section');
      } else {
        console.warn('Board section not found for observation');
      }
    });
  }

  startAttackSequence() {
    console.log('Starting enemy attack sequence');
    // Schedule all four attacks with increasing delays
    for (let i = 0; i < this.maxAttacks; i++) {
      setTimeout(() => {
        if (this.isVisible) {
          this.performAttack(i);
        }
      }, 2000 * (i + 1)); // 2 seconds between each attack
    }
  }

  async performAttack(position) {
    if (!this.isVisible) return;

    const col = position;

    // Get board elements after they're definitely in the DOM
    const enemyBoard = this.shadowRoot?.querySelector('.enemy-board');
    const playerBoard = this.shadowRoot?.querySelector('.player-board');
    const targetCell = playerBoard?.querySelectorAll('.cell')[col];

    if (!enemyBoard || !playerBoard || !targetCell) {
      console.warn('Required elements not found for enemy attack animation');
      return;
    }

    // Start enemy fireball animation
    const enemyRect = enemyBoard.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();

    // Calculate positions for exact targeting
    const startX = enemyRect.left + enemyRect.width / 2;
    const startY = enemyRect.top + enemyRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // Create and append fireball element
    const fireball = document.createElement('div');
    fireball.className = 'fireball';
    fireball.textContent = '🔥';
    fireball.style.position = 'fixed';
    fireball.style.zIndex = '100';
    fireball.style.fontSize = '24px';
    fireball.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(fireball);

    // Animate the fireball
    const animationDuration = 1000;
    const startTime = performance.now();

    const animateFireball = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      const easeOutQuad = t => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      fireball.style.left = `${startX + (endX - startX) * easedProgress}px`;
      fireball.style.top = `${startY + (endY - startY) * easedProgress}px`;
      
      if (progress < 1) {
        requestAnimationFrame(animateFireball);
      } else {
        // Animation complete, remove fireball
        document.body.removeChild(fireball);
        
        // Process the hit
        setTimeout(() => {
          // Mark ship as hit
          this.playerBoard[0][col] = 'X';
          this.message = 'Enemy hit your ship!';
          this.instructionText = 'When the enemy hits your ship, it\'s marked with an X.';
          sounds.initAudioContext();
          sounds.HitPlayer();
          
          this.requestUpdate();
        }, 100);
      }
    };

    requestAnimationFrame(animateFireball);
  }

  render() {
    return html`
      <div class="game-card">
        <h2 class="title">${this.message}</h2>
        <p class="instruction">${this.instructionText}</p>
        
        <div class="board-section">
          <h3 class="board-title">Enemy Board</h3>
          <div class="board enemy-board">
            ${this.enemyBoard[0].map((cell, index) => html`
              <div class="cell" data-position="${index}"></div>
            `)}
          </div>
        </div>
        
        <div class="board-section">
          <h3 class="board-title">Player Board</h3>
          <div class="board player-board">
            ${this.playerBoard[0].map((cell, index) => html`
              <div class="cell ${cell === 'X' ? 'hit' : ''} ${cell === 'S' ? 'ship' : ''}"
                   data-position="${index}">
                ${cell === 'X' ? html`<span class="skull">💀</span>` : 
                  cell === 'S' ? html`<span class="ship-icon">🚢</span>` : ''}
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      ${super.styles}
      
      .fireball {
        position: fixed;
        z-index: 100;
        pointer-events: none;
        font-size: 1.5em;
      }
    `;
  }
}

// Define the custom elements
customElements.define('custom-enemy-attack-board', CustomEnemyAttackBoard);

/**
 * Player attack board with custom implementation - Interactive Demo
 */
export class CustomPlayerAttackBoard extends CustomBattleBoard {
  static get properties() {
    return {
      ...super.properties,
      animatingFireball: { type: Boolean },
      fireballPosition: { type: Object },
      hits: { type: Number },
      maxHits: { type: Number },
      enemyShipPositions: { type: Array },
      victoryMode: { type: Boolean }
    };
  }

  constructor() {
    super();
    // Set initial message
    this.message = 'Your Turn to Attack!';
    this.instructionText = 'Now it\'s your turn to attack the enemy\'s board. Try to find and sink their ships!';
    
    // Set ALL player board cells with ships
    this.playerBoard[0][0] = 'S'; // ship
    this.playerBoard[0][1] = 'S'; // ship
    this.playerBoard[0][2] = 'S'; // ship
    this.playerBoard[0][3] = 'S'; // ship
    
    // Initialize enemy board with NO hits - all empty cells
    this.enemyBoard = Array(1).fill().map(() => Array(4).fill('')); // All cells are empty
    
    // Animation state
    this.animatingFireball = false;
    this.fireballPosition = null;
    this.hits = 0; // No hits yet
    this.maxHits = 4;
    this.enemyShipPositions = [0, 1, 2, 3]; // All positions have ships (hidden)
    this.victoryMode = false; // Not in victory mode yet
  }

  firstUpdated() {
    super.firstUpdated?.();
    
    // Add click handlers to enemy cells for interactive fireball attacks
    this.shadowRoot.querySelectorAll('.enemy-board .cell').forEach(cell => {
      cell.addEventListener('click', (e) => this.handleEnemyCellClick(e));
    });
  }

  handleEnemyCellClick(event) {
    const cell = event.target.closest('.cell');
    if (!cell) return;
    
    const cellIndex = cell.dataset.position;
    if (!cellIndex) return;
    
    const col = parseInt(cellIndex, 10);
    
    // Don't allow re-attacking already hit cells
    if (this.enemyBoard[0][col] === 'X') return;
    
    // Perform attack
    this.performPlayerAttack(col);
  }

  performPlayerAttack(col) {
    // Get board elements
    const playerBoard = this.shadowRoot?.querySelector('.player-board');
    const enemyBoard = this.shadowRoot?.querySelector('.enemy-board');
    const targetCell = enemyBoard?.querySelectorAll('.cell')[col];

    if (!playerBoard || !enemyBoard || !targetCell) {
      console.warn('Required elements not found for player attack animation');
      return;
    }

    // Calculate exact coordinates for the animation
    const playerRect = playerBoard.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();

    // Start and end positions
    const startX = playerRect.left + playerRect.width / 2;
    const startY = playerRect.top + playerRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // Create and append fireball element
    const fireball = document.createElement('div');
    fireball.className = 'fireball';
    fireball.textContent = '🔥';
    fireball.style.position = 'fixed';
    fireball.style.zIndex = '100';
    fireball.style.fontSize = '24px';
    fireball.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(fireball);

    // Animate the fireball
    const animationDuration = 800;
    const startTime = performance.now();

    const animateFireball = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      const easeOutQuad = t => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      fireball.style.left = `${startX + (endX - startX) * easedProgress}px`;
      fireball.style.top = `${startY + (endY - startY) * easedProgress}px`;
      
      if (progress < 1) {
        requestAnimationFrame(animateFireball);
      } else {
        // Animation complete, remove fireball
        document.body.removeChild(fireball);
        
        // Process the hit - always a hit in this demo
        setTimeout(() => {
          // Mark cell as hit
          this.enemyBoard[0][col] = 'X';
          this.hits++;
          
          // Always play hit sound
          sounds.initAudioContext();
          sounds.HitEnemy();
          
          // Update message based on hit count
          if (this.hits === this.maxHits) {
            this.message = 'Victory! You sunk all enemy ships!';
            this.instructionText = 'You\'ve completed the tutorial!';
            this.victoryMode = true;
            
            // Play victory sound
            sounds.initAudioContext();
            sounds.Victory();
          } else {
            this.message = 'Hit! You sunk an enemy ship!';
            this.instructionText = `Great shot! Keep attacking to find all enemy ships. (${this.hits}/${this.maxHits})`;
          }
          
          this.requestUpdate();
        }, 100);
      }
    };

    requestAnimationFrame(animateFireball);
  }

  render() {
    return html`
      <div class="game-card">
        <h2 class="title">${this.message}</h2>
        <p class="instruction">${this.instructionText}</p>
        
        <div class="board-section">
          <h3 class="board-title">Enemy Board</h3>
          <div class="board enemy-board">
            ${this.enemyBoard[0].map((cell, index) => html`
              <div class="cell ${cell === 'X' ? 'hit' : ''}"
                   data-position="${index}">
                ${cell === 'X' ? '💥' : ''}
              </div>
            `)}
          </div>
        </div>
        
        <div class="board-section">
          <h3 class="board-title">Player Board</h3>
          <div class="board player-board">
            ${this.playerBoard[0].map((cell, index) => html`
              <div class="cell ${cell === 'X' ? 'hit' : ''} ${cell === 'S' ? 'ship' : ''}"
                   data-position="${index}">
                ${cell === 'X' ? html`<span class="skull">💀</span>` : 
                  cell === 'S' ? html`<span class="ship-icon">🚢</span>` : ''}
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      ${super.styles}
      
      .fireball {
        position: fixed;
        z-index: 100;
        pointer-events: none;
        font-size: 1.5em;
      }
      
      .cell.hit {
        background-color: rgba(46, 204, 113, 0.7);
      }
      
      .cell.miss {
        background-color: rgba(231, 76, 60, 0.7);
      }
      
      .title {
        font-size: 1.8em;
        margin-bottom: 10px;
      }
      
      .instruction {
        margin-bottom: 20px;
      }
      
      @keyframes explode-anim {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
      
      .enemy-board .cell {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .enemy-board .cell:hover {
        background-color: #3a3a3a;
        transform: scale(1.05);
      }
    `;
  }
}

// Define the custom elements
customElements.define('custom-player-attack-board', CustomPlayerAttackBoard); 