export class EnemyAI {
    constructor(boardSize = 4) {
      this.boardSize = boardSize;
      this.possibleMoves = this.generateAllPossibleMoves();
    }
  
    generateAllPossibleMoves() {
      const moves = [];
      for (let row = 0; row < this.boardSize; row++) {
        for (let col = 0; col < this.boardSize; col++) {
          moves.push({ row, col });
        }
      }
      return moves;
    }
  
    selectRandomMove() {
      if (this.possibleMoves.length === 0) {
        console.warn('No more possible moves, regenerating all moves');
        this.possibleMoves = this.generateAllPossibleMoves();
        
        // Filter out moves that have been made already (if playerBoard is provided)
        if (this.lastPlayerBoard) {
          this.possibleMoves = this.possibleMoves.filter(move => {
            const cell = this.lastPlayerBoard[move.row][move.col];
            return (cell !== 'X' && cell !== 'O');
          });
        }
        
        if (this.possibleMoves.length === 0) {
          console.error('Still no possible moves after regeneration');
          return null;
        }
      }
      
      const randomIndex = Math.floor(Math.random() * this.possibleMoves.length);
      return this.possibleMoves.splice(randomIndex, 1)[0];
    }
  
    attack(playerBoard) {
      if (playerBoard) {
        this.lastPlayerBoard = playerBoard;
        
        this.possibleMoves = this.possibleMoves.filter(move => {
          const cell = playerBoard[move.row][move.col];
          return cell !== 'X' && cell !== 'O';
        });
        
        const move = this.selectRandomMove();
        
        if (move) {
          const { row, col } = move;
          console.log("Enemy AI is thinking....");
          console.log(`Enemy attacks: ${row}, ${col}`);
          
          // Move is sent to the GameBoard component to have it applied to the local state
          return move;
        }
        return null;
      }
      return null;
    }
  } 
