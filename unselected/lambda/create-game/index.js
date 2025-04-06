import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Check if this is an API Gateway request
  if (event.requestContext && event.requestContext.http) {
    if (event.requestContext.http.method === 'OPTIONS') {
      return { statusCode: 204, headers: corsHeaders() };
    }
    
    try {
      // Process the API Gateway request
      const gameId = uuidv4();
      const timestamp = new Date().toISOString();

      const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          pk: `GAME#${gameId}`,
          sk: 'METADATA',
          gameId: gameId,
          status: 'SETUP',
          isPlayerTurn: true,
          createdAt: timestamp,
          updatedAt: timestamp,
          playerBoard: Array(4).fill(Array(4).fill(null)),
          enemyBoard: Array(4).fill(Array(4).fill(null)),
          wins: 0,
          losses: 0
        }
      };

      await ddbDocClient.put(params);

      return {
        statusCode: 201,
        headers: corsHeaders(),
        body: JSON.stringify({ 
          gameId: gameId,
          message: 'Game created successfully'
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ message: 'Error creating game', error: error.message })
      };
    }
  }
  
  // Handle EventBridge event
  else if (event.source === 'game.service' && event['detail-type'] === 'GameCreated') {
    try {
      console.log('Processing GameCreated event');
      const detail = event.detail;
      const gameId = detail.gameId;
      
      // Store the game data in DynamoDB
      const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          pk: `GAME#${gameId}`,
          sk: 'METADATA',
          gameId: gameId,
          status: detail.status || 'SETUP',
          isPlayerTurn: detail.isPlayerTurn || true,
          createdAt: detail.createdAt || new Date().toISOString(),
          updatedAt: detail.updatedAt || new Date().toISOString(),
          playerBoard: detail.playerBoard || Array(4).fill(Array(4).fill(null)),
          enemyBoard: detail.enemyBoard || Array(4).fill(Array(4).fill(null)),
          wins: detail.wins || 0,
          losses: detail.losses || 0
        }
      };
      
      console.log('Saving to DynamoDB:', JSON.stringify(params, null, 2));
      await ddbDocClient.put(params);
      
      console.log(`Game ${gameId} created successfully from event`);
      return { statusCode: 200 };
    } catch (error) {
      console.error('Error processing GameCreated event:', error);
      throw error;
    }
  }
  
  // Log unsupported event
  console.log('Unsupported event type:', event);
  return {
    statusCode: 400,
    headers: corsHeaders(),
    body: JSON.stringify({ message: 'Unsupported event type' })
  };
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}); 