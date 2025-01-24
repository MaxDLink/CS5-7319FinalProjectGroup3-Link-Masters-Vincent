export class EnemyAI {
    constructor() {
      this.possibleMoves = this.generateAllPossibleMoves();
    }
  
    // Generate all possible moves on a 10x10 board
    generateAllPossibleMoves() {
      const moves = [];
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          moves.push({ row, col });
        }
      }
      return moves;
    }
  
    // Randomly select a move from the list of possible moves
    selectRandomMove() {
      if (this.possibleMoves.length === 0) {
        console.error('No more possible moves');
        return null;
      }
      const randomIndex = Math.floor(Math.random() * this.possibleMoves.length);
      return this.possibleMoves.splice(randomIndex, 1)[0];
    }
  
    // Example method to simulate an attack
    attack(playerBoard) {
      const move = this.selectRandomMove();
      if (move) {
        const { row, col } = move;
        console.log(`Enemy attacks: ${row}, ${col}`);
        // Implement logic to check if the attack hits a ship on the player's board
        if (playerBoard[row][col] === '🚢') {
          console.log('Hit!');
          playerBoard[row][col] = 'X'; // Mark hit
        } else {
          console.log('Miss!');
          playerBoard[row][col] = 'O'; // Mark miss
        }
      }
    }
  }