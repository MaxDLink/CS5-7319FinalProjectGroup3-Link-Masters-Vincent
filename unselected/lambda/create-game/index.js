const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Extract details from the event
    const detail = JSON.parse(event.detail);
    const connectionId = detail.connectionId;
    
    // Generate a unique game ID
    const gameId = uuidv4();
    
    // Create a new game record
    const gameItem = {
      pk: `GAME#${gameId}`,
      sk: 'METADATA',
      gameId: gameId,
      playerBoard: Array(4).fill().map(() => Array(4).fill('')),
      enemyBoard: Array(4).fill().map(() => Array(4).fill('')),
      shipsPlaced: 0,
      playerHits: 0,
      enemyHits: 0,
      status: 'IN_PROGRESS',
      isPlayerTurn: null,
      wins: 0,
      losses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save the game to DynamoDB
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE,
      Item: gameItem
    }).promise();
    
    console.log(`Game ${gameId} created successfully`);
    
    // Publish an event to notify about the game creation
    await eventBridge.putEvents({
      Entries: [{
        Source: 'game.service',
        DetailType: 'GameCreated',
        Detail: JSON.stringify({
          gameId: gameId,
          connectionId: connectionId,
          playerBoard: gameItem.playerBoard,
          enemyBoard: gameItem.enemyBoard,
          shipsPlaced: gameItem.shipsPlaced,
          status: gameItem.status,
          isPlayerTurn: gameItem.isPlayerTurn,
          wins: gameItem.wins,
          losses: gameItem.losses
        }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Game created successfully',
        gameId: gameId
      })
    };
  } catch (error) {
    console.error('Error creating game:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error creating game',
        error: error.message
      })
    };
  }
}; 