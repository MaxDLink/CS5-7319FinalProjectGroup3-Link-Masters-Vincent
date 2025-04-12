const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Extract details from the event
    let detail;
    if (typeof event.detail === 'string') {
      detail = JSON.parse(event.detail);
    } else {
      detail = event.detail || {};
    }
    
    const connectionId = detail.connectionId;
    const gameId = detail.gameId;
    
    // if (!gameId) {
    //   return {
    //     statusCode: 400,
    //     body: JSON.stringify({ message: 'Game ID is required' })
    //   };
    // }
    
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
      
      // Create a simplified error event payload
      const errorEventData = {
        gameId: gameId,
        connectionId: connectionId,
        error: 'Game not found'
      };
      
      // Publish a not found event
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
    
    const gameData = result.Item;
    console.log(`Game ${gameId} retrieved successfully`);
    
    // Publish an event with the game data
    console.log('Attempting to publish GameRequested event to EventBridge');
    console.log('Using event bus:', process.env.EVENT_BUS_NAME);
    
    // Include all game data in the event payload
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
      // Build the complete event entry for better debugging
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
      
      // Check if there were any event publishing failures
      if (eventResult.FailedEntryCount > 0) {
        console.error('Failed to publish event:', JSON.stringify(eventResult.Entries, null, 2));
      }
    } catch (eventError) {
      console.error('Error publishing event to EventBridge:', eventError);
      // Continue execution even if event publishing fails
    }
    
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