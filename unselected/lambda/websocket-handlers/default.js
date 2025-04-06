const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

// This Lambda function is triggered when a message is received from a client
exports.handler = async (event) => {
  console.log('Default handler received event:', JSON.stringify(event, null, 2));
  
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  
  // Create a reusable API Gateway Management API client
  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${domainName}/${stage}`
  });
  
  try {
    // Parse the message from the client
    let message;
    try {
      message = JSON.parse(event.body);
      console.log('Parsed message:', message);
    } catch (parseError) {
      console.error('Failed to parse message body:', parseError);
      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: 'Invalid JSON format in request body'
      });
      return { statusCode: 400 };
    }
    
    // Validate the message format
    if (!message.action || !message.data) {
      console.error('Invalid message format:', message);
      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: 'Invalid message format. Expected {action, data}'
      });
      return { statusCode: 400 };
    }
    
    // Forward the message to EventBridge with appropriate source and detail type
    const eventEntry = {
      Source: 'game.service',
      DetailType: getDetailTypeForAction(message.action),
      Detail: JSON.stringify({
        ...message.data,
        connectionId: connectionId
      }),
      EventBusName: process.env.EVENT_BUS_NAME
    };
    
    console.log('Publishing event to EventBridge:', eventEntry);
    
    const result = await eventBridge.putEvents({
      Entries: [eventEntry]
    }).promise();
    
    console.log('Event published successfully:', result);
    
    // Send acknowledgment back to the client
    await sendToClient(apiGatewayManagementApi, connectionId, {
      type: 'acknowledgment',
      message: 'Message received',
      eventId: result.Entries[0].EventId
    });
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Error in default handler:', error);
    
    // Check if the connection still exists before trying to send an error message
    try {
      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: 'Server error: ' + error.message
      });
    } catch (sendError) {
      console.error('Error sending message to client:', sendError);
      // If the connection is gone, clean it up from our database
      if (sendError.statusCode === 410) {
        try {
          await dynamoDB.delete({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId }
          }).promise();
          console.log(`Removed stale connection: ${connectionId}`);
        } catch (deleteError) {
          console.error('Error removing stale connection:', deleteError);
        }
      }
    }
    
    return { statusCode: 500 };
  }
};

// Helper function to map client actions to EventBridge detail types
function getDetailTypeForAction(action) {
  const actionMap = {
    'createGame': 'GameCreated',
    'updateGame': 'GameUpdated',
    'getGame': 'GameRequested',
    'deleteGame': 'GameDeleted',
    'placeShip': 'ShipPlaced',
    'attackPosition': 'AttackInitiated'
  };
  
  return actionMap[action] || 'UnknownAction';
}

// Helper function to send messages to WebSocket clients
async function sendToClient(apiGateway, connectionId, payload) {
  try {
    console.log(`Sending message to ${connectionId}:`, payload);
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(payload)
    }).promise();
    console.log(`Message sent to ${connectionId} successfully`);
  } catch (error) {
    console.error(`Error sending message to ${connectionId}:`, error);
    throw error; // Rethrow for the caller to handle
  }
} 