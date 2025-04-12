const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Extract details from the event
    const detail = JSON.parse(event.detail);
    const connectionId = detail.connectionId;
    const gameId = detail.gameId;
    
    if (!gameId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Game ID is required' })
      };
    }
    
    // Retrieve the game from DynamoDB
    const result = await dynamoDB.get({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA'
      }
    }).promise();
    
    // Check if the game exists
    if (!result.Item) {
      console.log(`Game ${gameId} not found`);
      
      // Publish a not found event
      await eventBridge.putEvents({
        Entries: [{
          Source: 'game.service',
          DetailType: 'GameRequested',
          Detail: JSON.stringify({
            gameId: gameId,
            connectionId: connectionId,
            error: 'Game not found'
          }),
          EventBusName: process.env.EVENT_BUS_NAME
        }]
      }).promise();
      
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Game not found' })
      };
    }
    
    const gameData = result.Item;
    console.log(`Game ${gameId} retrieved successfully`);
    
    // Publish an event with the game data
    await eventBridge.putEvents({
      Entries: [{
        Source: 'game.service',
        DetailType: 'GameRequested', //change to gameUpdateRequest 
        Detail: JSON.stringify({
          gameId: gameId,
          connectionId: connectionId,
          playerBoard: gameData.playerBoard,
          enemyBoard: gameData.enemyBoard,
          shipsPlaced: gameData.shipsPlaced,
          playerHits: gameData.playerHits,
          enemyHits: gameData.enemyHits,
          status: gameData.status,
          isPlayerTurn: gameData.isPlayerTurn,
          wins: gameData.wins,
          losses: gameData.losses
        }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Game retrieved successfully',
        game: gameData
      })
    };
  } catch (error) {
    console.error('Error retrieving game:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error retrieving game',
        error: error.message
      })
    };
  }
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}); 