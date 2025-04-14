const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Handle event types
  try {
    const detail = event.detail;
    
    switch(event.detailType) {
      case 'GameCreated':
        await handleGameCreated(detail);
        break;
        
      case 'GameUpdated':
        await handleGameUpdated(detail);
        break;
        
      case 'GameDeleted':
        await handleGameDeleted(detail);
        break;
        
      default:
        console.log(`Unknown event detail type: ${event.detailType}`);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Event processed successfully'
      })
    };
  } catch (error) {
    console.error('Error processing event:', error);
    throw error;
  }
};

// Handlers

async function handleGameCreated(detail) {
  console.log('Processing game creation:', detail);
  
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      pk: `GAME#${detail.gameId}`,
      sk: `GAME#${detail.gameId}`,
      gameId: detail.gameId,
      name: detail.name,
      createdAt: detail.createdAt || new Date().toISOString(),
      // Add other fields from the event
      ...detail
    }
  };
  
  await dynamoDB.put(params).promise();
}

async function handleGameUpdated(detail) {
  console.log('Processing game update:', detail);
  
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      pk: `GAME#${detail.gameId}`,
      sk: `GAME#${detail.gameId}`
    },
    UpdateExpression: 'set #name = :name, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ':name': detail.name,
      ':updatedAt': new Date().toISOString()
    }
  };
  
  await dynamoDB.update(params).promise();
}

async function handleGameDeleted(detail) {
  console.log('Processing game deletion:', detail);
  
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      pk: `GAME#${detail.gameId}`,
      sk: `GAME#${detail.gameId}`
    }
  };
  
  await dynamoDB.delete(params).promise();
}
