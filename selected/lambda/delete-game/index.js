const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Parse the detail from the EventBridge event
    const detail = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
    
    const connectionId = detail.connectionId;
    const gameId = detail.gameId;
    
    if (!gameId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Game ID is required' })
      };
    }

    if (!connectionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Connection ID is required' })
      };
    }
    
    // Database Interaction
    await dynamoDB.delete({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA'
      }
    }).promise();
    
    console.log(`Game ${gameId} deleted successfully`);
    
    // Publish to EventBridge
    await eventBridge.putEvents({
      Entries: [{
        Source: 'game.service',
        DetailType: 'GameDeleted',
        Detail: JSON.stringify({
          gameId: gameId,
          connectionId: connectionId,
          deletedAt: new Date().toISOString()
        }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Game deleted successfully',
        gameId: gameId
      })
    };
  }
  catch (error) {
    console.error('Error deleting game:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error deleting game',
        error: error.message
      })
    };
  }
};