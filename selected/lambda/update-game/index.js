const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
  try {
    console.log('Event received:', JSON.stringify(event, null, 2));
    
    const detail = event.detail;
    const gameId = detail.gameId;
    
    if (!gameId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Game ID is required' })
      };
    }
    
    // Database Interaction
    const result = await dynamoDB.get({
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        pk: `GAME#${gameId}`,
        sk: 'METADATA'
      }
    }).promise();
    
    const gameData = result.Item ?? null;

    if (!gameData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Game not found' })
      };
    }
    
    const updateItem = {
      ...gameData,
      playerBoard: detail.playerBoard || gameData.playerBoard,
      enemyBoard: detail.enemyBoard || gameData.enemyBoard,
      shipsPlaced: detail.shipsPlaced !== undefined ? detail.shipsPlaced : gameData.shipsPlaced,
      playerHits: detail.playerHits !== undefined ? detail.playerHits : gameData.playerHits,
      enemyHits: detail.enemyHits !== undefined ? detail.enemyHits : gameData.enemyHits,
      status: detail.gameStatus || gameData.status,
      isPlayerTurn: detail.isPlayerTurn !== undefined ? detail.isPlayerTurn : gameData.isPlayerTurn,
      wins: detail.wins !== undefined ? detail.wins : gameData.wins,
      losses: detail.losses !== undefined ? detail.losses : gameData.losses,
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
          connectionId: detail.connectionId,
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