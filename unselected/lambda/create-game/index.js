const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Extract details from the event - handle different formats
    let detail;
    let connectionId;
    
    try {
      // Check if event.detail is a string
      if (typeof event.detail === 'string') {
        detail = JSON.parse(event.detail);
      } else if (typeof event.detail === 'object') {
        detail = event.detail;
      } else {
        // Fallback if detail is not available as expected
        detail = { connectionId: 'unknown' };
        console.warn('Unable to extract detail from event, using fallback');
      }
      
      // Extract connectionId - handle various structures
      connectionId = detail.connectionId || 
                    (detail.data && detail.data.connectionId) ||
                    'unknown';
                    
      console.log('Extracted connectionId:', connectionId);
    } catch (error) {
      console.error('Error parsing event detail:', error);
      detail = { connectionId: 'unknown' };
      connectionId = 'unknown';
    }
    
    // Generate a unique game ID
    const gameId = uuidv4();
    console.log(`Generated new game ID: ${gameId}`);
    
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
    
    console.log(`Game ${gameId} created successfully and stored in DynamoDB`);
    
    // Create the event data with gameId prominently included
    const eventData = {
      gameId: gameId, // Ensure gameId is at the top level
      connectionId: connectionId,
      playerBoard: gameItem.playerBoard,
      enemyBoard: gameItem.enemyBoard,
      shipsPlaced: gameItem.shipsPlaced,
      status: gameItem.status,
      isPlayerTurn: gameItem.isPlayerTurn,
      wins: gameItem.wins,
      losses: gameItem.losses
    };
    
    console.log(`Publishing GameCreated event with data:`, JSON.stringify(eventData, null, 2));
    
    // Double-check that gameId is included
    if (!eventData.gameId) {
      console.error('WARNING: gameId is missing from eventData!');
      // Add it explicitly
      eventData.gameId = gameId;
    }
    
    // Create a simplified event payload for better compatibility
    const simpleEventData = {
      gameId: gameId,
      connectionId: connectionId
    };
    
    console.log('Using simplified event data to ensure gameId is transmitted properly');
    
    // Publish an event to notify about the game creation
    const eventResult = await eventBridge.putEvents({
      Entries: [{
        Source: 'game.service',
        DetailType: 'GameCreated',
        Detail: JSON.stringify(simpleEventData), // Use simplified data
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    console.log('Event published with result:', JSON.stringify(eventResult, null, 2));
    
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