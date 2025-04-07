AWS event bus architecture documentation 

4/6/25 

## WebSocket Actions
WebSockets are managing numerous critical game events:

1. **Game Creation and Lifecycle**:
   - `createGame`: Initializes a new game with a freshly generated ID
   - `getGame`: Retrieves existing game state from the server
   - `updateGame`: Persists game state changes to the backend
   - `deleteGame`: Removes a game from the server

2. **Player Actions**:
   - **Ship Placement** (`ShipPlaced` event):
     - Each time a player places a ship on their board
     - The complete array of ship positions is sent to the server

   - **Player Attacks** (`PlayerHit` and `PlayerMiss` events):
     - When a player attacks the enemy board and either hits or misses
     - Includes position data and remaining enemy ships count

   - **Enemy Attacks** (`EnemyHit` and `EnemyMiss` events):
     - When the enemy AI attacks the player's board
     - Updates both players about hit/miss results

3. **Game State Transitions**:
   - `GameStarted`: When all ships are placed and active gameplay begins
   - `GameEnded`: When either player or enemy has won
   - Tracks win/loss statistics

4. **Analytics and Session Tracking**:
   - `saveEventBusRecord`: Records all game events for analytics
   - Creates and updates session records with player activity
   - Tracks player connections and disconnections

## Detailed Event Types
The specific event types managed by WebSockets include:

1. **Game Setup Events**:
   - `GameCreated`: Initial game creation with board setup and enemy ship positions
   - `ShipPlaced`: Each time a player places a ship (position is tracked)
   - `GameStarted`: When all ships are placed and gameplay begins

2. **Attack Events**:
   - `PlayerHit` and `PlayerMiss`: Player's attack results
   - `EnemyHit` and `EnemyMiss`: Enemy AI's attack results

3. **Game Conclusion**:
   - `GameEnded`: When the game concludes (with winner information)

4. **Session Events**:
   - Session creation, updates, and termination
   - Player connection and activity tracking

For our help page, we needed to override the websocket components and use mock ship placements instead so that the flow of the tutorial works correctly 

Reset wins and losses to 0 when logging out 

## Data Synchronization
Each WebSocket event also handles:
- Complete board state synchronization
- Ship positions for both player and enemy
- Turn state management
- Game progression tracking

The WebSockets are managing the entire game state, not just player and enemy attacks. Even ship placement is a critical part of the WebSocket communication. Each action updates the entire game state on the server to maintain consistency.


To manage web sockets appropriately we can: 

