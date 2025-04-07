const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

// This Lambda function is triggered when a client connects to the WebSocket API
exports.handler = async (event) => {
  console.log('Connect event received:', JSON.stringify(event, null, 2));
  
  const connectionId = event.requestContext.connectionId;
  const timestamp = new Date().toISOString();
  
  try {
    // Store the connection ID in DynamoDB
    await dynamoDB.put({
      TableName: process.env.CONNECTIONS_TABLE,
      Item: {
        connectionId: connectionId,
        timestamp: timestamp,
        ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hour TTL
      }
    }).promise();
    
    console.log(`Connection ${connectionId} stored in DynamoDB`);
    
    // Publish a connection event to EventBridge
    await eventBridge.putEvents({
      Entries: [{
        Source: 'websocket.service',
        DetailType: 'ClientConnected',
        Detail: JSON.stringify({
          connectionId: connectionId,
          timestamp: timestamp
        }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    console.log(`Connection event for ${connectionId} published to EventBridge`);
    
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", // Allow from anywhere
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      },
      body: JSON.stringify({ message: 'Connected' })
    };
  } catch (error) {
    console.error('Error in connect handler:', error);
    
    // Attempt to publish error event even if there was a connection issue
    try {
      await eventBridge.putEvents({
        Entries: [{
          Source: 'websocket.service',
          DetailType: 'ConnectionError',
          Detail: JSON.stringify({
            connectionId: connectionId,
            error: error.message,
            timestamp: new Date().toISOString()
          }),
          EventBusName: process.env.EVENT_BUS_NAME
        }]
      }).promise();
      console.log('Error event published to EventBridge');
    } catch (eventError) {
      console.error('Failed to publish error event:', eventError);
    }
    
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      },
      body: JSON.stringify({ message: 'Failed to connect: ' + error.message })
    };
  }
}; 