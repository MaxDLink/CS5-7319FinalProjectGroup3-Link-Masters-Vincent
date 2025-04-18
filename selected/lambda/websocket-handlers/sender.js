const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// This lambda sends messages to connected WebSocket clients
exports.handler = async (event) => {
  console.log('Event received by sender:', JSON.stringify(event, null, 2));
  
  try {
    console.log('Event structure:');
    console.log('- detail-type:', event['detail-type']);
    console.log('- source:', event.source);
    console.log('- detail type:', typeof event.detail);
    
    // Parse Data from event
    const detail = event.detail || (typeof event.detail === 'string' ? JSON.parse(event.detail) : {});
    const targetConnectionId = detail.data?.connectionId || detail.connectionId;
    
    const endpoint = process.env.WEBSOCKET_ENDPOINT;
    if (!endpoint) {
      throw new Error('WEBSOCKET_ENDPOINT environment variable is not set');
    }
    
    const apigwManagementApi = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: endpoint
    });
    
    const messageType = event['detail-type'] || 'UnknownEvent';
 
    // Extract detail data - handle string or object
    let detailData = {};
    if (typeof event.data === 'string') {
      try {
        detailData = JSON.parse(event.data);
      } catch (e) {
        console.error('Error parsing event.detail string:', e);
      }
    } else if (typeof event.detail === 'object' && event.detail !== null) {
      detailData = event.detail;
    }
    
    console.log('Extracted detail data:', JSON.stringify(detailData, null, 2));
    
    const connectionId = detailData.connectionId;
    
    const message = {
      type: messageType,
      data: detailData,
      gameId: detailData.gameId,
      timestamp: new Date().toISOString()
    };
    
    if (messageType === 'GameCreated') {
      console.log('Original GameCreated/CreateGameRequest message structure:', JSON.stringify(message, null, 2));
      
      // Fix common issues with EventBridge event structure
      if (!message.data.gameId && message.data.detail && message.data.detail.gameId) {
        console.log('Moving gameId from detail to data level');
        message.data.gameId = message.data.detail.gameId;
      }
      
      // If data is a string, try to parse it
      if (typeof message.data === 'string') {
        try {
          const parsedData = JSON.parse(message.data);
          if (parsedData.gameId) {
            console.log('Parsed string data to extract gameId');
            message.data = parsedData;
          }
        } catch (e) {
          console.error('Failed to parse string data:', e);
        }
      }
      
      console.log('Final GameCreated/CreateGameRequest message structure:', JSON.stringify(message, null, 2));
    }
    else if (messageType === 'GameUpdated') {
      console.log("The game has been updated!")
    }
    else if (messageType === 'GameRequested') {
      console.log("The game has been requested with GameRequested type!")
    }
    else if (messageType === 'GameDeleteRequest') {
      console.log("The game has been deleted with GameDeleteRequest type!")
    }
    console.log('Prepared message:', JSON.stringify(message, null, 2));
    
    // Validate connectionId before attempting to send
    if (targetConnectionId && targetConnectionId !== 'unknown') {
      console.log(`Sending message to specific connection: ${targetConnectionId}`);
      
      try {
        await apigwManagementApi.postToConnection({
          ConnectionId: targetConnectionId,
          Data: JSON.stringify(message)
        }).promise();
        console.log(`Message sent to ${targetConnectionId} successfully`);
        return { statusCode: 200, body: 'Message sent' };
      }
      catch (error) {
        if (error.statusCode === 410) {
          console.log(`Found stale connection, removing ${targetConnectionId}`);
          await dynamoDB.delete({
            TableName: process.env.CONNECTIONS_TABLE,
            Key: { connectionId: targetConnectionId }
          }).promise();
          return { statusCode: 410, body: 'Client disconnected' };
        }
        throw error;
      }
    }
    
    // If no valid target connection or connectionId is 'unknown', broadcast to all clients
    console.log('No valid target connection found, broadcasting to all connected clients');
    
    const connectionData = await dynamoDB.scan({
      TableName: process.env.CONNECTIONS_TABLE
    }).promise();
    
    if (!connectionData.Items || connectionData.Items.length === 0) {
      console.log('No connected clients found');
      return { statusCode: 200, body: 'No clients to notify' };
    }
    
    console.log(`Found ${connectionData.Items.length} connected clients`);
    
    // Send to all connections
    const postCalls = connectionData.Items.map(async ({ connectionId }) => {
      try {
        console.log(`Sending message to ${connectionId}`);
        await apigwManagementApi.postToConnection({
          ConnectionId: connectionId,
          Data: JSON.stringify(message)
        }).promise();
        console.log(`Message sent to ${connectionId} successfully`);
        return { success: true, connectionId };
      } catch (error) {
        if (error.statusCode === 410) {
          console.log(`Found stale connection, removing ${connectionId}`);
          try {
            await dynamoDB.delete({
              TableName: process.env.CONNECTIONS_TABLE,
              Key: { connectionId }
            }).promise();
            console.log(`Removed stale connection: ${connectionId}`);
          } catch (deleteError) {
            console.error(`Error removing stale connection ${connectionId}:`, deleteError);
          }
          return { success: false, connectionId, reason: 'stale connection' };
        }
        console.error(`Error sending message to ${connectionId}:`, error);
        return { success: false, connectionId, reason: error.message };
      }
    });
    
    const results = await Promise.allSettled(postCalls);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`Broadcast complete. Success: ${successCount}, Failures: ${failureCount}`);
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({
        message: 'Broadcast complete',
        successCount,
        failureCount
      })
    };
  } catch (error) {
    console.error('Error in sender lambda:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error sending messages', 
        error: error.message 
      })
    };
  }
}; 