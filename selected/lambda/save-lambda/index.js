'use strict';

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Handle EventBridge event
  if (event.source === 'data.service' && event['detail-type'] === 'DataSaved') {
    try {
      console.log('Processing DataSaved event');
      const detail = event.detail;
      const timestamp = new Date().toISOString();
      
      if (!detail.pk) {
        console.error('Missing pk in event detail');
        return { statusCode: 400, body: JSON.stringify({ message: 'Missing pk in event detail' }) };
      }
      
      const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
          pk: detail.pk,
          sk: detail.sk || timestamp,
          ...detail,
          createdAt: detail.createdAt || timestamp
        }
      };
      
      await ddbDocClient.put(params);
      console.log('Data saved successfully from event');
      return { statusCode: 200 };
    } catch (error) {
      console.error('Error processing DataSaved event:', error);
      throw error;
    }
  }
  
  console.log('Unsupported event type:', event);
  return { statusCode: 400, body: JSON.stringify({ message: 'Unsupported event type' }) };
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
});