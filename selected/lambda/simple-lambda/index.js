import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { EventBridge } from '@aws-sdk/client-eventbridge';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);
const eventBridge = new EventBridge({});

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Handle EventBridge event
  if (event.source === 'system.service' && event['detail-type'] === 'SimpleOperation') {
    try {
      console.log('Processing SimpleOperation event');
      const detail = event.detail;
      
      // Example: Perform a simple operation based on the event
      if (detail.operation === 'query') {
        const result = await ddbDocClient.query({
          TableName: process.env.DYNAMODB_TABLE,
          KeyConditionExpression: 'pk = :pk',
          ExpressionAttributeValues: { ':pk': detail.key },
          Limit: detail.limit || 10,
        });
        
        // Publish the result as an event
        if (process.env.EVENT_BUS_NAME) {
          await eventBridge.putEvents({
            Entries: [{
              EventBusName: process.env.EVENT_BUS_NAME,
              Source: 'system.service',
              DetailType: 'QueryResult',
              Detail: JSON.stringify({
                requestId: detail.requestId,
                items: result.Items,
                count: result.Count,
                scannedCount: result.ScannedCount
              })
            }]
          });
        }
      }
      
      console.log('Simple operation processed successfully');
      return { statusCode: 200 };
    } catch (error) {
      console.error('Error processing SimpleOperation event:', error);
      
      // Publish error event
      if (process.env.EVENT_BUS_NAME) {
        await eventBridge.putEvents({
          Entries: [{
            EventBusName: process.env.EVENT_BUS_NAME,
            Source: 'system.service',
            DetailType: 'OperationFailed',
            Detail: JSON.stringify({
              error: error.message,
              requestId: event.detail?.requestId
            })
          }]
        });
      }
      
      throw error;
    }
  }
  
  console.log('Unsupported event type:', event);
  return { statusCode: 400, body: JSON.stringify({ message: 'Unsupported event type' }) };
};