import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  // Attempt game creation
  try {
    const gameId = uuidv4();
    const timestamp = new Date().toISOString();

    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA',
        gameId: gameId,
        status: 'SETUP', // Statuses are SETUP, IN_PROGRESS, and COMPLETED
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
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}); 