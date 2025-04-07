import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.requestContext.http.method === 'GET') {
    try {
      const result = await ddbDocClient.query({
        TableName: process.env.DYNAMODB_TABLE,
        KeyConditionExpression: 'pk = :pk AND sk = :sk',
        ExpressionAttributeValues: { ':pk': 'user', ':sk': 'name' },
        Limit: 1,
        ScanIndexForward: false,
      });

      return result.Items.length > 0
        ? { statusCode: 200, headers: corsHeaders(), body: JSON.stringify({ name: result.Items[0].name }) }
        : { statusCode: 404, headers: corsHeaders(), body: JSON.stringify({ message: 'No data found' }) };
    } catch (error) {
      return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ message: 'Error loading data', error: error.message }) };
    }
  }

  return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ message: 'Unsupported HTTP method' }) };
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
});