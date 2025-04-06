const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    // Extract details from the event
    const detail = JSON.parse(event.detail);
    const connectionId = detail.connectionId;
    const gameId = detail.gameId;
    
    if (!gameId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Game ID is required' })
      };
    }
    
    // Get the current game data
    const getResult = await dynamoDB.get({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA'
      }
    }).promise();
    
    // Check if the game exists
    if (!getResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Game not found' })
      };
    }
    
    // Prepare the update data
    const updateItem = {
      ...getResult.Item,
      playerBoard: detail.playerBoard || getResult.Item.playerBoard,
      enemyBoard: detail.enemyBoard || getResult.Item.enemyBoard,
      shipsPlaced: detail.shipsPlaced !== undefined ? detail.shipsPlaced : getResult.Item.shipsPlaced,
      playerHits: detail.playerHits !== undefined ? detail.playerHits : getResult.Item.playerHits,
      enemyHits: detail.enemyHits !== undefined ? detail.enemyHits : getResult.Item.enemyHits,
      status: detail.gameStatus || getResult.Item.status,
      isPlayerTurn: detail.isPlayerTurn !== undefined ? detail.isPlayerTurn : getResult.Item.isPlayerTurn,
      wins: detail.wins !== undefined ? detail.wins : getResult.Item.wins,
      losses: detail.losses !== undefined ? detail.losses : getResult.Item.losses,
      updatedAt: new Date().toISOString()
    };
    
    // Update the game in DynamoDB
    await dynamoDB.put({
      TableName: process.env.DYNAMODB_TABLE,
      Item: updateItem
    }).promise();
    
    console.log(`Game ${gameId} updated successfully`);
    
    // Publish an event to notify about the game update
    await eventBridge.putEvents({
      Entries: [{
        Source: 'game.service',
        DetailType: 'GameUpdated',
        Detail: JSON.stringify({
          gameId: gameId,
          connectionId: connectionId,
          playerBoard: updateItem.playerBoard,
          enemyBoard: updateItem.enemyBoard,
          shipsPlaced: updateItem.shipsPlaced,
          playerHits: updateItem.playerHits,
          enemyHits: updateItem.enemyHits,
          status: updateItem.status,
          isPlayerTurn: updateItem.isPlayerTurn,
          wins: updateItem.wins,
          losses: updateItem.losses
        }),
        EventBusName: process.env.EVENT_BUS_NAME
      }]
    }).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Game updated successfully',
        gameId: gameId
      })
    };
  } catch (error) {
    console.error('Error updating game:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Error updating game',
        error: error.message
      })
    };
  }
};

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}); 