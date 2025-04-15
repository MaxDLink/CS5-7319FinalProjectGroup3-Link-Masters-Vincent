import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  const gameId = event.pathParameters?.gameId;

  // Handle missing gameId
  if (!gameId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Game ID is required' })
    };
  }

  // Attempt game update
  try {
    const body = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA'
      },
      UpdateExpression: 'SET playerBoard = :pb, enemyBoard = :eb, shipsPlaced = :sp, playerHits = :ph, enemyHits = :eh, isPlayerTurn = :it, updatedAt = :ua, gameStatus = :gs, wins = :w, losses = :l',
      ExpressionAttributeValues: {
        ':pb': body.playerBoard,
        ':eb': body.enemyBoard,
        ':sp': body.shipsPlaced,
        ':ph': body.playerHits,
        ':eh': body.enemyHits,
        ':it': body.isPlayerTurn,
        ':ua': timestamp,
        ':gs': body.gameStatus,
        ':w': body.wins || 0,
        ':l': body.losses || 0
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await ddbDocClient.update(params);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(result.Attributes)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Error updating game', error: error.message })
    };
  }
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}); 