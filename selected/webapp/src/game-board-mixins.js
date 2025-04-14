import { css, html } from 'lit';
import { GameBoard } from './game-board.js';
import { sounds } from './sounds.js';

/**
 * Tutorial base mixin that provides common functionality for all tutorial boards
 */
const TutorialMixin = (Base) => class extends Base {
  static get properties() {
    return {
      ...super.properties,
      tutorial: { type: Boolean },
      tutorialStep: { type: Number },
      fireballPosition: { type: Object, state: true },
      enemyFireballPosition: { type: Object, state: true },
      animatingFireball: { type: Boolean, state: true },
      animatingEnemyFireball: { type: Boolean, state: true }
    };
  }

  constructor() {
    super();
    this.tutorial = true;
    this.tutorialStep = 0;
    this.boardSize = 4;
    this.fireballPosition = null;
    this.enemyFireballPosition = null;
    this.animatingFireball = false;
    this.animatingEnemyFireball = false;
    
    this.playerBoard = Array(1).fill().map(() => Array(4).fill(''));
    this.enemyBoard = Array(1).fill().map(() => Array(4).fill(''));
    
    this.gameId = 'tutorial';
    
    this._disableAI = true;

    // ensure real game data is not affected by tutorial
    this._originalGameId = localStorage.getItem('gameId');
    localStorage.removeItem('gameId');
  }

  // override websocket initialization to prevent tutorial from opening WebSockets with a mock websocket and responses
  initWebSocket() {
    console.log('Tutorial mode - WebSocket initialization prevented');
    this.websocket = {
      readyState: 1,
      send: (msg) => console.log('Tutorial mode - WebSocket send prevented:', msg),
      close: () => console.log('Tutorial mode - WebSocket close prevented'),
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('websocket-connected'));
    }, 50);
    
    return false;
  }
  
  waitForWebSocketConnection() {
    return Promise.resolve();
  }

  // override game state methods to avoid real server interaction
  async createGame() { return { gameId: 'tutorial' }; }
  async updateGame() { return; }
  async getGame() { return; }
  async deleteGame() { return; }
  async saveGameEventToEventBus() { return; }
  async updateGameWithEvent() { return; }
  async loadGameState() { return; }
  async createSessionRecord() { return; }
  placeEnemyShips() { return; }
  enemyMove() { return; }
  _saveLocalGameStateCopy() { return; }
  
  // clean up when the tutorial component is removed
  disconnectedCallback() {
    if (super.disconnectedCallback) {
      super.disconnectedCallback();
    }

    if (this._originalGameId) {
      localStorage.setItem('gameId', this._originalGameId);
    }
    
    if (this._tutorialInterval) {
      clearInterval(this._tutorialInterval);
    }
  }

  highlightCell(cell, duration = 1000) {
    if (!cell) return;
    cell.classList.add('tutorial-highlight');
    setTimeout(() => cell.classList.remove('tutorial-highlight'), duration);
  }

  animateFireball(sourceSelector, targetSelector, onComplete, duration = 800) {
    const sourceCell = this.shadowRoot?.querySelector(sourceSelector);
    const targetCell = this.shadowRoot?.querySelector(targetSelector);
    
    if (!sourceCell || !targetCell) {
      onComplete?.();
      return;
    }
    
    const sourceRect = sourceCell.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();
    const containerRect = this.shadowRoot.querySelector('.board-container').getBoundingClientRect();
    
    const startX = sourceRect.left + sourceRect.width/2 - containerRect.left;
    const startY = sourceRect.top + sourceRect.height/2 - containerRect.top;
    
    const endX = targetRect.left + targetRect.width/2 - containerRect.left;
    const endY = targetRect.top + targetRect.height/2 - containerRect.top;
    
    const isPlayerAttacking = sourceSelector.includes('player-board');
    
    if (isPlayerAttacking) {
      this.animatingFireball = true;
      this.fireballPosition = { x: startX, y: startY };
    } else {
      this.animatingEnemyFireball = true;
      this.enemyFireballPosition = { x: startX, y: startY };
    }
    
    this.requestUpdate();
    
    const startTime = performance.now();
    
    const animate = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easedProgress = progress * (2 - progress);
      
      const currentX = startX + (endX - startX) * easedProgress;
      const currentY = startY + (endY - startY) * easedProgress;
      
      if (isPlayerAttacking) {
        this.fireballPosition = { x: currentX, y: currentY };
      } else {
        this.enemyFireballPosition = { x: currentX, y: currentY };
      }
      
      this.requestUpdate();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          if (isPlayerAttacking) {
            this.animatingFireball = false;
          } else {
            this.animatingEnemyFireball = false;
          }
          this.requestUpdate();
          onComplete?.();
        }, 100);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  static get styles() {
    return [
      super.styles || css``,
      TutorialStyles
    ];
  }

  render() {
    return html`
      <div class="tutorial-card">
        <div class="message">${this.message}</div>
        <div class="instruction-text">${this.instructionText}</div>
        
        <div class="board-container">
          ${this.animatingFireball ? html`
            <div class="fireball" style="left: ${this.fireballPosition.x}px; top: ${this.fireballPosition.y}px;">🔥</div>
          ` : ''}
          
          ${this.animatingEnemyFireball ? html`
            <div class="enemy-fireball" style="left: ${this.enemyFireballPosition.x}px; top: ${this.enemyFireballPosition.y}px;">🔥</div>
          ` : ''}
          
          <div>
            <div class="board-title">Enemy Board</div>
            <div class="board enemy-board">
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
          
          <div>
            <div class="board-title">Player Board</div>
            <div class="board player-board">
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
 * Ship Placement Tutorial
 */
export class ShipPlacementBoard extends TutorialMixin(GameBoard) {
  constructor() {
    super();
    this.message = 'Click on the player board cells to place your ships!';
    this.instructionText = 'Click on your board to place your ships.';
    this.shipsPlaced = 0;
  }

  handlePlayerCellClick(row, col) {
    if (this.shipsPlaced >= this.boardSize) return;
    
    if (this.playerBoard[0][col] === '') {
      this.playerBoard[0][col] = 'S';
      this.shipsPlaced++;
      sounds.initAudioContext();
      sounds.HitPlayer();

      const remainingShips = this.boardSize - this.shipsPlaced;
      const allPlaced = remainingShips === 0;
      
      this.message = allPlaced ? 'All ships placed!' : `Place ${remainingShips} more ships!`;
      this.instructionText = allPlaced ? 'Great job! You\'ve placed all your ships.' : 'Click on your board to place your ships.';
      
      this.requestUpdate();
    } else {
      this.message = 'You already placed a ship here!';
      this.instructionText = 'Choose an empty cell to place your ship.';
      
      setTimeout(() => {
        this.message = `Place ${this.boardSize - this.shipsPlaced} more ships!`;
        this.instructionText = 'Click on your board to place your ships.';
        this.requestUpdate();
      }, 1000);
    }
  }

  handleEnemyCellClick(row, col) {
    this.message = 'Place your ships first!';
    this.instructionText = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
    
    setTimeout(() => {
      if (this.shipsPlaced < this.boardSize) {
        this.message = `Place ${this.boardSize - this.shipsPlaced} more ships!`;
        this.instructionText = 'Click on your board to place your ships.';
        this.requestUpdate();
      }
    }, 1000);
  }
}

/**
 * Enemy Attack Tutorial
 */
export class EnemyAttackBoard extends TutorialMixin(GameBoard) {
  constructor() {
    super();
    this.message = 'Enemy is attacking now!';
    this.instructionText = '';
    
    this.playerBoard = Array(1).fill().map(() => Array(4).fill('S'));
    this.isPlayerTurn = false;
    this.attacksStarted = false;
    this.observer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.7 && !this.attacksStarted) {
          this.attacksStarted = true;
          this.startEnemyAttacks();
          this.observer.disconnect();
        }
      });
    }, {
      threshold: [0.7] // Only trigger when 70% visible
    });
    
    setTimeout(() => {
      const boardContainer = this.shadowRoot.querySelector('.board-container');
      if (boardContainer) {
        this.observer.observe(boardContainer);
      }
    }, 100);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  startEnemyAttacks() {
    this.message = 'Enemy is attacking now!';
    this.instructionText = '';
    this.requestUpdate();
    
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.performEnemyAttack(i), 1500 * (i + 1));
    }
  }

  performEnemyAttack(col) {
    const enemyCellSelector = `.enemy-board .cell:nth-child(${Math.floor(Math.random() * 4) + 1})`;
    const playerCellSelector = `.player-board .cell:nth-child(${col + 1})`;
    
    this.animateFireball(enemyCellSelector, playerCellSelector, () => {
      this.playerBoard[0][col] = 'X';
      this.instructionText = '';
      sounds.initAudioContext();
      sounds.HitPlayer();
      this.requestUpdate();
    });
  }

  handleEnemyCellClick(row, col) {
    this.message = 'Enemy is attacking now!';
    this.instructionText = '';
  }
}

/**
 * Player Attack Tutorial
 */
export class PlayerAttackBoard extends TutorialMixin(GameBoard) {
  constructor() {
    super();
    this.message = 'Click on enemy cells to attack';
    this.instructionText = 'Click on the enemy\'s board to attack.';
    
    this.playerBoard = Array(1).fill().map(() => Array(4).fill('S'));
    this.hits = 0;
    this.isPlayerTurn = true;
    
    this.shipsPlaced = this.boardSize;
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.message = 'Click on enemy cells to attack';
    this.instructionText = 'Click on the enemy\'s board to attack.';
  }

  handleEnemyCellClick(row, col) {
    if (this.enemyBoard[0][col] === 'X') return;
    
    const playerCellSelector = `.player-board .cell:nth-child(${Math.floor(Math.random() * 4) + 1})`;
    const enemyCellSelector = `.enemy-board .cell:nth-child(${col + 1})`;
    
    this.animateFireball(playerCellSelector, enemyCellSelector, () => {
      this.enemyBoard[0][col] = 'X';
      this.hits++;
      
      sounds.initAudioContext();
      sounds.HitEnemy();
      
      if (this.hits === 4) {
        this.message = 'Victory! You sunk all enemy ships!';
        this.instructionText = 'You\'ve completed the tutorial!';
        sounds.Victory();
      } else {
        this.message = 'Hit! You sunk an enemy ship!';
        this.instructionText = `Great shot! Keep attacking to find all enemy ships. (${this.hits}/4)`;
      }
      
      this.requestUpdate();
    });
  }

  handlePlayerCellClick(row, col) {
    const cell = this.shadowRoot?.querySelector(`.player-board .cell:nth-child(${col + 1})`);
    this.highlightCell(cell);
  }
}

const TutorialStyles = css`
  :host {
    --board-size: 4;
    --board-width: 340px;
    --ship-color: rgba(52, 152, 219, 0.7);
    --hit-color: rgba(46, 204, 113, 0.7);
    --miss-color: rgba(231, 76, 60, 0.7);
    --player-hit-color: rgba(231, 76, 60, 0.7);
    display: block;
    width: 100%;
  }

  .tutorial-card {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    text-align: center;
    padding: 20px 0;
  }

  .board-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    margin: 20px 0;
    position: relative;
  }

  .board-title {
    font-size: 24px;
    color: #3498db;
    margin-bottom: 15px;
    font-weight: 500;
  }

  .board {
    width: var(--board-width);
    height: 80px;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background-color: #1a1a1a;
    padding: 8px;
    border-radius: 8px;
    gap: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .cell {
    width: calc((var(--board-width) - 120px) / 4);
    height: 64px;
    background-color: #2c3e50;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 28px;
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
    background-color: var(--player-hit-color);
  }

  .message {
    font-size: 28px;
    color: white;
    margin-bottom: 16px;
    font-weight: 500;
  }

  .instruction-text {
    font-size: 22px;
    color: #bdc3c7;
    margin-bottom: 24px;
  }

  .tutorial-highlight { 
    animation: pulse 2s infinite; 
    box-shadow: 0 0 15px rgba(52, 152, 219, 0.8);
  }

  /* Fireball styles matching game-board.js */
  .fireball, .enemy-fireball {
    position: absolute;
    font-size: 2.5em;
    z-index: 100;
    pointer-events: none;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 0 15px rgba(255, 100, 0, 0.8));
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
  }

  .fireball {
    animation: pulse-fire 0.3s infinite alternate, rotate-clockwise 0.8s infinite linear;
  }

  .enemy-fireball {
    animation: pulse-fire 0.3s infinite alternate, rotate-counterclockwise 0.8s infinite linear;
  }

  @keyframes pulse-fire {
    0% { transform: translate(-50%, -50%) scale(0.9); }
    100% { transform: translate(-50%, -50%) scale(1.1); }
  }

  @keyframes rotate-clockwise {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }

  @keyframes rotate-counterclockwise {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(-360deg); }
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }

  @media (max-width: 768px) {
    :host { --board-width: 300px; }
    .message { font-size: 24px; }
    .instruction-text { font-size: 20px; }
    .board { height: 70px; }
    .cell { height: 54px; }
  }

  @media (max-width: 480px) {
    :host { --board-width: 260px; }
    .cell { font-size: 22px; height: 45px; }
    .board { height: 61px; }
    .message { font-size: 22px; }
    .instruction-text { font-size: 18px; }
  }
`;

customElements.define('ship-placement-board', ShipPlacementBoard);
customElements.define('enemy-attack-board', EnemyAttackBoard);
customElements.define('player-attack-board', PlayerAttackBoard); 