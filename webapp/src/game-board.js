import { LitElement, html, css } from 'lit';
import { sounds } from './sounds.js';
import { EnemyAI } from './enemy-ai.js';

export class GameBoard extends LitElement {
  static get properties() {
    return {
      playerBoard: { type: Array },
      enemyBoard: { type: Array },
      isPlayerTurn: { type: Boolean },
      message: { type: String },
      winner: { type: String },
      gameEnded: { type: Boolean },
      shipsPlaced: { type: Number },
      lastHitPosition: { type: Object },
      lastEnemyHitPosition: { type: Object },
      hitResult: { type: String },
      enemyHitResult: { type: String },
      animatingFireball: { type: Boolean },
      fireballPosition: { type: Object },
      animatingEnemyFireball: { type: Boolean },
      enemyFireballPosition: { type: Object },
      instructionText: { type: String },
      playerShipPositions: { type: Array },
      enemyShipPositions: { type: Array }
    };
  }

  constructor() {
    super();
    // Define board size - can be adjusted for different difficulty levels
    this.boardSize = 4;
    
    // Initialize boards with the defined size
    this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    
    // Instantiate the enemy AI
    this.enemyAI = new EnemyAI(this.boardSize);
    
    // Game state
    this.isPlayerTurn = true;
    this.gameEnded = false;
    this.winner = null;
    this.message = `Place your ships! Click on your board to place ${this.boardSize} ships.`;
    this.instructionText = `Tap on Player Board ${this.boardSize} times`;
    this.shipsPlaced = 0;
    
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
    
    // Initialize ship positions
    this.playerShipPositions = [];
    this.enemyShipPositions = [];
    
    // Place enemy ships randomly
    this.placeEnemyShips();
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
    return html`
    <div class="game-container">
      <div class="game-card">
        <div class="message">${this.message}</div>
        <div class="instruction-text">${this.instructionText}</div>
        
        <div class="boards-wrapper">
          <div class="board-section enemy-section">
            <div class="board-title">Enemy Board</div>
            <div class="board">
              ${this.enemyBoard.map((row, rowIndex) => html`
                <div class="row">
                  ${row.map((cell, colIndex) => html`
                      <div class="cell 
                           ${cell === 'X' ? 'hit' : cell === 'O' ? 'miss' : ''} 
                           ${this.lastHitPosition && this.lastHitPosition.row === rowIndex && this.lastHitPosition.col === colIndex ? 
                              (this.hitResult === 'hit' ? 'hit-animation' : 'miss-animation') : ''}"
                           @click="${() => this.handleEnemyCellClick(rowIndex, colIndex)}">
                        ${cell === 'X' ? '💥' : cell === 'O' ? '💦' : ''}
                      </div>
                    `)}
                </div>
              `)}
            </div>
          </div>
          
          <div class="board-section player-section">
            <div class="board-title">Player Board</div>
            <div class="board">
              ${this.playerBoard.map((row, rowIndex) => html`
                <div class="row">
                  ${row.map((cell, colIndex) => html`
                      <div class="cell 
                           ${cell === 'X' ? 'player-ship-hit' : ''} 
                           ${cell === 'S' ? 'ship' : ''}"
                           @click="${() => this.handlePlayerCellClick(rowIndex, colIndex)}">
                        ${cell === 'X' ? '💀' : cell === 'S' ? '🚢' : ''}
                      </div> 
                    `)}
                </div>
              `)}
            </div>
          </div>
        </div>
        
        ${this.winner ? html`
          <div class="winner-message">
            ${this.winner === 'Player' ? 'You win! 🎉' : 'Enemy wins! 😢'}
          </div>
        ` : ''}
        
        ${this.animatingFireball ? html`
          <div class="fireball" style="left: ${this.fireballPosition.x}px; top: ${this.fireballPosition.y}px;">🔥</div>
        ` : ''}
        
        ${this.animatingEnemyFireball ? html`
          <div class="enemy-fireball" style="left: ${this.enemyFireballPosition.x}px; top: ${this.enemyFireballPosition.y}px;">🔥</div>
        ` : ''}
      </div>
    </div>
    `;
  }

