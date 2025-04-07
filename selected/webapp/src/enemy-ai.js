export class EnemyAI {
    constructor(boardSize = 4) {
      this.boardSize = boardSize;
      this.possibleMoves = this.generateAllPossibleMoves();
    }
  
    // Generate all possible moves based on the board size
    generateAllPossibleMoves() {
      const moves = [];
      for (let row = 0; row < this.boardSize; row++) {
        for (let col = 0; col < this.boardSize; col++) {
          moves.push({ row, col });
        }
      }
      return moves;
    }
  
    // Randomly select a move from the list of possible moves
    selectRandomMove() {
      if (this.possibleMoves.length === 0) {
        console.warn('No more possible moves, regenerating all moves');
        this.possibleMoves = this.generateAllPossibleMoves();
        
        // Filter out moves that have already been made (if playerBoard is provided)
        if (this.lastPlayerBoard) {
          this.possibleMoves = this.possibleMoves.filter(move => {
            const cell = this.lastPlayerBoard[move.row][move.col];
            return cell !== 'X' && cell !== 'O'; // Filter out cells that are already hit or miss
          });
        }
        
        // If still no moves, return null (this should never happen in a normal game)
        if (this.possibleMoves.length === 0) {
          console.error('Still no possible moves after regeneration');
          return null;
        }
      }
      
      const randomIndex = Math.floor(Math.random() * this.possibleMoves.length);
      return this.possibleMoves.splice(randomIndex, 1)[0];
    }
  
    // Simulate an attack on the player's board
    attack(playerBoard) {
      if (playerBoard) {
        // Store the current player board for filtering already attacked cells
        this.lastPlayerBoard = playerBoard;
        
        // Filter out moves that have already been made
        this.possibleMoves = this.possibleMoves.filter(move => {
          const cell = playerBoard[move.row][move.col];
          return cell !== 'X' && cell !== 'O'; // Filter out cells that are already hit or miss
        });
        
        // Simple AI: randomly select a cell to attack
        const move = this.selectRandomMove();
        
        if (move) {
          const { row, col } = move;
          console.log("Enemy AI is thinking....");
          console.log(`Enemy attacks: ${row}, ${col}`);
          
          // Note: We're only returning the move, not modifying the board
          // The actual board modification happens in the GameBoard component
          return move;
        }
        return null;
      }
      return null;
    }
  } 
