const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

// This lambda is triggered when a message is received from a client
exports.handler = async (event) => {
  console.log('Default handler received event:', JSON.stringify(event, null, 2));
  
  const connectionId = event.requestContext.connectionId;
  const domainName = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  
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
    
    // handle saveEventBusRecord
    if (message.action === 'saveEventBusRecord') {
      console.log('Processing saveEventBusRecord action');
      
      try {
        if (!message.data || !message.data.pk || !message.data.sk) {
          throw new Error('Missing required fields (pk, sk) for EventBus record');
        }
        
        await dynamoDB.put({
          TableName: process.env.DYNAMODB_TABLE,
          Item: {
            ...message.data,
            updatedAt: new Date().toISOString(),
            connectionId: connectionId
          }
        }).promise();
        
        console.log(`EventBus record saved with pk=${message.data.pk}, sk=${message.data.sk}`);
        
        // Send acknowledgment back to the client
        await sendToClient(apiGatewayManagementApi, connectionId, {
          type: 'acknowledgment',
          message: 'EventBus record saved successfully',
          pk: message.data.pk,
          sk: message.data.sk
        });
        
        return { statusCode: 200 };
      } catch (error) {
        console.error('Error saving EventBus record:', error);
        await sendToClient(apiGatewayManagementApi, connectionId, {
          type: 'error',
          message: `Error saving EventBus record: ${error.message}`
        });
        return { statusCode: 500 };
      }
    }
    
    // handle updateGameWithEvent
    if (message.action === 'updateGameWithEvent') {
      console.log('Processing updateGameWithEvent action - combined game update and event logging');
      
      try {
        if (!message.data || !message.data.gameState || !message.data.eventRecord) {
          throw new Error('Missing required fields for combined update (gameState and eventRecord)');
        }
        
        const { gameState, eventRecord } = message.data;
    
        if (!gameState.pk || !gameState.sk || !gameState.gameId) {
          throw new Error('Invalid gameState data - missing required keys');
        }
        
        if (!eventRecord.pk || !eventRecord.sk || !eventRecord.eventType) {
          throw new Error('Invalid eventRecord data - missing required keys');
        }
        
        await dynamoDB.put({
          TableName: process.env.DYNAMODB_TABLE,
          Item: {
            ...gameState,
            connectionId: connectionId,
            updatedAt: new Date().toISOString()
          }
        }).promise();
        
        // save the event record to the database
        await dynamoDB.put({
          TableName: process.env.DYNAMODB_TABLE,
          Item: {
            ...eventRecord,
            connectionId: connectionId,
            updatedAt: new Date().toISOString()
          }
        }).promise();
        
        console.log(`Combined update successful: Game state and ${eventRecord.eventType} event saved`);
        
        const eventEntry = {
          Source: 'game.service',
          DetailType: 'GameUpdated',
          Detail: JSON.stringify({
            ...gameState,
            eventType: eventRecord.eventType,
            connectionId: connectionId
          }),
          EventBusName: process.env.EVENT_BUS_NAME
        };
        
        await eventBridge.putEvents({
          Entries: [eventEntry]
        }).promise();
        
        // Send acknowledgment back to the client
        await sendToClient(apiGatewayManagementApi, connectionId, {
          type: 'acknowledgment',
          message: 'Combined game state and event update successful',
          gameId: gameState.gameId,
          eventType: eventRecord.eventType
        });
        
        return { statusCode: 200 };
      } catch (error) {
        console.error('Error processing combined update:', error);
        await sendToClient(apiGatewayManagementApi, connectionId, {
          type: 'error',
          message: `Error in combined update: ${error.message}`
        });
        return { statusCode: 500 };
      }
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
    
    console.log('Publishing event to EventBridge:', JSON.stringify(eventEntry, null, 2));
    console.log('Event bus name:', process.env.EVENT_BUS_NAME);
    
    const result = await eventBridge.putEvents({
      Entries: [eventEntry]
    }).promise();
    
    console.log('Event published successfully:', JSON.stringify(result, null, 2));
    
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

// Helper function mapping client actions to EventBridge detail types
function getDetailTypeForAction(action) {
  const actionMap = {
    'createGame': 'CreateGameRequest',
    'updateGame': 'UpdateGameRequest',
    'getGame': 'GetGameRequest',
    'deleteGame': 'GameDeleteRequest',
    'placeShip': 'ShipPlaced',
    'attackPosition': 'AttackInitiated',
    'saveEventBusRecord': 'EventBusRecordSaved',
    'updateGameWithEvent': 'GameUpdatedWithEvent'
  };
  
  const result = actionMap[action] || 'UnknownAction';
  console.log(`Mapped action '${action}' to detail type '${result}'`);
  return result;
}

// Sends a message to a client
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
    throw error;
  }
} 