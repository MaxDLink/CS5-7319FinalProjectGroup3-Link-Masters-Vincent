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
      losses: { type: Number },
      gameState: { type: String },
      isCreatingGame: { type: Boolean }
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
    
    // Game state machine (INIT, PLACEMENT, BATTLE)
    this.gameState = 'INIT';
    
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
    
    // WebSocket connection properties
    this.websocket = null;
    this.websocketReconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // Set to false in handler. Flag to prevent endless loop of creating games: init --> onopen --> createGame() --> wait for websocket --> Init 
    // use local storage to persist across websocket reconnects 
    // if no local storage, set to true 
    // if local storage, set to false 
    this.isCreatingGame = !localStorage.getItem('gameCreationAttempted');

  }

  connectedCallback() {
    super.connectedCallback();
    
    console.log('GameBoard connected to DOM');
    
    // Initialize with the default game state
    this.gameState = 'INIT';
    
    // Initialize the WebSocket connection
    this.initWebSocket();
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
      console.log("Orientation changed");
      setTimeout(() => this.updateBoardSizes(), 100);
    });
    
    // Set up window resize listener
    window.addEventListener('resize', () => {
      this.updateBoardSizes();
    });
    
    // Add event listener for game-reset event from navbar
    window.addEventListener('game-reset', () => {
      console.log('Game reset event received');
      if (this.gameId) {
        // Delete the current game first, then create a new one after reset
        this.deleteGame();
      } else {
        // If no game ID, just reset the board
        this.resetGame();
      }
    });
    
    // Add event listener for return-to-game event from profile view
    window.addEventListener('return-to-game', (event) => {
      console.log('Return to game event received:', event.detail);
      
      if (event.detail && event.detail.preserveGameState && event.detail.gameId) {
        console.log('Preserving game state with gameId:', event.detail.gameId);
        
        // Ensure the game ID is set correctly
        this.gameId = event.detail.gameId;
        localStorage.setItem('gameId', this.gameId);
        // fetch game id from dynamo db 
        
        // Refresh the game state from the server without resetting
        if (this.isWebSocketReady()) {
          console.log('WebSocket is ready, fetching game state...');
          this.getGame();
        } else {
          console.log('WebSocket not ready, reconnecting...');
          // Reconnect WebSocket and then fetch game
          this.waitForWebSocketConnection()
            .then(() => this.getGame())
            .catch(err => console.error('Failed to fetch game after returning:', err));
        }
      }
    });
    
    // Get saved win/loss stats from local storage
    const savedWins = localStorage.getItem('playerWins');
    const savedLosses = localStorage.getItem('playerLosses');
    
    if (savedWins !== null) {
      this.wins = parseInt(savedWins, 10);
    }
    
    if (savedLosses !== null) {
      this.losses = parseInt(savedLosses, 10);
    }
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

  // Initialize WebSocket connection with state machine awareness
  initWebSocket() { // Where the websocket starts in the program 
    if (this.websocket && this.websocket.readyState !== WebSocket.CLOSED) {
      console.log('WebSocket already exists, not recreating');
      return;
    }
    
    const wsUrl = 'wss://yzondw43l7.execute-api.us-east-1.amazonaws.com/prod/';
    console.log('Initializing WebSocket connection to:', wsUrl);
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('WebSocket connection established');
      
      // Dispatch event for connection established
      const event = new CustomEvent('websocket-connected', { detail: { connected: true } });
      this.dispatchEvent(event);
      
       //local storage check to prevent endless loop 
      const storedGameId = localStorage.getItem('gameId');
      if (storedGameId) {
        this.gameId = storedGameId; 
        console.log('Game ID found in local storage:', this.gameId);
        this.getGame();  
        return; 
      }
      if (!this.gameId) {
        this.createGame(); 
      }
     
    };
    
    this.websocket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      console.log('WebSocket message received:', response);

      // console.log('response action: ', response.type);

      // Handle response based on action from websocket
      // only goes into this if this.isCreatingGame is true. Once a game is created, this.isCreatingGame is set to false in localstorage to 
      // persist between refreshes and websocket reconnects 
      if (response.type === 'GameCreated' && !this.gameId) {
        this.gameId = response.gameId;
        console.log(`New game created with ID: ${this.gameId}`);
        
        // Initialize game state based on the server response
        this.handleGameData(response.data);
        
        // Cache game ID in local storage
        localStorage.setItem('gameId', this.gameId);
        console.log('Game ID after creating game:', this.gameId);
      }
      else if (response.type === 'GameRequested') {
        console.log('Game data received from server');
        
        // Update game state based on server data
        this.handleGameData(response.data);
      }
      else if (response.type === 'GameUpdated') {
        console.log('Game updated successfully');
        
        // Process the updated game data if there are any changes from the server
        if (response.data && response.data.gameId === this.gameId) {
          this.handleGameData(response.data);
        }
      }
      else if (response.type === 'GameDeleted') {
        console.log('Game deleted successfully'); 
        this.createGame();
        this.resetGame();
      }
      else if (response.action === 'error') {
        console.error('Error from server:', response.message);
        this.message = `Error: ${response.message}`;
        this.requestUpdate();
      }
      else if (response.action === 'GameUpdated') {
        console.log('Game updated notification received');
        
        // Handle real-time update from another connection
        if (response.gameId === this.gameId) {
          console.log('Real-time update for current game, refreshing state...');
          this.getGame();
        }
      }
    };
    
    this.websocket.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      
      // If connection was closed unexpectedly, try to reconnect
      if (!this._intentionalClose) {
        console.log('Unexpected close. Attempting to reconnect in 3 seconds...');
        setTimeout(() => {
          this.initWebSocket();
        }, 3000);
      }
      
      this.websocket = null;
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.message = "Connection error. Please try again later.";
      this.requestUpdate();
    };
  }
  
  // Update game state machine based on current progress
  updateGameState() {
    const oldState = this.gameState;
    
    if (!this.gameId && this.shipsPlaced === 0) {
      this.gameState = 'INIT';
    } else if (this.shipsPlaced < this.boardSize) {
      this.gameState = 'PLACEMENT';
    } else {
      this.gameState = 'BATTLE';
    }
    
    if (oldState !== this.gameState) {
      console.log(`Game state changed: ${oldState} -> ${this.gameState}`);
      
      // Update UI based on new state
      if (this.gameState === 'PLACEMENT') {
        this.message = `Place ${this.boardSize - this.shipsPlaced} ships on your board`;
        this.instructionText = `Tap on Player Board ${this.boardSize - this.shipsPlaced} times`;
      } else if (this.gameState === 'BATTLE') {
        this.message = "All ships placed! Click on the enemy board to attack.";
        this.instructionText = "Attack the enemy board";
        
        // Set player turn if transitioning to battle
        if (this.isPlayerTurn === null) {
          this.isPlayerTurn = true;
          this.updateGame();
        }
      }
    }
  }
  
  // Handle game created message
  handleGameCreated(message) {
    const gameId = message.data?.gameId || message.gameId;
    
    if (gameId) {
      console.log(`Game created: ${gameId}`);
      this.gameId = gameId;
      
      // Reset player ship positions for new game
      this.playerShipPositions = [];
      this.shipsPlaced = 0;
      
      // Transition to PLACEMENT state
      this.gameState = 'PLACEMENT';
      
      // Update game on server
      this.updateGame();
    } else {
      console.error('Missing gameId in GameCreated message');
    }
  }
  
  // Handle server errors
  handleServerError(message) {
    if (message.message && message.message.includes('not found') && this.gameId) {
      console.log('Game not found, creating a new one');
      this.gameId = null;
      this.playerShipPositions = [];
      this.gameState = 'INIT';
      //this.createGame();
    } else {
      console.warn('Server error:', message.message);
    }
  }
  
  // Helper method to check if WebSocket is connected and ready
  isWebSocketReady() {
    return this.websocket && this.websocket.readyState === WebSocket.OPEN;
  }
  
  // Create a new game via WebSocket
  createGame() {  
    console.log('Sending create game request...');
    this.isCreatingGame = false; 
    // stores a key value pair in local storage where key is gameCreationAttempted and value is true 
    localStorage.setItem('gameCreationAttempted', 'true');
    this.websocket.send(JSON.stringify({
      action: 'createGame', // create game action through websocket 
      data: {
        playerBoard: this.playerBoard,
        enemyBoard: this.enemyBoard,
        enemyShipPositions: this.enemyShipPositions
      }
    }));
  }
  
  // Update game state on server via WebSocket
  updateGame() {
    console.log("Gameid before updateGame", this.gameId);
    if (!this.isWebSocketReady() || !this.gameId) return;
    
    this.rebuildPlayerShipPositions();
    
    console.log(`Updating game (state: ${this.gameState})...`);
    this.websocket.send(JSON.stringify({
      action: 'updateGame',
      data: {
        gameId: this.gameId,
        playerBoard: this.playerBoard,
        enemyBoard: this.enemyBoard,
        shipsPlaced: this.shipsPlaced,
        playerShipPositions: this.playerShipPositions,
        enemyShipPositions: this.enemyShipPositions,
        isPlayerTurn: this.isPlayerTurn,
        status: this.gameEnded ? 'COMPLETED' : 'IN_PROGRESS',
        winner: this.winner || null,
        wins: this.wins,
        losses: this.losses,
        gameState: this.gameState // Include current state in update
      }
    }));
  }
  
  // Get game from server via WebSocket
  getGame() {
    if (this.isWebSocketReady()) {
      console.log(`Requesting game data (state: ${this.gameState})...`);
      this.websocket.send(JSON.stringify({
        action: 'getGame',
        data: { gameId: this.gameId }
      }));
    }
  }
  
  // Simplified WebSocket connection promise
  waitForWebSocketConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.isWebSocketReady()) return resolve();
      
      if (!this.websocket){
        console.log('calling initWebSocket');
        this.initWebSocket();
      }
        
      
      
      const handler = () => resolve();
      this.addEventListener('websocket-connected', handler, { once: true });
      
          setTimeout(() => {
        this.removeEventListener('websocket-connected', handler);
        reject(new Error('Connection timeout'));
      }, timeout);
    });
  }
  
  // Handle player cell click according to game state
  handlePlayerCellClick(row, col) {
    console.log(`Player cell clicked: ${row}, ${col} (state: ${this.gameState})`);
    
    // If the game is ended, don't allow any moves
    if (this.gameEnded) {
      console.log('Game has ended, no more moves allowed');
      return;
    }
    
    // During the INIT or PLACEMENT states, allow placing ships
    if (this.gameState === 'INIT' || this.gameState === 'PLACEMENT') {
      // Don't allow placing ships on cells that already have ships
      if (this.playerBoard[row][col] === 'S') {
        console.log('Ship already placed here');
        return;
      }
      
      // Place a ship on the player's board
      this.playerBoard[row][col] = 'S';
      this.shipsPlaced++;
      
      // Add to ship positions
      this.playerShipPositions.push({ row, col });
      
      // Update the game state to PLACEMENT once the first ship is placed
      if (this.gameState === 'INIT' && this.shipsPlaced === 1) {
        this.gameState = 'PLACEMENT';
        console.log('Game state changed to: PLACEMENT');
      }
      
      // Play sound effect
      sounds.initAudioContext();
      // sounds.PlaceShip();
      
      // Update message based on remaining ships to place
      if (this.shipsPlaced < this.boardSize) {
        this.message = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
        this.instructionText = `Tap on Player Board ${this.boardSize - this.shipsPlaced} times`;
            } else {
        // All ships placed, transition to BATTLE state
        this.isPlayerTurn = true; // Player gets first turn after placing all ships
        this.gameState = 'BATTLE';
        console.log('Game state changed to: BATTLE');
        this.message = "All ships placed! Click on the enemy board to attack.";
        this.instructionText = "Attack the enemy board";
      }
      
      // Update game state on server
      this.updateGame();
      
      // Re-render to show the updated board
      this.requestUpdate();
    } 
    // During BATTLE state, don't allow clicking on your own board
    else if (this.gameState === 'BATTLE') {
      this.message = "During battle, tap on the enemy's board to attack.";
      this.requestUpdate();
    }
  }
  
  // Load game state method - simplified
  loadGameState() {
    if (this.gameId) {
      this.getGame();
        } else {
      this.gameState = 'INIT';
      // this.createGame();
    }
  }
  
  resetGame() {
    console.log("Resetting game...");
    
    // Clear all timeouts
    if (this._enemyMoveTimeout) clearTimeout(this._enemyMoveTimeout);
    if (this._enemyAnimationTimeout) clearTimeout(this._enemyAnimationTimeout);
    if (this._enemyCleanupTimeout) clearTimeout(this._enemyCleanupTimeout);
    if (this._playerAttackTimeout) clearTimeout(this._playerAttackTimeout);
    if (this._playerCleanupTimeout) clearTimeout(this._playerCleanupTimeout);
    
    // Reset game state
    this.gameId = null;
    this.shipsPlaced = 0;
    this.playerBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
    this.message = `Place ${this.boardSize} ships on your board`;
    this.instructionText = `Tap on Player Board ${this.boardSize} times`;
    this.playerShipPositions = [];
    this.placeEnemyShips();
    
    // Reset game flow state
    this.isPlayerTurn = null;
    this.gameEnded = false;
    this.winner = '';
    
    // Reset animations
    this.animatingFireball = false;
    this.fireballPosition = null;
    this.lastHitPosition = null;
    this.hitResult = null;
    this.lastEnemyHitPosition = null;
    this.enemyHitResult = null;
    this.animatingEnemyFireball = false;
    this.enemyFireballPosition = null;
    
    // Reset game state to INIT
    this.gameState = 'INIT';
    console.log('Game state reset to: INIT');
    
    // Update UI
    this.requestUpdate();
    
    // Create new game if WebSocket is ready
    if (this.isWebSocketReady()) {
      //this.createGame();
    } else {
      console.log('WebSocket not ready, will create game once connected');
        this.initWebSocket();
    }
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

  // Handle enemy cell click based on game state
  handleEnemyCellClick(row, col) {
    console.log(`Enemy cell clicked: ${row}, ${col} (state: ${this.gameState})`);
    
    // Only process clicks in BATTLE state
    if (this.gameState !== 'BATTLE') {
      console.log('Ignoring click - not in battle phase');
      this.message = "Place all your ships first!";
      this.requestUpdate();
      return;
    }

    // Check if game is ended or not player's turn
    if (this.gameEnded || this.isPlayerTurn === false) {
      console.log('Cannot attack: game ended or not player turn');
      return;
    }

    // Check if cell was already targeted
    if (this.enemyBoard[row][col] === 'X' || this.enemyBoard[row][col] === 'O') {
      this.message = 'You already tried that spot!';
      this.requestUpdate();
      return;
    }
    
    // Start the attack animation
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
        this.createWaterSplash(row, col, true);
      }
      
      // Update game state
      this.updateGame();
       
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
  
  // Enemy AI move implementation
  enemyMove() {
    // Only allow enemy moves in BATTLE state and when it's the enemy's turn
    if (this.gameState !== 'BATTLE' || this.gameEnded || this.isPlayerTurn === true) {
      console.log("Enemy move prevented", {
        gameState: this.gameState,
        gameEnded: this.gameEnded,
        isPlayerTurn: this.isPlayerTurn
      });
      return;
    }
    
    console.log("Enemy is making a move");

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
          }
          
          // Update game state
          this.updateGame();

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

  // Start the fireball animation from player board to enemy board
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
    console.log(`Game ended! Winner: ${winner}`);
    
    // Update game state and end flags
    this.gameEnded = true;
    this.winner = winner;
    this.gameState = 'ENDED';
    
    // Update win/loss counters
    if (winner === 'Player') {
      this.wins = (this.wins || 0) + 1;
      localStorage.setItem('playerWins', this.wins);
    } else {
      this.losses = (this.losses || 0) + 1;
      localStorage.setItem('playerLosses', this.losses);
    }
    
    // Update game data on server
    this.updateGame();
    
    // Show winner popup with delay to ensure DOM is updated
    setTimeout(() => {
      const winnerPopup = this.shadowRoot.querySelector('#winnerPopup');
      if (winnerPopup) {
        winnerPopup.show(winner);
      } else {
        console.error('Winner popup component not found!');
      }
    }, 100);
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
        // Include both intact ships ('S') and hit ships ('X') 
        if (this.playerBoard[row][col] === 'S' || this.playerBoard[row][col] === 'X') {
          this.playerShipPositions.push({ row, col });
        }
      }
    }
    
    console.log(`Rebuilt player ship positions: ${this.playerShipPositions.length} ships found (including both intact and hit ships)`);
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
        // Count both intact ships ('S') and hit ships ('X') as valid ships
        if (this.playerBoard[row][col] === 'S' || this.playerBoard[row][col] === 'X') {
          count++;
        }
      }
    }
    
    console.log(`Counted ${count} ships on board (including both intact and hit ships)`);
    return count;
  }

  // Helper method to rebuild enemyShipPositions from the board data
  rebuildEnemyShipPositions() {
    // Reset ship positions
    this.enemyShipPositions = [];
    
    // Make sure enemyBoard exists and is an array before processing
    if (!this.enemyBoard || !Array.isArray(this.enemyBoard)) {
      console.warn('Enemy board not properly initialized. Creating empty board.');
      this.enemyBoard = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
      return;
    }
    
    // Scan through the board to find all ships
    for (let row = 0; row < this.enemyBoard.length; row++) {
      if (!Array.isArray(this.enemyBoard[row])) {
        console.warn(`Invalid row at index ${row}, skipping`);
        continue;
      }
      for (let col = 0; col < this.enemyBoard[row].length; col++) {
        // Include both intact ships ('S') and hit ships ('X') 
        if (this.enemyBoard[row][col] === 'S' || this.enemyBoard[row][col] === 'X') {
          this.enemyShipPositions.push({ row, col });
        }
      }
    }
    
    console.log(`Rebuilt enemy ship positions: ${this.enemyShipPositions.length} ships found (including both intact and hit ships)`);
  }

  // Handle game data for both initial load and updates
  handleGameData(gameData) {
    // Only proceed if the data is for our gameId
    if (!gameData || gameData.gameId !== this.gameId) {
      console.warn('Ignoring game data for different gameId', gameData?.gameId, 'our gameId:', this.gameId);
      return false;
    }
    
    console.log(`Processing game data for ${this.gameId}:`, gameData);
    // TODO - we get more handle response messages after this is hit for some reason, which makes new games get created 
    // Update boards if provided
    if (gameData.playerBoard) {
      this.playerBoard = gameData.playerBoard;
    }
    
    if (gameData.enemyBoard) {
      this.enemyBoard = gameData.enemyBoard;
    }
    
    // Update ships placed count if provided
    if (typeof gameData.shipsPlaced === 'number') {
      this.shipsPlaced = gameData.shipsPlaced;
    }
    
    // Update ship positions if available
    if (gameData.playerShipPositions) {
      this.playerShipPositions = gameData.playerShipPositions;
    } else {
      // Rebuild ship positions if not provided
      this.rebuildPlayerShipPositions();
    }
    
    if (gameData.enemyShipPositions) {
      this.enemyShipPositions = gameData.enemyShipPositions;
    } else {
      // Rebuild ship positions if not provided
      this.rebuildEnemyShipPositions();
    }
    
    // Update game status
    if (gameData.status === 'COMPLETED') {
      this.gameEnded = true;
      if (gameData.winner) {
        this.winner = gameData.winner;
      }
    }
    
    // Update turn state
    if (this.shipsPlaced >= this.boardSize) {
      if (typeof gameData.isPlayerTurn === 'boolean') {
        this.isPlayerTurn = gameData.isPlayerTurn;
      }
                } else {
      // During ship placement, isPlayerTurn should be null
      this.isPlayerTurn = null;
    }
    
    // Update win/loss counts if provided
    if (typeof gameData.wins === 'number') {
      this.wins = gameData.wins;
      localStorage.setItem('playerWins', this.wins);
    }
    
    if (typeof gameData.losses === 'number') {
      this.losses = gameData.losses;
      localStorage.setItem('playerLosses', this.losses);
    }
    
    // Update game state based on ships placed
    if (this.shipsPlaced === 0) {
      this.gameState = 'INIT';
      this.message = `Place ${this.boardSize} ships on your board.`;
      this.instructionText = `Tap on Player Board ${this.boardSize} times`;
    } else if (this.shipsPlaced < this.boardSize) {
      this.gameState = 'PLACEMENT';
      this.message = `Place ${this.boardSize - this.shipsPlaced} more ships on your board.`;
      this.instructionText = `Tap on Player Board ${this.boardSize - this.shipsPlaced} times`;
      } else {
      this.gameState = 'BATTLE';
      this.message = "All ships placed! Click on the enemy board to attack.";
      this.instructionText = "Attack the enemy board";
      
      // Check if we need to trigger enemy move after loading game with all ships placed
      if (!this.isPlayerTurn && !this.gameEnded) {
        console.log('Enemy moving after game data was processed');
        this._enemyMoveTimeout = setTimeout(() => this.enemyMove(), 1000);
      }
    }
    
    console.log(`Game state after data processing: ${this.gameState}`);
    
    // Force UI update
    this.requestUpdate();
    
    return true;
  }

  // Switch turns between player and enemy
  switchTurn() {
    this.isPlayerTurn = !this.isPlayerTurn;
    console.log(`Turn switched. Is it player's turn? ${this.isPlayerTurn}`);

    // Update message based on whose turn it is
    if (this.isPlayerTurn) {
      this.message = 'Tap on the enemy\'s board to try to hit ships';
                } else {
      this.message = 'Wait for the enemy\'s turn';
    }
    
    this.requestUpdate(); // Re-render to show updated message
  }

  // Delete the current game via WebSocket
  deleteGame() {
    if (!this.isWebSocketReady() || !this.gameId) {
      console.log('Cannot delete game: WebSocket not ready or no gameId');
      this.resetGame();
      return;
    }
    
    console.log(`Deleting game ${this.gameId}...`);
    this.websocket.send(JSON.stringify({
            action: 'deleteGame',
            data: {
        gameId: this.gameId
      }
    }));
    
    // When the deleteGame response comes back, the onmessage handler 
    // will call resetGame() to start a new game
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
}

customElements.define('game-board', GameBoard);