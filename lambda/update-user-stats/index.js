import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  // Handle CORS preflight requests
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const body = JSON.parse(event.body);
    const { userId, statType } = body;
    
    if (!userId || !statType) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: 'userId and statType are required' })
      };
    }
    
    // Only allow wins or losses
    if (statType !== 'wins' && statType !== 'losses') {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: 'statType must be either "wins" or "losses"' })
      };
    }

    // First check if the user profile exists
    const getParams = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `USER#${userId}`,
        sk: 'PROFILE'
      }
    };

    const userProfile = await ddbDocClient.get(getParams);
    
    // If user profile doesn't exist, create it
    if (!userProfile.Item) {
      const createParams = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          pk: `USER#${userId}`,
          sk: 'PROFILE',
          wins: statType === 'wins' ? 1 : 0,
          losses: statType === 'losses' ? 1 : 0,
          createdAt: new Date().toISOString()
        }
      };
      
      await ddbDocClient.put(createParams);
      
      return {
        statusCode: 201,
        headers: corsHeaders(),
        body: JSON.stringify({
          message: 'User profile created with initial stats',
          [statType]: 1
        })
      };
    }
    
    // Update the existing profile
    const updateParams = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `USER#${userId}`,
        sk: 'PROFILE'
      },
      UpdateExpression: `SET ${statType} = if_not_exists(${statType}, :zero) + :one`,
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1
      },
      ReturnValues: 'UPDATED_NEW'
    };
    
    const result = await ddbDocClient.update(updateParams);
    
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        message: `User ${statType} updated successfully`,
        updatedValues: result.Attributes
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Error updating user stats', error: error.message })
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
  };
} 