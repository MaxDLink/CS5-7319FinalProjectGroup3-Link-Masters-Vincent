Battleship Game: 

### **Summary of Battleship Rules**

**Objective:**  
The goal of Battleship is to sink all of your opponent's ships before they sink yours. Players guess the locations of each other's ships by calling out board coordinates.

---

**Setup:**
- Each player places **5 ships** (Carrier, Battleship, Cruiser, Submarine, Destroyer) on their board, either vertically or horizontally (no diagonal placement).
- Ships cannot overlap or extend off the board. Once placed, ships cannot be moved.

---

**Gameplay:**
1. Players take turns guessing coordinates.
2. The opponent responds with "hit" or "miss" based on whether the guessed coordinate hits one of their ships.
3. Players mark hits with red pegs and misses with white pegs on their boards.

---

**Sinking Ships:**
- When all spaces occupied by a ship are hit, the ship is sunk, and the opponent announces "hit and sunk."
- The game ends when all of one player's ships are sunk.

### [Project Documentation Here](./webapp/notes/architecture.md)

## Useful commands to run project

- `cd webapp, npm run dev` starts a local development server
- `cdk deploy` deploy this stack to your default AWS account/region

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