  checkWin(board) {
    // Check if all ships ('S') have been hit ('X')
    return board.every(row => row.every(cell => cell !== 'S'));
  }

  handleEnemyCellClick(row, col) {
    // If game is ended or not player's turn, do nothing
    if (this.gameEnded) return;
    
    // If player hasn't placed all ships yet, show a message
    if (this.shipsPlaced < this.boardSize) {
      this.message = `Place all ${this.boardSize} ships first!`;
      this.requestUpdate();
      return;
    }
    
    // If it's not the player's turn, show a message
    if (!this.isPlayerTurn) {
      this.message = "It's not your turn yet!";
      this.requestUpdate();
      return;
    }
    
    // Check if the cell has already been hit or missed
    if (this.enemyBoard[row][col] === 'X' || this.enemyBoard[row][col] === 'O') {
      this.message = 'You already tried that spot!';
      this.requestUpdate();
      return;
    }
    
    // Start the fireball animation
    this.startFireballAnimation(row, col);
    
    // Delay the actual hit logic until animation completes
    setTimeout(() => {
      console.log(`Player attacks: ${row}, ${col}`);
      
      // Set the last hit position for visual indicator
      this.lastHitPosition = { row, col };
      
      // Check if it's a hit or miss
      if (this.enemyBoard[row][col] === 'S') {
        console.log('Hit!');
        this.hitResult = 'hit';
        
        // sounds.js 
        sounds.initAudioContext(); // ensure the audio context is initialized
        sounds.HitEnemy();

        this.enemyBoard[row][col] = 'X'; // Mark hit
        
        // Create explosion animation
        this.createExplosion(row, col, true);
        
        // Check if all enemy ships are hit
        const allHit = this.enemyShipPositions.every(pos => {
          const { row, col } = pos;
          return this.enemyBoard[row][col] === 'X';
        });
        
        if (allHit) {
          console.log('Player wins!');
          this.endGame('Player');
          return; // Stop further actions
        }
      } else {
        console.log('Miss!');
        this.hitResult = 'miss';
        this.enemyBoard[row][col] = 'O'; // Mark miss
        this.createWaterSplash(row, col, true);
      }
      
      this.requestUpdate(); // Ensure the component re-renders
      
      // Clear the hit animation after a delay
      setTimeout(() => {
        this.lastHitPosition = null;
        this.hitResult = null;
        this.requestUpdate();
        
        this.switchTurn();
        this.enemyMove();
      }, 1000);
    }, 800); // Time for fireball to reach target
  }
  
  handlePlayerCellClick(row, col) {
    console.log(`Player clicked: ${row}, ${col}`);
    
    // If game is ended, do nothing
    if (this.gameEnded) return;
    
    // If we're still in the ship placement phase
    if (this.shipsPlaced < this.boardSize) {
      // Check if this cell already has a ship
      if (this.playerBoard[row][col] === 'S') {
        this.message = "You already placed a ship here!";
        this.requestUpdate();
        return;
      }
      
      // Place the ship
      this.playerBoard[row][col] = 'S';
      this.playerShipPositions.push({ row, col });
      this.shipsPlaced++;
      
      // Update the message
      if (this.shipsPlaced < this.boardSize) {
        this.message = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
      } else {
        this.message = "All ships placed! Click on the enemy board to attack.";
        // Start the game with player's turn
        this.isPlayerTurn = true;
      }
      
      this.requestUpdate();
      return;
    }
    
    // If all ships are already placed and the game has started
    if (this.shipsPlaced >= this.boardSize) {
      if (this.isPlayerTurn) {
        this.message = "Attack the enemy board!";
      } else {
        this.message = "It's the enemy's turn! Please wait.";
      }
      this.requestUpdate();
    }
  }

