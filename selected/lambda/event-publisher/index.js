const AWS = require('aws-sdk');
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    
    // Create an EventBridge event
    const params = {
      Entries: [
        {
          Source: body.source || 'api.gateway',
          DetailType: body.detailType || 'ApiRequest',
          EventBusName: process.env.EVENT_BUS_NAME,
          Detail: JSON.stringify(body.detail || {}),
          
          // Optional fields
          Time: new Date(),
        }
      ]
    };
    
    // Publish to the EventBridge
    const result = await eventBridge.putEvents(params).promise();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Event published successfully',
        eventId: result.Entries[0].EventId
      })
    };
  }
  catch (error) {
    console.error('Error publishing event:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error publishing event',
        error: error.message
      })
    };
  }
};
