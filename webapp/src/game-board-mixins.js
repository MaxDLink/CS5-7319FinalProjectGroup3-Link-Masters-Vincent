import { css, html } from 'lit';
import { GameBoard } from './game-board.js';
import { sounds } from './sounds.js';
import { LitElement } from 'lit';

/**
 * Shared base styles for game board components
 */
const BaseStyles = css`
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

  .board-title {
    font-size: 1.2em;
    color: #3498db;
    margin: 0;
    text-align: center;
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

  .fireball {
    position: fixed;
    z-index: 100;
    pointer-events: none;
    font-size: 1.5em;
  }
`;

/**
 * Combined utility functions for board management and animations
 */
const Utils = {
  // Board creation utilities
  createEmptyBoard: (height, width, defaultValue = '') => {
    return Array(height).fill().map(() => Array(width).fill(defaultValue));
  },
  
  createShipBoard: (height, width) => {
    return Array(height).fill().map(() => Array(width).fill('S'));
  },
  
  highlightCell: (cell, duration = 1000) => {
    if (cell) {
      cell.classList.add('tutorial-highlight');
      setTimeout(() => cell.classList.remove('tutorial-highlight'), duration);
    }
  },

  // Animation utilities
  createVisibilityObserver: (component, callback, selector, threshold = 0.7) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          component.isVisible = entry.isIntersecting;
          if (component.isVisible && !component.hasStartedAttacking) {
            console.log('Component is visible, starting sequence...');
            component.hasStartedAttacking = true;
            callback();
          }
        });
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: threshold
      }
    );

    requestAnimationFrame(() => {
      const elementToObserve = component.shadowRoot?.querySelector(selector);
      if (elementToObserve) {
        observer.observe(elementToObserve);
      } else {
        console.warn(`Element with selector "${selector}" not found for observation`);
      }
    });

    return observer;
  },

  animateFireball: (options) => {
    const {
      startElement,
      targetElement,
      onComplete,
      duration = 800,
      useDomElement = false,
      component = null,
      isEnemy = false
    } = options;

    if (!startElement || !targetElement) {
      console.warn('Required elements not found for fireball animation');
      return;
    }

    const startRect = startElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    let fireball;
    
    if (useDomElement) {
      fireball = document.createElement('div');
      fireball.className = 'fireball';
      fireball.textContent = '🔥';
      fireball.style.position = 'fixed';
      fireball.style.zIndex = '100';
      fireball.style.fontSize = '24px';
      fireball.style.transform = 'translate(-50%, -50%)';
      document.body.appendChild(fireball);
    } else {
      if (isEnemy) {
        component.animatingEnemyFireball = true;
        component.enemyFireballPosition = { x: startX, y: startY };
      } else {
        component.animatingFireball = true;
        component.fireballPosition = { x: startX, y: startY };
      }
      component.requestUpdate();
    }

    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = t => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      const currentX = startX + (endX - startX) * easedProgress;
      const currentY = startY + (endY - startY) * easedProgress;
      
      if (useDomElement) {
        fireball.style.left = `${currentX}px`;
        fireball.style.top = `${currentY}px`;
      } else {
        if (isEnemy) {
          component.enemyFireballPosition = { x: currentX, y: currentY };
        } else {
          component.fireballPosition = { x: currentX, y: currentY };
        }
        component.requestUpdate();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          if (useDomElement) {
            if (document.body.contains(fireball)) {
              document.body.removeChild(fireball);
            }
          } else {
            if (isEnemy) {
              component.animatingEnemyFireball = false;
            } else {
              component.animatingFireball = false;
            }
            component.requestUpdate();
          }
          
          if (onComplete) {
            onComplete();
          }
        }, 100);
      }
    };
    
    requestAnimationFrame(animate);
  },

  createAttackSequence: (component, maxAttacks, attackFn, delay = 2000) => {
    console.log('Starting attack sequence');
    for (let i = 0; i < maxAttacks; i++) {
      setTimeout(() => {
        if (component.isVisible) {
          attackFn(i);
        }
      }, delay * (i + 1));
    }
  }
};

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
        enemyFireballPosition: { type: Object },
        isVisible: { type: Boolean },
        hasStartedAttacking: { type: Boolean }
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
      this.isVisible = false;
      this.hasStartedAttacking = false;
      
      // Initialize boards
      this.playerBoard = Utils.createEmptyBoard(this.boardHeight, this.boardWidth);
      this.enemyBoard = Utils.createEmptyBoard(this.boardHeight, this.boardWidth);
      
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
      this.gameId = null;
      this.isPlayerTurn = true;
      this.gameEnded = false;

      // Call super if it exists
      if (super.connectedCallback) {
        try {
          super.connectedCallback();
        } catch (error) {
          console.warn('Error in parent connectedCallback, continuing with tutorial initialization:', error);
        }
      }

      // Add event listener for game reset
      window.addEventListener('game-reset', () => this.resetGame());
      this.requestUpdate();
    }

    // Override backend-related methods to be no-ops in tutorial mode
    async createGame() { return Promise.resolve({ gameId: null }); }
    async updateGame() { return Promise.resolve(); }
    async getGame() {
      return Promise.resolve({
        gameId: null,
        playerBoard: this.playerBoard,
        enemyBoard: this.enemyBoard,
        shipsPlaced: this.shipsPlaced,
        status: 'IN_PROGRESS',
        isPlayerTurn: this.isPlayerTurn
      });
    }
    async deleteGame() { return Promise.resolve(); }
    switchTurn() { return; }
    checkWin() { return false; }
    endGame() { return; }

    resetGame() {
      this.winner = null;
      this.gameEnded = false;
      this.playerBoard = Utils.createEmptyBoard(this.boardHeight, this.boardWidth);
      this.enemyBoard = Utils.createEmptyBoard(this.boardHeight, this.boardWidth);
      this.shipsPlaced = 0;
      this.message = '';
      this.instructionText = '';
      this.isPlayerTurn = true;
      this.requestUpdate();
    }

    // Fallback animation methods in case parent methods fail
    createExplosion(row, col, isEnemyBoard) {
      if (!this.shadowRoot) return;
      try { super.createExplosion?.(row, col, isEnemyBoard); 
      } catch (error) { console.warn('Error creating explosion effect:', error); }
    }

    createWaterSplash(row, col, isEnemyBoard) {
      if (!this.shadowRoot) return;
      try { super.createWaterSplash?.(row, col, isEnemyBoard);
      } catch (error) { console.warn('Error creating water splash effect:', error); }
    }

    static get styles() {
      return BaseStyles;
    }

    render() {
      return html`
        <div class="game-card">
          <div class="message">${this.message}</div>
          <div class="instruction-text">${this.instructionText}</div>
          
          <div class="boards-wrapper">
            <div class="board-section enemy-section">
              <div class="board-title">Enemy Board</div>
              <div class="board">
                ${Array(4).fill().map((_, col) => html`
                  <div class="cell
                       ${this.enemyBoard[0][col] === 'X' ? 'hit' : ''}
                       ${this.enemyBoard[0][col] === 'O' ? 'miss' : ''}
                       ${this.enemyBoard[0][col] === 'S' ? 'ship' : ''}"
                       @click="${() => this.handleEnemyCellClick(0, col)}">
                    ${this.enemyBoard[0][col] === 'X' ? '💥' : 
                      this.enemyBoard[0][col] === 'O' ? '💦' : ''}
                  </div>
                `)}
              </div>
            </div>
            
            <div class="board-section player-section">
              <div class="board-title">Player Board</div>
              <div class="board">
                ${Array(4).fill().map((_, col) => html`
                  <div class="cell
                       ${this.playerBoard[0][col] === 'X' ? 'player-ship-hit' : ''}
                       ${this.playerBoard[0][col] === 'S' ? 'ship' : ''}"
                       @click="${() => this.handlePlayerCellClick(0, col)}">
                    ${this.playerBoard[0][col] === 'X' ? '💀' : 
                      this.playerBoard[0][col] === 'S' ? '🚢' : ''}
                  </div>
                `)}
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
    }

    handlePlayerCellClick(row, col) {
      const cell = this.shadowRoot.querySelector(`.player-section .cell:nth-child(${col + 1})`);
      Utils.highlightCell(cell);
    }

    handleEnemyCellClick(row, col) {
      const cell = this.shadowRoot.querySelector(`.enemy-section .cell:nth-child(${col + 1})`);
      Utils.highlightCell(cell);
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
    }

    handlePlayerCellClick(row, col) {
      if (this.shipsPlaced >= this.maxShips) return;
      
      if (this.playerBoard[0][col] === '') {
        // Place a ship
        this.playerBoard[0][col] = 'S';
        this.shipsPlaced++;
        sounds.initAudioContext();
        sounds.HitPlayer();

        if (this.shipsPlaced === this.maxShips) {
          this.message = 'All ships placed!';
          this.instructionText = 'Great job! You\'ve placed all your ships.';
        } else {
          this.message = `Place ${this.maxShips - this.shipsPlaced} more ships!`;
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
    constructor() {
      super();
      this.message = 'Watch out! The enemy is attacking!';
      this.instructionText = 'The enemy will attack your ships.';
      // Initialize board with ships
      this.playerBoard = Utils.createShipBoard(1, 4);
      this.attackCount = 0;
      this.maxAttacks = 4;
      this.hasStartedAttacking = false;
      // Override turn-based properties
      this.isPlayerTurn = false;
    }

    firstUpdated() {
      super.firstUpdated?.();
      this.observer = Utils.createVisibilityObserver(
        this, 
        () => this.startAttackSequence(),
        '.board-section'
      );
    }

    startAttackSequence() {
      Utils.createAttackSequence(this, this.maxAttacks, (i) => this.performAttack(i));
    }

    async performAttack(position) {
      if (!this.isVisible) return;

      const col = position;
      const playerBoard = this.shadowRoot?.querySelector('.player-section .board');
      const enemyBoard = this.shadowRoot?.querySelector('.enemy-section .board');
      const cells = this.shadowRoot?.querySelectorAll('.player-section .cell');
      const targetCell = cells?.[col];

      if (!playerBoard || !enemyBoard || !targetCell) return;

      Utils.animateFireball({
        startElement: enemyBoard,
        targetElement: targetCell,
        component: this,
        isEnemy: true,
        useDomElement: false,
        duration: 1000,
        onComplete: () => {
          if (this.playerBoard[0][col] === 'S') {
            this.playerBoard[0][col] = 'X';
            this.instructionText = 'When the enemy hits your ship, it\'s marked with a skull.';
            sounds.initAudioContext();
            sounds.HitPlayer();
            
            try { this.createExplosion(0, col, false); 
            } catch (error) { console.warn('Error creating explosion effect:', error); }
          }
          this.requestUpdate();
        }
      });
    }

    handlePlayerCellClick(row, col) {
      const cell = this.shadowRoot?.querySelector(`.player-section .cell:nth-child(${col + 1})`);
      Utils.highlightCell(cell);
    }

    handleEnemyCellClick(row, col) {
      this.message = 'Wait for the enemy to finish attacking!';
      this.instructionText = 'The enemy is taking their turn.';
      setTimeout(() => {
        this.message = 'Watch out! The enemy is attacking!';
      }, 1000);
    }

    disconnectedCallback() {
      if (this.observer) {
        this.observer.disconnect();
      }
      super.disconnectedCallback?.();
    }

    static get styles() {
      return css`
        ${BaseStyles}
        
        .boards-wrapper.reversed {
          gap: 50px;
        }
        
        .large-instruction {
          font-size: 1.2em;
          margin: 20px 0;
          font-weight: bold;
        }
      `;
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
      // Initialize player board with ships
      this.playerBoard = Utils.createShipBoard(1, 4);
      this.enemyShipPositions = [0, 1, 2, 3]; // All positions have ships (hidden)
      this.hits = 0;
      this.maxHits = 4;
    }

    handleEnemyCellClick(row, col) {
      if (this.enemyBoard[0][col] === 'X' || this.enemyBoard[0][col] === 'O') return;
      
      const playerBoard = this.shadowRoot?.querySelector('.player-section .board');
      const enemyBoard = this.shadowRoot?.querySelector('.enemy-section .board');
      const targetCell = this.shadowRoot?.querySelectorAll('.enemy-section .cell')[col];

      if (!playerBoard || !enemyBoard || !targetCell) return;

      this.performPlayerAttack(col);
    }

    performPlayerAttack(col) {
      const playerBoard = this.shadowRoot?.querySelector('.player-board');
      const targetCell = this.shadowRoot?.querySelectorAll('.enemy-section .cell')[col];

      if (!playerBoard || !targetCell) return;

      Utils.animateFireball({
        startElement: playerBoard,
        targetElement: targetCell,
        useDomElement: true,
        duration: 800,
        onComplete: () => {
          // Mark cell as hit
          this.enemyBoard[0][col] = 'X';
          this.hits++;
          
          sounds.initAudioContext();
          sounds.HitEnemy();
          
          if (this.hits === this.maxHits) {
            this.message = 'Victory! You sunk all enemy ships!';
            this.instructionText = 'You\'ve completed the tutorial!';
            sounds.initAudioContext();
            sounds.Victory();
          } else {
            this.message = 'Hit! You sunk an enemy ship!';
            this.instructionText = `Great shot! Keep attacking to find all enemy ships. (${this.hits}/${this.maxHits})`;
          }
          
          this.requestUpdate();
        }
      });
    }

    handlePlayerCellClick(row, col) {
      const cell = this.shadowRoot?.querySelector(`.player-section .cell:nth-child(${col + 1})`);
      Utils.highlightCell(cell);
    }
  };

// Create and export the tutorial game board components
export const GameBoardOverview = GameBoardOverviewMixin(GameBoard);
export const ShipPlacementBoard = ShipPlacementMixin(GameBoard);
export const EnemyAttackBoard = EnemyAttackMixin(GameBoard);
export const PlayerAttackBoard = PlayerAttackMixin(GameBoard);

/**
 * Base class for custom battle boards that don't inherit from GameBoard
 */
export class CustomBattleBoard extends LitElement {
  static get properties() {
    return {
      enemyBoard: { type: Array },
      playerBoard: { type: Array },
      message: { type: String },
      instructionText: { type: String },
      isVisible: { type: Boolean },
      hasStartedAttacking: { type: Boolean },
      animatingFireball: { type: Boolean },
      fireballPosition: { type: Object },
      animatingEnemyFireball: { type: Boolean },
      enemyFireballPosition: { type: Object },
      hits: { type: Number },
      maxHits: { type: Number },
      enemyShipPositions: { type: Array },
      victoryMode: { type: Boolean }
    };
  }

  constructor() {
    super();
    // Fixed 4x1 board dimensions
    this.boardWidth = 4;
    this.boardHeight = 1;
    
    // Initialize boards
    this.enemyBoard = Utils.createEmptyBoard(this.boardHeight, this.boardWidth);
    this.playerBoard = Utils.createEmptyBoard(this.boardHeight, this.boardWidth);
    
    // Default state
    this.instructionText = '';
    this.message = '';
    this.isVisible = false;
    this.hasStartedAttacking = false;
    this.hits = 0;
    this.maxHits = 4;
    this.animatingFireball = false;
    this.fireballPosition = null;
    this.animatingEnemyFireball = false;
    this.enemyFireballPosition = null;
    this.enemyShipPositions = [];
    this.victoryMode = false;
  }

  render() {
    return html`
      <div class="game-card">
        <h2 class="title">${this.message}</h2>
        <p class="instruction">${this.instructionText}</p>
        
        <div class="boards-container">
          <div class="board-section enemy-section">
            <h3 class="board-title">Enemy Board</h3>
            <div class="board enemy-board">
              ${this.enemyBoard[0].map((cell, index) => html`
                <div class="cell ${cell === 'X' ? 'hit' : ''} ${cell === 'O' ? 'miss' : ''}"
                     data-position="${index}">
                  ${cell === 'X' ? '💥' : cell === 'O' ? '💦' : ''}
                </div>
              `)}
            </div>
          </div>
          
          <div class="board-section player-section">
            <h3 class="board-title">Player Board</h3>
            <div class="board player-board">
              ${this.playerBoard[0].map((cell, index) => html`
                <div class="cell ${cell === 'X' ? 'hit' : ''} ${cell === 'S' ? 'ship' : ''}"
                     data-position="${index}">
                  ${cell === 'X' ? '💀' : cell === 'S' ? '🚢' : ''}
                </div>
              `)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      ${BaseStyles}
      
      .boards-container {
        display: flex;
        flex-direction: column;
        gap: 50px;
        width: 100%;
      }
      
      .large-instruction {
        font-size: 1.2em;
        margin: 20px 0;
        font-weight: bold;
      }
      
      .title {
        font-size: 1.8em;
        margin-bottom: 15px;
        color: #3498db;
      }
      
      .boards-container.attack-mode {
        gap: 60px;
      }
      
      .cell.hit {
        background-color: var(--hit-color);
      }
      
      .cell.miss {
        background-color: var(--miss-color);
      }
      
      .enemy-board .cell {
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .enemy-board .cell:hover {
        background-color: #3a3a3a;
        transform: scale(1.05);
      }
      
      @keyframes explode-anim {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
      }
    `;
  }
}

/**
 * Enemy attack board with custom implementation
 */
export class CustomEnemyAttackBoard extends CustomBattleBoard {
  constructor() {
    super();
    this.instructionText = 'When the enemy hits your ship, it\'s marked with a skull.';
    this.playerBoard = Utils.createShipBoard(1, 4);
    this.attackCount = 0;
    this.maxAttacks = 4;
  }

  firstUpdated() {
    super.firstUpdated?.();
    this.observer = Utils.createVisibilityObserver(
      this, 
      () => this.startAttackSequence(),
      '.game-card'
    );
  }

  startAttackSequence() {
    Utils.createAttackSequence(this, this.maxAttacks, (i) => this.performAttack(i));
  }

  async performAttack(position) {
    if (!this.isVisible) return;

    const col = position;
    const enemyBoard = this.shadowRoot?.querySelector('.enemy-board');
    const playerBoard = this.shadowRoot?.querySelector('.player-board');
    const targetCell = playerBoard?.querySelectorAll('.cell')[col];

    if (!enemyBoard || !playerBoard || !targetCell) return;

    Utils.animateFireball({
      startElement: enemyBoard,
      targetElement: targetCell,
      useDomElement: true,
      duration: 1000,
      onComplete: () => {
        this.playerBoard[0][col] = 'X';
        this.instructionText = 'When the enemy hits your ship, it\'s marked with a skull.';
        sounds.initAudioContext();
        sounds.HitPlayer();
        this.requestUpdate();
      }
    });
  }

  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
    super.disconnectedCallback?.();
  }
}

/**
 * Player attack board with custom implementation - Interactive Demo
 */
export class CustomPlayerAttackBoard extends CustomBattleBoard {
  constructor() {
    super();
    this.message = 'Your Turn to Attack!';
    this.instructionText = 'Now it\'s your turn to attack the enemy\'s board. Try to find and sink their ships!';
    this.playerBoard = Utils.createShipBoard(1, 4);
    this.enemyShipPositions = [0, 1, 2, 3]; // All positions have ships (hidden)
    
    // Bind click handler for event listener
    this._boundCellClickHandler = this.handleEnemyCellClick.bind(this);
  }

  firstUpdated() {
    super.firstUpdated?.();
    
    // Add click handlers to enemy cells
    this.shadowRoot.querySelectorAll('.enemy-board .cell').forEach(cell => {
      cell.addEventListener('click', this._boundCellClickHandler);
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
    
    this.performPlayerAttack(col);
  }

  performPlayerAttack(col) {
    const playerBoard = this.shadowRoot?.querySelector('.player-board');
    const targetCell = this.shadowRoot?.querySelectorAll('.enemy-board .cell')[col];

    if (!playerBoard || !targetCell) return;

    Utils.animateFireball({
      startElement: playerBoard,
      targetElement: targetCell,
      useDomElement: true,
      duration: 800,
      onComplete: () => {
        this.enemyBoard[0][col] = 'X';
        this.hits++;
        
        sounds.initAudioContext();
        sounds.HitEnemy();
        
        if (this.hits === this.maxHits) {
          this.message = 'Victory! You sunk all enemy ships!';
          this.instructionText = 'You\'ve completed the tutorial!';
          this.victoryMode = true;
          sounds.initAudioContext();
          sounds.Victory();
        } else {
          this.message = 'Hit! You sunk an enemy ship!';
          this.instructionText = `Great shot! Keep attacking to find all enemy ships. (${this.hits}/${this.maxHits})`;
        }
        
        this.requestUpdate();
      }
    });
  }
  
  disconnectedCallback() {
    // Clean up any active fireball animations
    const fireballs = document.querySelectorAll('.fireball');
    fireballs.forEach(fireball => {
      if (document.body.contains(fireball)) {
        document.body.removeChild(fireball);
      }
    });
    
    // Remove event listeners
    if (this.shadowRoot) {
      const cells = this.shadowRoot.querySelectorAll('.enemy-board .cell');
      cells.forEach(cell => {
        cell.removeEventListener('click', this._boundCellClickHandler);
      });
    }
    
    super.disconnectedCallback?.();
  }
}

// Register all custom elements
customElements.define('game-board-overview', GameBoardOverview);
customElements.define('ship-placement-board', ShipPlacementBoard);
customElements.define('enemy-attack-board', EnemyAttackBoard);
customElements.define('player-attack-board', PlayerAttackBoard);
customElements.define('custom-battle-board', CustomBattleBoard);
customElements.define('custom-enemy-attack-board', CustomEnemyAttackBoard);
customElements.define('custom-player-attack-board', CustomPlayerAttackBoard); 