  startFireballAnimation(targetRow, targetCol) {
    // Get the positions of the player board and enemy board
    const playerBoard = this.shadowRoot.querySelector('.player-section .board');
    const enemyBoard = this.shadowRoot.querySelector('.enemy-section .board');
    const targetCell = enemyBoard.querySelectorAll('.cell')[targetRow * this.boardSize + targetCol];
    
    if (!playerBoard || !enemyBoard || !targetCell) {
      console.error('Could not find elements for animation');
      return;
    }
    
    // Get the positions
    const playerRect = playerBoard.getBoundingClientRect();
    const targetRect = targetCell.getBoundingClientRect();
    
    // Calculate start and end positions
    const startX = playerRect.left + playerRect.width / 2;
    const startY = playerRect.top + playerRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;
    
    // Start animation
    this.animatingFireball = true;
    this.fireballPosition = { 
      x: startX, 
      y: startY 
    };
    
    // Force a synchronous update to prevent layout shifts
    this.requestUpdate();
    
    // Animate the fireball
    const animationDuration = 800; // ms
    const startTime = performance.now();
    
    const animateFireball = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Calculate current position using easing function
      const easeOutQuad = t => t * (2 - t); // Acceleration then deceleration
      const easedProgress = easeOutQuad(progress);
      
      this.fireballPosition = {
        x: startX + (endX - startX) * easedProgress,
        y: startY + (endY - startY) * easedProgress
      };
      
      this.requestUpdate();
      
      if (progress < 1) {
        requestAnimationFrame(animateFireball);
      } else {
        // End animation
        setTimeout(() => {
          this.animatingFireball = false;
          this.requestUpdate();
        }, 100);
      }
    };
    
