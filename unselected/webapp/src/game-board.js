import { LitElement, html, css } from 'lit';
import { sounds } from './sounds.js';
import { EnemyAI } from './enemy-ai.js';
import { WinnerPopup } from './winner-popup.js';

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
      enemyShipPositions: { type: Array },
      gameId: { type: String },
      wins: { type: Number },
      losses: { type: Number }
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
    this.gameEnded = false;
    this.winner = null;
    this.shipsPlaced = 0;
    this.message = `Place your ships! Click on your board to place ${this.boardSize} ships.`;
    this.instructionText = `Tap on Player Board ${this.boardSize} times`;
    
    // Always start with isPlayerTurn as null to prevent enemy moves until ships are placed
    this.isPlayerTurn = null;
    
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
    
    if(!this.gameId){
      // Initialize win/loss counts on new game 
      this.wins = 0;
      this.losses = 0;
    }
    // Place enemy ships randomly
    this.placeEnemyShips();
    
    // Initialize timeout properties
    this._enemyMoveTimeout = null;
    this._enemyAnimationTimeout = null;
    this._enemyCleanupTimeout = null;
    this._playerAttackTimeout = null;
    this._playerCleanupTimeout = null;
    
    // Initialize WebSocket connection
    this.websocket = null;
    this.websocketReconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 2000; // 2 seconds
  }

  connectedCallback() {
    super.connectedCallback();
    
    console.log('Game board connected - initializing game state');
    
    // Initialize internal state tracking
    this._creatingGame = false;
    this._gameCreated = false;
    this._initialLoadComplete = false;
    
    // Initialize board arrays if they don't exist
    if (!this.playerBoard) {
      this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    }
    if (!this.enemyBoard) {
      this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    }
    
    // Try to get gameId from localStorage
    this.gameId = localStorage.getItem('gameId');
    console.log(`Game ID from localStorage: ${this.gameId}`);
    
    // Initialize WebSocket connection
    this.initWebSocket();
    
    // Add an event listener for when the WebSocket connects
    this.addEventListener('websocket-connected', () => {
      console.log('WebSocket connected - loading game state');
      this.loadGameState();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    
    // Close WebSocket connection when component is removed
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    
    // Clear any pending timeouts
    if (this._enemyMoveTimeout) clearTimeout(this._enemyMoveTimeout);
    if (this._enemyAnimationTimeout) clearTimeout(this._enemyAnimationTimeout);
    if (this._enemyCleanupTimeout) clearTimeout(this._enemyCleanupTimeout);
    if (this._playerAttackTimeout) clearTimeout(this._playerAttackTimeout);
    if (this._playerCleanupTimeout) clearTimeout(this._playerCleanupTimeout);
  }

  // Initialize WebSocket connection
  initWebSocket() {
    // Close existing connection if any
    if (this.websocket) {
      this.websocket.close();
    }
    
    // Use secure WebSocket URL from your CDK infrastructure outputs
    this.websocket = new WebSocket('wss://1gnhhkjdx1.execute-api.us-east-1.amazonaws.com/prod');
    
    // Track connection state for debugging
    this.connecting = true;
    
    this.websocket.onopen = () => {
      console.log('WebSocket connection established');
      this.connecting = false;
      this.websocketReconnectAttempts = 0;
      this.dispatchEvent(new CustomEvent('websocket-connected'));
      
      // If we have a gameId, request the game data after connection
      if (this.gameId) {
        this.getGame();
      }
    };
    
    this.websocket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      
      try {
        const message = JSON.parse(event.data);
        
        // Handle different message types
        switch(message.type) {
          case 'GameCreated':
            if (message.data && message.data.gameId) {
              this.gameId = message.data.gameId;
              localStorage.setItem('gameId', this.gameId);
              console.log('Game created with ID:', this.gameId);
              
              // Reset player ship positions array when creating a new game
              this.playerShipPositions = [];
              this.shipsPlaced = 0;
              
              // Now that we have a gameId, update the game
              this.updateGame();
            }
            break;
            
          case 'GameUpdated':
            console.log('Game updated event received:', message.data);
            // If this is an update for our game, process the state
            if (message.data && message.data.gameId === this.gameId) {
              console.log('Processing game update for our game');
              
              // Update the UI with the latest game state
              this.handleGameData(message.data);
              
              // Special handling for ship placement completion
              if (message.data.shipsPlaced === this.boardSize && 
                  (this.isPlayerTurn === null || this.isPlayerTurn === undefined)) {
                console.log('Ship placement just completed - updating game state');
                this.isPlayerTurn = true;
                this.requestUpdate();
                this.updateGame();
              }
            }
            break;
            
          case 'GameRequested':
            if (message.data) {
              this.handleGameData(message.data);
            }
            break;
            
          case 'GameDeleted':
            console.log('Game deleted event received');
            // Reset player ship positions
            this.playerShipPositions = [];
            break;
            
          case 'acknowledgment':
            console.log('Message acknowledged:', message.message);
            break;
            
          case 'error':
            console.error('Error received from server:', message.message);
            // If we get an error, we might need to refresh the connection
            if (message.message.includes('not found') && this.gameId) {
              console.log('Game not found, creating a new one');
              this.gameId = null;
              this.playerShipPositions = [];
              localStorage.removeItem('gameId');
              setTimeout(() => this.createGame(), 500);
            }
            break;
            
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
      this.connecting = false;
      
      // Attempt to reconnect if not a clean close and under max attempts
      if (!event.wasClean && this.websocketReconnectAttempts < this.maxReconnectAttempts) {
        this.websocketReconnectAttempts++;
        const reconnectDelay = Math.min(this.reconnectInterval * this.websocketReconnectAttempts, 10000);
        console.log(`Reconnecting (attempt ${this.websocketReconnectAttempts}/${this.maxReconnectAttempts}) in ${reconnectDelay}ms...`);
        setTimeout(() => this.initWebSocket(), reconnectDelay);
      } else if (this.websocketReconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
        this.message = "Connection lost. Please refresh the page.";
        this.requestUpdate();
      }
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connecting = false;
      // Don't handle reconnection here - let the onclose handler do it
    };
    
    // Add a timeout to detect connection issues
    setTimeout(() => {
      if (this.connecting && this.websocket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket connection timeout. Forcing close to trigger reconnect.');
        this.websocket.close();
        this.connecting = false;
      }
    }, 5000);
  }
  
  // Helper method to check if WebSocket is connected and ready
  isWebSocketReady() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }
  
  // Helper method to wait for WebSocket connection
  waitForWebSocketConnection(timeout = 20000) {
    return new Promise((resolve, reject) => {
      if (this.isWebSocketReady()) {
        resolve();
        return;
      }
      
      const connectionHandler = () => {
        this.removeEventListener('websocket-connected', connectionHandler);
        resolve();
      };
      
      this.addEventListener('websocket-connected', connectionHandler);
      
      // Add timeout
      setTimeout(() => {
        this.removeEventListener('websocket-connected', connectionHandler);
        if (!this.isWebSocketReady()) {
          reject(new Error('WebSocket connection timeout'));
        } else {
          resolve();
        }
      }, timeout);
      
      // If not connecting yet, initialize connection
      if (!this.connecting && !this.isWebSocketReady()) {
        this.initWebSocket();
      }
    });
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
      <div class="game-overlay">
        ${this.animatingFireball ? html`
          <div class="fireball" style="left: ${this.fireballPosition.x}px; top: ${this.fireballPosition.y}px;">🔥</div>
        ` : ''}
        
        ${this.animatingEnemyFireball ? html`
          <div class="enemy-fireball" style="left: ${this.enemyFireballPosition.x}px; top: ${this.enemyFireballPosition.y}px;">🔥</div>
        ` : ''}
        
        <winner-popup id="winnerPopup"></winner-popup>
      </div>
      
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
      </div>
    </div>
    `;
  }

  checkWin(board) {
    // Check if all ships ('S') have been hit ('X')
    return board.every(row => row.every(cell => cell !== 'S'));
  }

  handleEnemyCellClick(row, col) { // when the player clicks on the enemy board 
    console.log(`handleEnemyCellClick called - isPlayerTurn: ${this.isPlayerTurn}, shipsPlaced: ${this.shipsPlaced}, boardSize: ${this.boardSize}, gameEnded: ${this.gameEnded}`);
    
    if (this.gameEnded || this.isPlayerTurn === false) {
      console.log('Cannot attack: game ended or not player turn');
      return;
    }

    // Make sure the client state is consistent with what's stored
    const actualShipCount = this.countShipsOnBoard();
    if (this.shipsPlaced !== actualShipCount) {
      console.log(`Fixing ship count mismatch. Stored: ${this.shipsPlaced}, Actual: ${actualShipCount}`);
      this.shipsPlaced = actualShipCount;
    }

    if (this.shipsPlaced < this.boardSize) {
      console.log('Cannot attack: not all ships placed yet');
      this.message = `Place all ${this.boardSize} ships first!`;
      this.requestUpdate();
      return;
    }

    if (this.enemyBoard[row][col] === 'X' || this.enemyBoard[row][col] === 'O') {
      this.message = 'You already tried that spot!';
      this.requestUpdate();
      return;
    }

    // If we got here, attack is valid - ensure player turn is explicitly set
    if (this.isPlayerTurn === null) {
      console.log('Setting isPlayerTurn to true since all ships are placed and attack is being made');
      this.isPlayerTurn = true;
    }

    this.startFireballAnimation(row, col);

    // Store attack timeout
    this._playerAttackTimeout = setTimeout(() => {
      console.log(`Player attacks: ${row}, ${col}`);
      this.lastHitPosition = { row, col };

      if (this.enemyBoard[row][col] === 'S') {
        console.log('Hit!');
        this.hitResult = 'hit';
        sounds.initAudioContext();
        sounds.HitEnemy();
        this.enemyBoard[row][col] = 'X';
        this.switchTurn(); // the player went, so switch the turn to the enemy 
        this.updateGame(); // record the hit & turn state in DynamoDB 
        this.createExplosion(row, col, true);

        if (this.checkWin(this.enemyBoard)) {
          console.log('Player wins!');
          sounds.initAudioContext();
          sounds.Victory(); // add victory sound 
          this.endGame('Player');
          return;
        }
      } else {
        console.log('Miss!');
        this.hitResult = 'miss';
        this.enemyBoard[row][col] = 'O';
        this.switchTurn(); // the player went, so switch the turn to the enemy 
        this.updateGame(); // record the miss & turn state in DynamoDB 
        this.createWaterSplash(row, col, true);
      }
       
      this.requestUpdate();

      // Store cleanup and enemy move timeout
      this._playerCleanupTimeout = setTimeout(() => {
        this.lastHitPosition = null;
        this.hitResult = null;
        this.requestUpdate();
        // Start enemy move if game is not ended and it's enemy's turn
        if (!this.gameEnded && !this.isPlayerTurn) {
          this.enemyMove();
        }
      }, 1000);
    }, 800);
  }
  
  handlePlayerCellClick(row, col) {
    console.log(`Player clicked: ${row}, ${col}`);
    
    // Make sure game isn't ended
    if (this.gameEnded) return;
    
    // Make sure we have a game ID before allowing ship placement
    if (!this.gameId) {
      console.warn('No game ID available - creating new game before placing ships');
      this.createGame().then(() => {
        // After game is created, retry the cell click
        this.handlePlayerCellClick(row, col);
      });
      return;
    }
    
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
      
      // Add to player ship positions
      const newShipPosition = { row, col };
      this.playerShipPositions.push(newShipPosition);
      
      // Update the ship count by recounting ships on the board
      this.shipsPlaced = this.countShipsOnBoard();
      
      console.log(`Ship placed at ${row},${col}. Total ships: ${this.shipsPlaced}, Game ID: ${this.gameId}`);
      
      // Update the message
      if (this.shipsPlaced < this.boardSize) {
        this.message = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
        this.instructionText = `Tap on Player Board ${this.boardSize - this.shipsPlaced} times`;
      } else {
        // All ships are now placed - start the game with player's turn
        this.message = "All ships placed! Click on the enemy board to attack.";
        this.instructionText = "Attack the enemy board";
        
        // Explicitly set player's turn when all ships are placed
        this.isPlayerTurn = true;
        console.log("All ships placed, setting player's turn");
      }
      
      // Update game state on the server - this is critical for persistence
      this.updateGame().then(() => {
        console.log('Game state updated on server after ship placement');
      }).catch(error => {
        console.error('Error updating game state:', error);
      });

      this.requestUpdate();
      return;
    }
    
    // Handle clicks after all ships are placed
    if (this.shipsPlaced >= this.boardSize) {
      if (this.isPlayerTurn) {
        this.message = "Attack the enemy board!";
        this.instructionText = "Click on the enemy's board";
      } else {
        this.message = "It's the enemy's turn! Please wait.";
        this.instructionText = "Wait for enemy move";
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
    // Never allow enemy to attack during ship placement phase or when game is ended or when it's player's turn
    if (this.gameEnded || this.isPlayerTurn === true || this.shipsPlaced < this.boardSize) {
      console.log("Enemy move prevented - game ended, player's turn, or ships not placed", {
        gameEnded: this.gameEnded,
        isPlayerTurn: this.isPlayerTurn,
        shipsPlaced: this.shipsPlaced,
        boardSize: this.boardSize
      });
      return;
    }

    console.log("Enemy is making a move", {
      gameEnded: this.gameEnded,
      isPlayerTurn: this.isPlayerTurn,
      shipsPlaced: this.shipsPlaced
    });

    // Store timeout ID so it can be cleared during reset
    this._enemyMoveTimeout = setTimeout(() => {
      const move = this.enemyAI.attack(this.playerBoard);
      if (move) {
        const { row, col } = move;
        this.startEnemyFireballAnimation(row, col);

        // Store the animation timeout as well
        this._enemyAnimationTimeout = setTimeout(() => {
          this.lastEnemyHitPosition = { row, col };

          if (this.playerBoard[row][col] === 'S') {
            console.log('Enemy hit player ship!');
            this.enemyHitResult = 'hit';
            sounds.initAudioContext();
            sounds.HitPlayer();
            this.playerBoard[row][col] = 'X';
            this.createExplosion(row, col, false); 
            this.switchTurn(); // the enemy went, so switch the turn to the player 
            this.updateGame(); // record the hit & turn state in DynamoDB 

            if (this.checkWin(this.playerBoard)) {
              console.log('Enemy wins!');
              sounds.initAudioContext();
              sounds.Defeat(); // add defeat sound 
              this.endGame('Enemy');
              return;
            }
          } else {
            console.log('Enemy missed!');
            this.enemyHitResult = 'miss';
            this.playerBoard[row][col] = 'O';
            this.createWaterSplash(row, col, false);
            this.switchTurn(); // the enemy went, so switch the turn to the player 
            this.updateGame(); // record the miss & turn state in DynamoDB 
          }

          this.requestUpdate();

          // Store cleanup timeout
          this._enemyCleanupTimeout = setTimeout(() => {
            this.lastEnemyHitPosition = null;
            this.enemyHitResult = null;
            this.requestUpdate();
          }, 1000);
        }, 800);
      }
    }, 1000);
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
    const shipCount = this.boardSize;
    this.enemyShipPositions = [];
    for (let i = 0; i < shipCount; i++) {
      let placed = false;
      while (!placed) {
        const row = Math.floor(Math.random() * this.boardSize);
        const col = Math.floor(Math.random() * this.boardSize);
        if (!this.enemyShipPositions.some(pos => pos.row === row && pos.col === col)) {
          this.enemyShipPositions.push({ row, col });
          this.enemyBoard[row][col] = 'S';
          placed = true;
        }
      }
    }
    // only call updateGame if there is a gameId 
    if (this.gameId) {
      this.updateGame();
    }
  }

  endGame(winner) {
    console.log(`${winner} wins!`);
    this.gameEnded = true;
    this.winner = winner;
    
    // Update win/loss counters
    if (winner === 'Player') {
      this.wins += 1;
      // Add victory message to chat
      const chatBox = document.querySelector('chat-box');
      if (chatBox) {
        chatBox.addGameMessage("🏆 Congratulations! You've sunk all my ships! Well played!", 'game win');
      }
    } else {
      this.losses += 1;
      // Add defeat message to chat
      const chatBox = document.querySelector('chat-box');
      if (chatBox) {
        chatBox.addGameMessage("💥 Game Over! I've sunk all your ships! Better luck next time!", 'game lose');
      }
    }
    
    // Store the latest wins and losses in localStorage
    localStorage.setItem('playerWins', this.wins);
    localStorage.setItem('playerLosses', this.losses);
    
    // Dispatch event with the updated stats
    window.dispatchEvent(new CustomEvent('stats-updated', { 
      detail: { wins: this.wins, losses: this.losses } 
    }));
    
    // Update game status in database
    this.updateGame();
    
    // Show winner popup
    setTimeout(() => {
      const winnerPopup = this.shadowRoot.querySelector('#winnerPopup');
      if (winnerPopup) {
        winnerPopup.show(winner);
      } else {
        console.error('Winner popup component not found!');
      }
    }, 100);
  }

  resetGame() {
    console.log("Resetting game...");
    
    // Clear all timeouts
    if (this._enemyMoveTimeout) clearTimeout(this._enemyMoveTimeout);
    if (this._enemyAnimationTimeout) clearTimeout(this._enemyAnimationTimeout);
    if (this._enemyCleanupTimeout) clearTimeout(this._enemyCleanupTimeout);
    if (this._playerAttackTimeout) clearTimeout(this._playerAttackTimeout);
    if (this._playerCleanupTimeout) clearTimeout(this._playerCleanupTimeout);
    
    // Make sure gameId is cleared from localStorage
    localStorage.removeItem('gameId');
    this.gameId = null;
    
    // Reset ship placement
    this.shipsPlaced = 0;
    
    // Reset boards immediately to prevent flicker
    this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    
    // Reset messages
    this.message = `Place ${this.boardSize} ships on your board`;
    this.instructionText = `Tap on Player Board ${this.boardSize} times`;
    
    // Reset player positions
    this.playerShipPositions = [];
    
    // Reset turn state
    this.isPlayerTurn = null; // Set to null initially to prevent enemy move
    this.gameEnded = false;
    this.winner = '';
    
    // Reset animation properties
    this.animatingFireball = false;
    this.fireballPosition = null;
    this.lastHitPosition = null;
    this.hitResult = null;
    this.lastEnemyHitPosition = null;
    this.enemyHitResult = null;
    this.animatingEnemyFireball = false;
    this.enemyFireballPosition = null;
    
    // Force update immediately
    this.requestUpdate();
    
    // Delete the current game and create a new one
    this.deleteGame().then(() => {
      // Place new enemy ships
      this.placeEnemyShips();
      
      // Create a new game
      this.createGame();
    }).catch(error => {
      console.error('Error resetting game:', error);
      // If there's an error, try to create a new game anyway
      this.placeEnemyShips();
      this.createGame();
    });
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

  // Helper method to rebuild playerShipPositions from the board data
  rebuildPlayerShipPositions() {
    // Reset ship positions
    this.playerShipPositions = [];
    
    // Make sure playerBoard exists and is an array before processing
    if (!this.playerBoard || !Array.isArray(this.playerBoard)) {
      console.warn('Player board not properly initialized. Creating empty board.');
      this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      return;
    }
    
    // Scan through the board to find all ships
    for (let row = 0; row < this.playerBoard.length; row++) {
      if (!Array.isArray(this.playerBoard[row])) {
        console.warn(`Invalid row at index ${row}, skipping`);
        continue;
      }
      for (let col = 0; col < this.playerBoard[row].length; col++) {
        if (this.playerBoard[row][col] === 'S') {
          this.playerShipPositions.push({ row, col });
        }
      }
    }
    
    console.log(`Rebuilt player ship positions: ${this.playerShipPositions.length} ships found`);
  }
  
  // Helper method to count ships on the player board
  countShipsOnBoard() {
    let count = 0;
    
    // Make sure playerBoard exists and is an array before processing
    if (!this.playerBoard || !Array.isArray(this.playerBoard)) {
      console.warn('Player board not properly initialized for counting ships');
      return 0;
    }
    
    for (let row = 0; row < this.playerBoard.length; row++) {
      if (!Array.isArray(this.playerBoard[row])) {
        console.warn(`Invalid row at index ${row}, skipping for ship count`);
        continue;
      }
      for (let col = 0; col < this.playerBoard[row].length; col++) {
        if (this.playerBoard[row][col] === 'S') {
          count++;
        }
      }
    }
    
    return count;
  }

  async createGame() {
    try {
      console.log('Starting game creation process');
      this._creatingGame = true;
      
      // Reset game state
      this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      this.shipsPlaced = 0;
      this.playerShipPositions = [];
      
      // Wait for WebSocket connection
      await this.waitForWebSocketConnection();
      
      if (this.isWebSocketReady()) {
        console.log('Sending game creation request via WebSocket');
        
        return new Promise((resolve, reject) => {
          // Create a message handler for the WebSocket response
          const handleGameCreated = (event) => {
            try {
              const message = JSON.parse(event.data);
              
              if (message.type === 'GameCreated' && message.data && message.data.gameId) {
                // We got a response with a game ID
                console.log('Game created with ID:', message.data.gameId);
                
                // Store the game ID
                this.gameId = message.data.gameId;
                localStorage.setItem('gameId', this.gameId);
                
                // Clean up
                this.websocket.removeEventListener('message', handleGameCreated);
                this._creatingGame = false;
                this._gameCreated = true;
                
                // Update game state from server response
                if (message.data.playerBoard) {
                  this.playerBoard = message.data.playerBoard;
                }
                if (message.data.enemyBoard) {
                  this.enemyBoard = message.data.enemyBoard;
                }
                
                // Update UI
                this.shipsPlaced = 0;
                this.message = 'Place your ships on the board.';
                this.requestUpdate();
                
                resolve(this.gameId);
              }
            } catch (error) {
              console.error('Error handling game creation response:', error);
            }
          };
          
          // Add event listener for WebSocket messages
          this.websocket.addEventListener('message', handleGameCreated);
          
          // Send the game creation request
          this.websocket.send(JSON.stringify({
            action: 'createGame',
            data: {}
          }));
          
          // Set timeout for the request
          setTimeout(() => {
            if (this._creatingGame) {
              console.warn('Timeout waiting for game creation');
              this.websocket.removeEventListener('message', handleGameCreated);
              this._creatingGame = false;
              reject(new Error('Timeout waiting for game creation'));
            }
          }, 20000);
        });
      } else {
        throw new Error('WebSocket not connected');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      this._creatingGame = false;
      throw error;
    }
  }

  async updateGame() {
    try {
      // Make sure we have a game ID
      if (!this.gameId) {
        throw new Error('No game ID available for update');
      }
      
      // Wait for WebSocket connection
      await this.waitForWebSocketConnection();
      
      if (!this.isWebSocketReady()) {
        throw new Error('WebSocket not connected');
      }
      
      // Rebuild ship positions
      this.rebuildPlayerShipPositions();
      
      // Set player turn based on ship placement
      if (this.shipsPlaced === this.boardSize && this.isPlayerTurn === null) {
        this.isPlayerTurn = true;
      }
      
      // Prepare the game state data to send
      const gameState = {
        gameId: this.gameId,
        playerBoard: this.playerBoard,
        enemyBoard: this.enemyBoard,
        shipsPlaced: this.shipsPlaced,
        playerHits: this.playerShipPositions.filter(pos => this.playerBoard[pos.row][pos.col] === 'X').length,
        enemyHits: this.enemyShipPositions.filter(pos => this.enemyBoard[pos.row][pos.col] === 'X').length,
        gameStatus: this.gameEnded ? 'COMPLETED' : 'IN_PROGRESS',
        isPlayerTurn: this.isPlayerTurn,
        wins: this.wins,
        losses: this.losses
      };
      
      console.log('Updating game state on server:', {
        gameId: this.gameId,
        shipsPlaced: this.shipsPlaced,
        isPlayerTurn: this.isPlayerTurn
      });
      
      // Send the update via WebSocket
      this.websocket.send(JSON.stringify({
        action: 'updateGame',
        data: gameState
      }));
      
      console.log(`Game ${this.gameId} update request sent via WebSocket`);
      
      // Also save to localStorage as a backup
      localStorage.setItem('gameId', this.gameId);
      
      return true;
    } catch (error) {
      console.error('Error updating game:', error);
      throw error;
    }
  }

  async getGame() {
    try {
      if (!this.gameId) {
        console.error('No gameId available for getGame');
        return this.createGame();
      }
      
      await this.waitForWebSocketConnection();
      
      // Send a message to get the game state via WebSocket
      if (this.isWebSocketReady()) {
        console.log(`Requesting game data for ID: ${this.gameId}`);
        
        return new Promise((resolve, reject) => {
          // Set up a timeout for the request
          const timeout = setTimeout(() => {
            console.warn(`Timeout waiting for game ${this.gameId}`);
            this.websocket.removeEventListener('message', messageHandler);
            reject(new Error('Timeout waiting for game data'));
          }, 5000);
          
          // Define the message handler for the response
          const messageHandler = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log('WebSocket message during getGame:', message);
              
              // Handle GameRequested response
              if (message.type === 'GameRequested' && message.data) {
                // Clear the timeout since we got a response
                clearTimeout(timeout);
                
                // Check if this is our game ID
                if (message.data.gameId === this.gameId) {
                  console.log('Received game data for our game:', message.data);
                  this.websocket.removeEventListener('message', messageHandler);
                  
                  // Handle the game data
                  this.handleGameData(message.data);
                  resolve(message.data);
                }
              } 
              // Handle error message (game not found)
              else if (message.type === 'error' && message.message && message.message.includes('not found')) {
                clearTimeout(timeout);
                this.websocket.removeEventListener('message', messageHandler);
                console.log('Game not found, creating a new one');
                reject(new Error('Game not found'));
              }
            } catch (error) {
              console.error('Error handling WebSocket message:', error);
            }
          };
          
          // Add the event listener for incoming messages
          this.websocket.addEventListener('message', messageHandler);
          
          // Send the request to get the game
          this.websocket.send(JSON.stringify({
            action: 'getGame',
            data: {
              gameId: this.gameId
            }
          }));
          console.log(`Game ${this.gameId} retrieve request sent via WebSocket`);
        });
      } else {
        throw new Error('WebSocket not connected after waiting');
      }
    } catch (error) {
      console.error('Error getting game via WebSocket:', error);
      throw error;
    }
  }

  async deleteGame() {
    try {
      if (this.gameId) {
        await this.waitForWebSocketConnection();
        
        // Send a message to delete the game via WebSocket
        if (this.isWebSocketReady()) {
          this.websocket.send(JSON.stringify({
            action: 'deleteGame',
            data: {
              gameId: this.gameId
            }
          }));
          console.log(`Game ${this.gameId} delete request sent via WebSocket`);
          this.gameId = null;
          localStorage.removeItem('gameId');
        } else {
          throw new Error('WebSocket not connected after waiting');
        }
      }
    } catch (error) {
      console.error('Error deleting game via WebSocket:', error);
    }
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
      justify-content: flex-start;
      min-height: 100vh;
      width: 100%;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      background-color: var(--background-color);
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
    
    .game-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    }
    
    .game-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: var(--card-width);
      padding: 10px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      background-color: var(--card-bg-color);
      box-sizing: border-box;
      position: absolute;
      top: 0;
      transform: translateY(60px);
      z-index: 2;
      max-height: calc(100vh - 20px);
      overflow-y: auto;
    }
    
    .boards-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      gap: 12px;
      padding: 0;
      margin: 0;
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
      margin: 5px 0; /* Reduced margin */
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
      .game-card {
        transform: translateY(0);
      }
      
      .boards-wrapper {
        gap: 10px;
      }
      
      :host {
        --board-max-width: 80vmin;
        --board-height: 80vmin;
      }
    }
    
    /* Media query for portrait orientation (mobile) */
    @media (orientation: portrait) and (max-width: 768px) {
      .game-container {
        padding: 0;
      }
      
      .game-card {
        transform: translateY(5px);
      }
      
      .boards-wrapper {
        gap: 12px /* Further reduced gap for mobile */
      }
      
      .board-title {
        font-size: 0.9em;
        margin: 5px 0;
      }
      
      :host {
        --board-max-width: 85vmin; /* Increased board size */
        --board-height: 85vmin;
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

  // Handle game data received from the server
  handleGameData(data) {
    try {
      if (!data) {
        console.error('Received empty game data from server');
        return;
      }

      if (!data.gameId) {
        console.error('Received game data without gameId', data);
        return;
      }

      console.log("Received game data from server:", data);
      
      // Store previous ship positions and count to detect changes
      const prevShipsPlaced = this.shipsPlaced;
      const prevPlayerBoard = JSON.stringify(this.playerBoard || []);
      const prevIsPlayerTurn = this.isPlayerTurn;
      
      // Ensure playerBoard and enemyBoard are properly initialized
      if (!data.playerBoard || !Array.isArray(data.playerBoard)) {
        console.warn('Missing or invalid playerBoard in game data, initializing empty board');
        data.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      }
      
      if (!data.enemyBoard || !Array.isArray(data.enemyBoard)) {
        console.warn('Missing or invalid enemyBoard in game data, initializing empty board');
        data.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      }
      
      // grabs the player and enemy boards from DynamoDB, this includes hits and misses 
      this.playerBoard = data.playerBoard;
      this.enemyBoard = data.enemyBoard;
      
      // Rebuild playerShipPositions from the board data
      this.rebuildPlayerShipPositions();
      
      // Recalculate shipsPlaced based on the board
      const actualShipsPlaced = this.countShipsOnBoard();
      
      // Only update shipsPlaced if it's valid and matches the actual count
      if (typeof data.shipsPlaced === 'number' && data.shipsPlaced >= 0) {
        // Use the maximum of server value and actual count to avoid going backwards
        this.shipsPlaced = Math.max(data.shipsPlaced, actualShipsPlaced);
        console.log(`Updated shipsPlaced from server: ${this.shipsPlaced} (actual count: ${actualShipsPlaced})`);
      } else {
        // If server data is invalid, use the actual count
        this.shipsPlaced = actualShipsPlaced;
        console.log(`Server ship count invalid, using actual count: ${actualShipsPlaced}`);
      }
      
      this.gameEnded = data.status === 'COMPLETED';
      
      // If we just created a brand new game, make sure shipsPlaced is 0
      if (this.shipsPlaced > this.boardSize) {
        console.warn('Invalid shipsPlaced value detected, resetting to 0');
        this.shipsPlaced = 0;
        // Clear the board of ships
        this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
        this.playerShipPositions = [];
      }
      
      // Handle the player turn state based on ship placement
      if (this.shipsPlaced >= this.boardSize) {
        // Game has started - use server's player turn value or default to true if invalid
        if (data.isPlayerTurn === true || data.isPlayerTurn === false) {
          console.log(`All ships placed - setting isPlayerTurn to ${data.isPlayerTurn}`);
          this.isPlayerTurn = data.isPlayerTurn;
        } else {
          // If server doesn't have a valid turn state but all ships are placed, default to player's turn
          console.log('All ships placed but no valid turn state from server - defaulting to player turn');
          this.isPlayerTurn = true;
        }
        
        // If it's not player's turn, trigger enemy move
        if (this.isPlayerTurn === false && !this.gameEnded) {
          console.log("Triggering enemy move after state update");
          setTimeout(() => this.enemyMove(), 1000);
        }
      } else {
        // During ship placement phase, prevent enemy from moving
        console.log("Still in ship placement phase, setting isPlayerTurn to null");
        this.isPlayerTurn = null;
      }
      
      // Get win/loss counts if they exist
      if (data.wins !== undefined) this.wins = data.wins;
      if (data.losses !== undefined) this.losses = data.losses;
      
      // Update message based on the number of ships placed
      if (this.shipsPlaced < this.boardSize) {
        this.message = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
        this.instructionText = `Tap on Player Board ${this.boardSize - this.shipsPlaced} times`;
      } else {
        this.message = "All ships placed! Click on the enemy board to attack.";
        this.instructionText = "Attack the enemy board";
      }
      
      // If the board, ships, or turn state changed, update the game state on the server
      if (prevShipsPlaced !== this.shipsPlaced || 
          prevPlayerBoard !== JSON.stringify(this.playerBoard) ||
          prevIsPlayerTurn !== this.isPlayerTurn) {
        console.log('Board, ship count, or turn state changed, updating server');
        setTimeout(() => this.updateGame(), 100);
      }
      
      console.log(`Game ${this.gameId} data received!`, data);
      console.log(`isPlayerTurn: ${this.isPlayerTurn}, shipsPlaced: ${this.shipsPlaced}`);
      this.requestUpdate(); // updates the UI with the new game state
    } catch (error) {
      console.error('Error processing game data:', error);
      
      // Ensure we have default values to prevent further errors
      if (!this.playerBoard) {
        this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      }
      if (!this.enemyBoard) {
        this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      }
      if (!this.playerShipPositions) {
        this.playerShipPositions = [];
      }
    }
  }

  // New method to initialize game state
  initializeGameState() {
    // First check localStorage for gameId
    this.gameId = localStorage.getItem('gameId');
    console.log(`Retrieved gameId from localStorage: ${this.gameId}`);
    
    // Also load the saved board state if available
    if (localStorage.getItem('playerBoard')) {
      try {
        this.playerBoard = JSON.parse(localStorage.getItem('playerBoard'));
        this.shipsPlaced = parseInt(localStorage.getItem('shipsPlaced') || '0', 10);
        console.log(`Loaded local game state with ${this.shipsPlaced} ships placed`);
      } catch (e) {
        console.error('Error loading saved game state:', e);
      }
    }
  }

  // New method to handle game loading with fallbacks
  async loadSavedGameState() {
    if (this.gameId) {
      try {
        // Try to get the game from the server first
        await this.getGame();
      } catch (error) {
        console.error('Error loading game from server:', error);
        // If server retrieval fails, use local state
        if (localStorage.getItem('playerBoard')) {
          console.log('Using locally saved game state as fallback');
          // Keep using the already loaded local state
        } else {
          // If no local state either, create a new game
          console.log('No valid game state found, creating new game');
          this.createGame();
        }
      }
    } else {
      // No gameId, create a new game
      console.log('No gameId found, creating new game');
      this.createGame();
    }
  }

  // Add new method to restore local game state
  restoreLocalGameState() {
    try {
      // Try to restore ship placements from localStorage if available
      const savedBoard = localStorage.getItem('playerBoard');
      const savedShipsPlaced = localStorage.getItem('shipsPlaced');
      
      if (savedBoard && savedShipsPlaced) {
        const parsedBoard = JSON.parse(savedBoard);
        const parsedShipsPlaced = parseInt(savedShipsPlaced, 10);
        
        if (Array.isArray(parsedBoard) && !isNaN(parsedShipsPlaced)) {
          console.log(`Restoring saved game state - ships placed: ${parsedShipsPlaced}`);
          this.playerBoard = parsedBoard;
          this.shipsPlaced = parsedShipsPlaced;
          this.rebuildPlayerShipPositions();
          
          // Set player turn based on ship placement
          if (parsedShipsPlaced >= this.boardSize) {
            this.isPlayerTurn = true;
          } else {
            this.isPlayerTurn = null;
          }
          
          this.updateGameStateMessages();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error restoring local game state:', error);
      return false;
    }
  }

  // Add method to update messages based on game state
  updateGameStateMessages() {
    if (this.shipsPlaced < this.boardSize) {
      this.message = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
      this.instructionText = `Tap on Player Board ${this.boardSize - this.shipsPlaced} times`;
      // Ensure player turn is null during ship placement
      this.isPlayerTurn = null;
    } else {
      this.message = "All ships placed! Click on the enemy board to attack.";
      this.instructionText = "Attack the enemy board";
      
      // Check if we need to trigger enemy move after loading game with all ships placed
      if (!this.isPlayerTurn && !this.gameEnded) {
        console.log('Enemy moving after ship placement completion');
        this._enemyMoveTimeout = setTimeout(() => this.enemyMove(), 1000);
      }
    }
  }

  // Add method to save game state locally
  saveLocalGameState() {
    try {
      localStorage.setItem('playerBoard', JSON.stringify(this.playerBoard));
      localStorage.setItem('shipsPlaced', this.shipsPlaced.toString());
      console.log(`Saved local game state: ${this.shipsPlaced} ships placed`);
    } catch (error) {
      console.error('Error saving local game state:', error);
    }
  }

  async loadGameState() {
    try {
      // Check if we have a game ID in localStorage
      if (this.gameId) {
        console.log(`Attempting to load game with ID: ${this.gameId}`);
        
        try {
          // Try to get the game from the server
          await this.getGame();
          console.log('Game loaded successfully');
          this._initialLoadComplete = true;
        } catch (error) {
          console.error('Failed to load game:', error);
          
          // If the game doesn't exist, create a new one
          if (error.message === 'Game not found') {
            console.log('Creating new game because existing game was not found');
            this.gameId = null;
            localStorage.removeItem('gameId');
            await this.createGame();
          }
        }
      } else {
        // No game ID, create a new game
        console.log('No game ID found - creating new game');
        await this.createGame();
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      this._initialLoadComplete = true;
    }
  }
}

customElements.define('game-board', GameBoard);