const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    const connectionId = event.detail.connectionId ?? 'unknown';
    const gameId = event.detail.gameId ?? 'unknown';
    
    // Retrieve the game from DynamoDB
    let result;
    if (gameId !== 'unknown') {
      result = await dynamoDB.get({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          pk: `GAME#${gameId}`,
          sk: 'METADATA'
        }
      }).promise();
    }
    
    const gameData = result.Item ?? null;

    // If game is not present in the database 
    if (!gameData) {
      console.log(`Game ${gameId} not found`);
      
      const errorEventData = {
        gameId: gameId,
        connectionId: connectionId,
        error: 'Game not found'
      };
      
      // make another request for game
      try {
        await eventBridge.putEvents({
          Entries: [{
            Source: 'game.service',
            DetailType: 'GameRequested',
            Detail: JSON.stringify(errorEventData),
            EventBusName: process.env.EVENT_BUS_NAME
          }]
        }).promise();
        
        console.log('Error event published successfully');
      } catch (eventError) {
        console.error('Error publishing error event:', eventError);
      }
      
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Game not found' })
      };
    }

    console.log(`Game ${gameId} retrieved successfully`);
    console.log('Attempting to publish GameRequested event to EventBridge');
    console.log('Using event bus:', process.env.EVENT_BUS_NAME);
    
    const eventData = {
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
    };
    
    console.log('Using event data:', JSON.stringify(eventData, null, 2));
    console.log('EVENT_BUS_NAME environment variable:', process.env.EVENT_BUS_NAME);
    
    try {
      const eventEntry = {
        Source: 'game.service',
        DetailType: 'GameRequested', 
        Detail: JSON.stringify(eventData),
        EventBusName: process.env.EVENT_BUS_NAME
      };
      
      console.log('Publishing event with full entry:', JSON.stringify(eventEntry, null, 2));
      
      const eventResult = await eventBridge.putEvents({
        Entries: [eventEntry]
      }).promise();
      
      console.log('EventBridge putEvents response:', JSON.stringify(eventResult, null, 2));
      
      if (eventResult.FailedEntryCount > 0) {
        console.error('Failed to publish event:', JSON.stringify(eventResult.Entries, null, 2));
      }
    }
    catch (eventError) {
      console.error('Error publishing event to EventBridge:', eventError);
      // CHECK  still let this return even with error
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Game retrieved successfully',
        game: gameData
      })
    };
  }
  catch (error) {
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
