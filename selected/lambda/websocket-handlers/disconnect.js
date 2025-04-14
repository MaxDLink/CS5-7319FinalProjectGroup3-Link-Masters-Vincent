const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

// This lambda is triggered when a client disconnects from the WebSocket API
exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    await dynamoDB.delete({
      TableName: process.env.CONNECTIONS_TABLE,
      Key: {
        connectionId: connectionId
      }
    }).promise();
    
    // Publish a disconnection event to EventBridge
    await eventBridge.putEvents({
      Entries: [{
        Source: 'websocket.service',
        DetailType: 'ClientDisconnected',
        Detail: JSON.stringify({
          connectionId: connectionId,
          timestamp: new Date().toISOString()
        }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    return {
      statusCode: 200,
      body: 'Disconnected'
    };
  } catch (error) {
    console.error('Error in disconnect handler:', error);
    return {
      statusCode: 500,
      body: 'Failed to disconnect: ' + error.message
    };
  }
}; 