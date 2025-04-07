import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  const gameId = event.pathParameters?.gameId;
  if (!gameId) {
    return {
      statusCode: 400,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Game ID is required' })
    };
  }

  try {
    await ddbDocClient.delete({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA'
      }
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Game deleted successfully' })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Error deleting game', error: error.message })
    };
  }
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}); 