    requestAnimationFrame(animateFireball);
  }

  enemyMove() {
    if (this.gameEnded || this.isPlayerTurn) return;
    
    // Add a timeout for the enemy's move
    setTimeout(() => {
      const move = this.enemyAI.attack(this.playerBoard);
      if (move) {
        const { row, col } = move;
        
        // Start the enemy fireball animation
        this.startEnemyFireballAnimation(row, col);
        
        // Delay the actual hit logic until animation completes
        setTimeout(() => {
          // Set the last hit position for visual indicator
          this.lastEnemyHitPosition = { row, col };
          
          if (this.playerBoard[row][col] === 'S') {
            console.log('Enemy hit player ship!');
            this.enemyHitResult = 'hit';
            
            // sounds.js 
            sounds.initAudioContext(); // ensure the audio context is initialized
            sounds.HitPlayer();
            
            this.playerBoard[row][col] = 'X'; // Mark hit
            
            // Create explosion animation
            this.createExplosion(row, col, false);
            
            // Check if all player ships are hit
            const allHit = this.playerShipPositions.every(pos => {
              const { row, col } = pos;
              return this.playerBoard[row][col] === 'X';
            });
            
            if (allHit) {
              console.log('Enemy wins!');
              this.endGame('Enemy');
              return; // Stop further actions
            }
          } else {
            console.log('Enemy missed!');
            this.enemyHitResult = 'miss';
            this.playerBoard[row][col] = 'O'; // Mark miss
            this.createWaterSplash(row, col, false);
          }
          
          this.requestUpdate(); // Ensure the component re-renders
          
          // Clear the hit animation after a delay
          setTimeout(() => {
            this.lastEnemyHitPosition = null;
            this.enemyHitResult = null;
            this.requestUpdate();
            
            this.switchTurn();
          }, 1000);
        }, 800); // Time for fireball to reach target
      }
    }, 1000); // Delay before enemy moves
  }

  // Start the enemy fireball animation from enemy board to player board
  startEnemyFireballAnimation(targetRow, targetCol) {
    // Get the positions of the player board and enemy board
    const playerBoard = this.shadowRoot.querySelector('.player-section .board');
    const enemyBoard = this.shadowRoot.querySelector('.enemy-section .board');
    const targetCell = playerBoard.querySelectorAll('.cell')[targetRow * this.boardSize + targetCol];
    
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
    this.enemyFireballPosition = { 
      x: startX, 
      y: startY 
    };
    
    // Force a synchronous update to prevent layout shifts
    this.requestUpdate();
    
    // Animate the fireball
    const animationDuration = 800; // ms
    const startTime = performance.now();
    
    const animateEnemyFireball = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Calculate current position using easing function
      const easeOutQuad = t => t * (2 - t); // Acceleration then deceleration
      const easedProgress = easeOutQuad(progress);
      
      this.enemyFireballPosition = {
        x: startX + (endX - startX) * easedProgress,
        y: startY + (endY - startY) * easedProgress
      };
      
      this.requestUpdate();
      
      if (progress < 1) {
        requestAnimationFrame(animateEnemyFireball);
      } else {
        // End animation
        setTimeout(() => {
          this.animatingEnemyFireball = false;
          this.requestUpdate();
        }, 100);
      }
    };
    
    requestAnimationFrame(animateEnemyFireball);
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

  placeEnemyShips() {
    const shipCount = this.boardSize; // Number of ships equals board size
    this.enemyShipPositions = [];
    
    for (let i = 0; i < shipCount; i++) {
      let placed = false;
      
      while (!placed) {
        const row = Math.floor(Math.random() * this.boardSize);
        const col = Math.floor(Math.random() * this.boardSize);
        
        // Check if position is empty
        if (!this.enemyShipPositions.some(pos => pos.row === row && pos.col === col)) {
          this.enemyShipPositions.push({ row, col });
          // Mark enemy ships on the board with 'S' (internal representation only)
          this.enemyBoard[row][col] = 'S';
          placed = true;
        }
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
    console.log("Resetting game...");
    
    // Reset game state
    this.winner = '';
    this.gameEnded = false;
    
    // Reset boards
    this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    
    // Reset ship placement
    this.shipsPlaced = 0;
    
    // Reset messages
    this.message = `Place ${this.boardSize} ships on your board`;
    this.instructionText = `Tap on Player Board ${this.boardSize} times`;
    
    // Reset turn state
    this.isPlayerTurn = false;
    
    // Reset animation properties
    this.animatingFireball = false;
    this.fireballPosition = null;
    this.lastHitPosition = null;
    this.hitResult = null;
    this.lastEnemyHitPosition = null;
    this.enemyHitResult = null;
    this.animatingEnemyFireball = false;
    this.enemyFireballPosition = null;
    
    // Place new enemy ships
    this.placeEnemyShips();
    
    // Force update
    this.requestUpdate();
  }

  firstUpdated() {
    // Set CSS variables based on board size
    this.style.setProperty('--board-size', this.boardSize);
    
    // Calculate and set the optimal board size based on viewport
    this.updateBoardSizes();
    
    // Add resize listener to adjust board sizes when window is resized
    window.addEventListener('resize', this.updateBoardSizes.bind(this));
  }
  
  // Update board sizes based on viewport dimensions
  updateBoardSizes() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    
    // Determine if we're in landscape or portrait mode
    const isLandscape = vw > vh;
    
    // Calculate card width - larger to use more space
    const cardWidth = Math.min(vw * 0.95, isLandscape ? 600 : 650);
    this.style.setProperty('--card-width', `${cardWidth}px`);
    
    // Calculate available height (accounting for padding, etc.)
    // Use more of the available height
    const availableHeight = vh * 0.85;
    
    if (isLandscape) {
      // In landscape, make boards larger
      const boardSize = Math.min(cardWidth * 0.7, availableHeight * 0.4);
      this.style.setProperty('--board-max-width', `${boardSize}px`);
      this.style.setProperty('--board-height', `${boardSize}px`);
    } else {
      // In portrait, make boards larger but ensure they're square
      // Each board gets about 35% of available height
      const boardSize = Math.min(cardWidth * 0.9, availableHeight * 0.35);
      this.style.setProperty('--board-max-width', `${boardSize}px`);
      this.style.setProperty('--board-height', `${boardSize}px`);
    }
    
    // Adjust font size based on board size
    const fontSize = isLandscape ? 
      Math.max(0.9, Math.min(1.3, cardWidth / 600)) : 
      Math.max(0.8, Math.min(1.2, cardWidth / 400));
    
    this.style.setProperty('--cell-font-size', `${fontSize}em`);
    
    // Force layout recalculation
    this.requestUpdate();
  }

  createWaterSplash(row, col, isEnemyBoard) {
    const board = isEnemyBoard ? this.shadowRoot.querySelector('.enemy-section .board') : this.shadowRoot.querySelector('.player-section .board');
    if (!board) return;
    
    // Get the position of the cell
    const cell = board.querySelectorAll('.row')[row].querySelectorAll('.cell')[col];
    const rect = cell.getBoundingClientRect();
    
    // Create a container for the splash effects
    const splashContainer = document.createElement('div');
    splashContainer.className = 'splash-container';
    splashContainer.style.position = 'fixed';
    splashContainer.style.left = '0';
    splashContainer.style.top = '0';
    splashContainer.style.width = '100%';
    splashContainer.style.height = '100%';
    splashContainer.style.pointerEvents = 'none';
    splashContainer.style.zIndex = '1000';
    this.shadowRoot.appendChild(splashContainer);
    
    // Center point of the cell
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;
    
    // Create water droplets with evenly distributed directions
    const dropletCount = 8; // Exactly 8 droplets
    const dropletEmojis = ['💧', '💦', '🌊']; // Water emojis
    
    // Create droplets in a radial pattern (evenly spaced around a circle)
    for (let i = 0; i < dropletCount; i++) {
      const droplet = document.createElement('div');
      droplet.className = 'water-droplet';
      
      // Randomly select one of the water emojis
      const randomEmoji = dropletEmojis[Math.floor(Math.random() * dropletEmojis.length)];
      droplet.textContent = randomEmoji;
      
      // Calculate angle for even distribution around a circle (360 degrees)
      const angle = (i / dropletCount) * Math.PI * 2;
      const distance = 60; // Fixed distance for all droplets
      
      // Calculate end position
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;
      
      // Position at center of cell
      droplet.style.position = 'absolute';
      droplet.style.left = `${centerX}px`;
      droplet.style.top = `${centerY}px`;
      droplet.style.transform = 'translate(-50%, -50%)';
      
      // Animation
      droplet.animate([
        { // starting position
          transform: 'translate(-50%, -50%) scale(0.2)',
          opacity: 0
        },
        { // visible state
          transform: 'translate(-50%, -50%) scale(1.0)',
          opacity: 1,
          offset: 0.2
        },
        { // end position
          transform: `translate(calc(${endX}px - ${centerX}px), calc(${endY}px - ${centerY}px)) scale(0.5)`,
          opacity: 0
        }
      ], {
        duration: 800 + Math.random() * 200,
        easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
        fill: 'forwards'
      });
      
      // Add to container
      splashContainer.appendChild(droplet);
    }
    
    // Add a central splash
    const splash = document.createElement('div');
    splash.className = 'water-splash-center';
    splash.textContent = '💦';
    splash.style.position = 'absolute';
    splash.style.left = `${centerX}px`;
    splash.style.top = `${centerY}px`;
    splash.style.transform = 'translate(-50%, -50%)';
    
    // Animate the central splash
    splash.animate([
      { // starting position
        transform: 'translate(-50%, -50%) scale(0.1)',
        opacity: 0
      },
      { // visible state
        transform: 'translate(-50%, -50%) scale(1.0)',
        opacity: 1,
        offset: 0.2
      },
      { // expanded state
        transform: 'translate(-50%, -50%) scale(2.0)',
        opacity: 0.8,
        offset: 0.5
      },
      { // end position
        transform: 'translate(-50%, -50%) scale(0.5)',
        opacity: 0
      }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
      fill: 'forwards'
    });
    
    // Add to container
    splashContainer.appendChild(splash);
    
    // Remove splash container after all animations complete
    setTimeout(() => {
      if (this.shadowRoot.contains(splashContainer)) {
        this.shadowRoot.removeChild(splashContainer);
      }
    }, 1200);
  }

  createExplosion(row, col, isEnemyBoard) {
    const board = isEnemyBoard ? this.shadowRoot.querySelector('.enemy-section .board') : this.shadowRoot.querySelector('.player-section .board');
    if (!board) return;
    
    // Get the position of the cell
    const cell = board.querySelectorAll('.row')[row].querySelectorAll('.cell')[col];
    const rect = cell.getBoundingClientRect();
    
    // Create a container for the explosion effects
    const explosionContainer = document.createElement('div');
    explosionContainer.className = 'explosion-container';
    explosionContainer.style.position = 'fixed';
    explosionContainer.style.left = '0';
    explosionContainer.style.top = '0';
    explosionContainer.style.width = '100%';
    explosionContainer.style.height = '100%';
    explosionContainer.style.pointerEvents = 'none';
    explosionContainer.style.zIndex = '1000';
    this.shadowRoot.appendChild(explosionContainer);
    
    // Center point of the cell
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;
    
    // Create explosion particles with evenly distributed directions
    const particleCount = 16; // Exactly 16 particles
    const particleEmojis = ['✨', '💥', '🔥']; // Explosion emojis
    
    // Create particles in a radial pattern (evenly spaced around a circle)
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'explosion-particle';
      
      // Randomly select one of the explosion emojis
      const randomEmoji = particleEmojis[Math.floor(Math.random() * particleEmojis.length)];
      particle.textContent = randomEmoji;
      
      // Calculate angle for even distribution around a circle (360 degrees)
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 80; // Fixed distance for all particles
      
      // Calculate end position
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;
      
      // Position at center of cell
      particle.style.position = 'absolute';
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.transform = 'translate(-50%, -50%)';
      
      // Animation
      particle.animate([
        { // starting position
          transform: 'translate(-50%, -50%) scale(0.2)',
          opacity: 0
        },
        { // visible state
          transform: 'translate(-50%, -50%) scale(1.0)',
          opacity: 1,
          offset: 0.2
        },
        { // end position
          transform: `translate(calc(${endX}px - ${centerX}px), calc(${endY}px - ${centerY}px)) scale(0.5)`,
          opacity: 0
        }
      ], {
        duration: 800 + Math.random() * 200,
        easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
        fill: 'forwards'
      });
      
      // Add to container
      explosionContainer.appendChild(particle);
    }
    
    // Add a central explosion
    const explosion = document.createElement('div');
    explosion.className = 'explosion-center';
    explosion.textContent = '💥';
    explosion.style.position = 'absolute';
    explosion.style.left = `${centerX}px`;
    explosion.style.top = `${centerY}px`;
    explosion.style.transform = 'translate(-50%, -50%)';
    
    // Animate the central explosion
    explosion.animate([
      { // starting position
        transform: 'translate(-50%, -50%) scale(0.1)',
        opacity: 0
      },
      { // visible state
        transform: 'translate(-50%, -50%) scale(1.0)',
        opacity: 1,
        offset: 0.2
      },
      { // expanded state
        transform: 'translate(-50%, -50%) scale(2.0)',
        opacity: 0.8,
        offset: 0.5
      },
      { // end position
        transform: 'translate(-50%, -50%) scale(0.5)',
        opacity: 0
      }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)',
      fill: 'forwards'
    });
    
    // Add to container
    explosionContainer.appendChild(explosion);
    
    // Remove explosion container after all animations complete
    setTimeout(() => {
      if (this.shadowRoot.contains(explosionContainer)) {
        this.shadowRoot.removeChild(explosionContainer);
      }
    }, 1200);
  }

  static get styles() {
    return css`
    :host {
      --board-size: 4; /* Default board size, will be updated in firstUpdated */
      --cell-font-size: 1.5em;
      --board-max-width: 400px;
      --board-height: calc(var(--board-max-width) * 1);
      --card-width: min(90vw, 600px);
      --primary-color: #3498db;
      --secondary-color: #2ecc71;
      --background-color: #121212;
      --card-bg-color: #1e1e1e;
      --text-color: #ffffff;
      --border-color: rgba(255, 255, 255, 0.1);
      --hit-color: rgba(46, 204, 113, 0.7);
      --miss-color: rgba(231, 76, 60, 0.7);
      --ship-color: rgba(52, 152, 219, 0.7);
    }
    
    .game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center; /* Changed from flex-start to center */
      min-height: 100vh;
      width: 100%;
      padding: 10px;
      padding-top: 80px; /* Add padding to top to account for the navbar */
      padding-bottom: 10px; /* Reduced padding at bottom since navbar is now at top */
      box-sizing: border-box;
      background-color: var(--background-color);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden; /* Changed from overflow-y: auto to prevent scrolling */
    }
    
    .game-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: var(--card-width);
      padding: 15px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      background-color: var(--card-bg-color);
      box-sizing: border-box;
      margin: 10px 0;
      max-height: 90vh; /* Increased from 80vh to use more vertical space */
      overflow: hidden;
    }
    
    .boards-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      gap: 25px; /* Increased from 20px to add more space between boards */
    }
    
    .board-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
    }
    
    .board-title {
      color: var(--primary-color);
      margin: 10px 0;
      text-align: center;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    .board {
      display: flex;
      flex-direction: column;
      align-items: center;
      border-radius: 8px;
      overflow: hidden;
      width: 100%;
      max-width: var(--board-max-width);
      height: var(--board-height);
      box-sizing: border-box;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .row {
      display: flex;
      width: 100%;
      flex: 1;
    }
    
    .cell {
      aspect-ratio: 1/1;
      width: calc(100% / var(--board-size));
      border: 1px solid var(--border-color);
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: var(--cell-font-size);
      background-color: rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }
    
    .cell:hover {
      background-color: rgba(255, 255, 255, 0.1);
      transform: scale(1.02);
    }
    
    .ship {
      background-color: var(--ship-color);
    }
    
    .hit {
      background-color: var(--hit-color);
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .miss {
      background-color: var(--miss-color);
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    /* Fireball animation */
    .fireball, .enemy-fireball {
      position: fixed;
      font-size: 2.5em; /* Increased size */
      z-index: 1000;
      pointer-events: none;
      transform: translate(-50%, -50%);
      animation: pulse 0.3s infinite alternate;
      filter: drop-shadow(0 0 15px rgba(255, 100, 0, 0.8));
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; /* Prioritize Apple emojis */
    }
    
    /* Add rotation to fireballs */
    .fireball {
      animation: pulse 0.3s infinite alternate, rotate-clockwise 0.8s infinite linear;
    }
    
    .enemy-fireball {
      animation: pulse 0.3s infinite alternate, rotate-counterclockwise 0.8s infinite linear;
    }
    
    /* Hit and miss animations */
    .hit-animation {
      animation: hitPulse 1s;
      background-color: var(--hit-color) !important;
    }
    
    .miss-animation {
      animation: missPulse 1s;
      background-color: var(--miss-color) !important;
    }
    
    /* Water droplet styles */
    .water-droplet {
      position: absolute;
      font-size: 1.8em;
      z-index: 1001;
      pointer-events: none;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      filter: drop-shadow(0 0 5px rgba(0, 100, 255, 0.7));
    }
    
    /* Central splash styles */
    .water-splash-center {
      position: absolute;
      font-size: 3.5em;
      z-index: 1002;
      pointer-events: none;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      filter: drop-shadow(0 0 10px rgba(0, 120, 255, 0.9));
    }
    
    /* Splash container */
    .splash-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    }
    
    /* Explosion particle styles */
    .explosion-particle {
      position: absolute;
      font-size: 1.8em;
      z-index: 1001;
      pointer-events: none;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      filter: drop-shadow(0 0 5px rgba(255, 100, 0, 0.7));
    }
    
    /* Central explosion styles */
    .explosion-center {
      position: absolute;
      font-size: 3.5em;
      z-index: 1002;
      pointer-events: none;
      font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
      filter: drop-shadow(0 0 10px rgba(255, 120, 0, 0.9));
    }
    
    /* Explosion container */
    .explosion-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    }
    
    @keyframes pulse {
      0% { transform: scale(1); filter: brightness(1); }
      100% { transform: scale(1.3); filter: brightness(1.2); }
    }
    
    @keyframes rotate-clockwise {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
    }
    
    @keyframes rotate-counterclockwise {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(-360deg); }
    }
    
    @keyframes hitPulse {
      0% { box-shadow: 0 0 0 0 var(--hit-color); }
      70% { box-shadow: 0 0 0 15px rgba(0, 255, 0, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 255, 0, 0); }
    }
    
    @keyframes missPulse {
      0% { box-shadow: 0 0 0 0 var(--miss-color); }
      70% { box-shadow: 0 0 0 15px rgba(255, 0, 0, 0); }
      100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
    }
    
    /* Winner message styles */
    .winner-message {
      color: var(--secondary-color);
      font-size: 1.5em;
      font-weight: bold;
      text-align: center;
      margin: 15px 0;
      padding: 10px;
      border-radius: 8px;
      background-color: rgba(0, 0, 0, 0.2);
      animation: pulse 1.5s infinite alternate;
    }
    
    @keyframes pulse {
      from {
        transform: scale(1);
        text-shadow: 0 0 10px rgba(46, 204, 113, 0.5);
      }
      to {
        transform: scale(1.05);
        text-shadow: 0 0 20px rgba(46, 204, 113, 0.8);
      }
    }
    
    /* Message and instruction text styles */
    .message {
      color: var(--text-color);
      margin-bottom: 5px;
      font-size: 1.2em;
      text-align: center;
      width: 100%;
      font-weight: 500;
    }
    
    .instruction-text {
      color: var(--secondary-color);
      margin: 0 0 10px 0;
      font-size: 1em;
      text-align: center;
      width: 100%;
      font-weight: 500;
    }
    
    /* Media query for landscape orientation */
    @media (orientation: landscape) {
      .game-container {
        padding: 5px;
        justify-content: center;
      }
      
      .game-card {
        margin: 10px 0;
        padding: 15px;
      }
      
      .boards-wrapper {
        flex-direction: column;
        gap: 15px;
        width: 100%;
      }
      
      .board-section {
        width: 100%;
        max-width: 35vmin;
      }
      
      .board {
        max-width: 35vmin;
        height: 35vmin;
      }
      
      :host {
        --cell-font-size: 1em;
        --card-width: min(85vw, 450px);
      }
    }
    
    /* Media query for smaller screens */
    @media (max-width: 768px) {
      .game-card {
        padding: 15px;
        margin: 10px 0;
        max-height: 85vh;
      }
      
      .boards-wrapper {
        gap: 15px;
      }
      
      :host {
        --cell-font-size: 0.9em;
        --board-max-width: 65vmin;
        --board-height: 65vmin;
      }
    }
    
    /* Media query for very small screens */
    @media (max-width: 480px) {
      .game-container {
        padding: 5px;
      }
      
      .game-card {
        padding: 10px;
        width: 92vw;
        margin: 5px 0;
        max-height: 85vh;
      }
      
      .boards-wrapper {
        gap: 10px;
      }
      
      .board-title {
        font-size: 0.9em;
        margin: 5px 0;
      }
      
      :host {
        --cell-font-size: 0.8em;
        --board-max-width: 60vmin;
        --board-height: 60vmin;
      }
    }
    
    /* Media query for portrait orientation (mobile) */
    @media (orientation: portrait) and (max-width: 768px) {
      .game-container {
        padding: 5px;
        padding-top: 70px; /* Top padding for navbar on mobile */
        padding-bottom: 5px;
      }
      
      .game-card {
        padding: 10px;
        margin: 5px 0;
        max-height: 95vh; /* Use almost all available vertical space on mobile */
      }
      
      .boards-wrapper {
        gap: 20px;
      }
      
      .board-title {
        font-size: 0.9em;
        margin: 5px 0;
      }
      
      :host {
        --cell-font-size: 1em;
        --card-width: min(95vw, 500px); /* Use more horizontal space on mobile */
      }
    }
    
    .player-ship-hit {
      background-color: #e74c3c; /* Bright red */
      color: white;
      font-size: 1.5em;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    `;
  }
}

customElements.define('game-board', GameBoard);