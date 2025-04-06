const axios = require('axios');

const API_URL = 'https://zwibl9vs56.execute-api.us-east-1.amazonaws.com';
let gameId;

describe('Battleship API Tests', () => {
  // POST /games
  test('Should create a new game', async () => {
    const response = await axios.post(`${API_URL}/games`);
    expect(response.status).toBe(201);
    expect(response.data.gameId).toBeDefined();
    gameId = response.data.gameId;
  });

  // GET /games/{gameId}
  test('Should get an existing game', async () => {
    const response = await axios.get(`${API_URL}/games/${gameId}`);
    expect(response.status).toBe(200);
    expect(response.data.gameId).toBe(gameId);
    expect(response.data.status).toBe('SETUP');
  });

  // PUT /games/{gameId}
  test('Should update game state', async () => {
    const gameState = {
      playerBoard: Array(10).fill(Array(10).fill(null)),
      enemyBoard: Array(10).fill(Array(10).fill(null)),
      gameStatus: 'IN_PROGRESS'
    };

    const response = await axios.put(`${API_URL}/games/${gameId}`, gameState);
    expect(response.status).toBe(200);
    expect(response.data.gameStatus).toBe('IN_PROGRESS');
  });

  // DELETE /games/{gameId}
  test('Should delete a game', async () => {
    const response = await axios.delete(`${API_URL}/games/${gameId}`);
    expect(response.status).toBe(200);

    // Verify game is deleted by trying to get it
    try {
      await axios.get(`${API_URL}/games/${gameId}`);
    } catch (error) {
      expect(error.response.status).toBe(404);
    }
  });
}); 