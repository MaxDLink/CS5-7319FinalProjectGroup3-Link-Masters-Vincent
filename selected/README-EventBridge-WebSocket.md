# EventBridge and WebSocket Architecture

This document provides an overview of the event-driven architecture implemented for the game using AWS EventBridge and WebSockets.

## Architecture Overview

The implementation uses the following AWS services:
- **API Gateway WebSocket API**: Provides real-time bidirectional communication between the client and server
- **EventBridge**: Event bus for decoupling and orchestrating game events
- **Lambda Functions**: Handle game operations and WebSocket connections
- **DynamoDB**: Store game state and WebSocket connections

## Components

### WebSocket API
The WebSocket API enables real-time communication between the client and server. It has three routes:
- **Connect**: Handles new WebSocket connections
- **Disconnect**: Handles WebSocket disconnections
- **Default**: Handles all message routing for game operations

### EventBridge Event Bus
The EventBridge event bus routes events between components. Event types include:
- `GameCreated`
- `GameUpdated`
- `GameRequested`
- `GameDeleted`
- `ClientConnected`
- `ClientDisconnected`

### Lambda Functions

#### WebSocket Handlers
- **Connect Handler**: Registers new WebSocket connections in DynamoDB
- **Disconnect Handler**: Removes WebSocket connections from DynamoDB
- **Default Handler**: Routes WebSocket messages to appropriate EventBridge events
- **Sender Handler**: Sends messages back to connected clients

#### Game Operation Handlers
- **Create Game**: Creates a new game in DynamoDB
- **Update Game**: Updates an existing game in DynamoDB
- **Get Game**: Retrieves a game from DynamoDB
- **Delete Game**: Deletes a game from DynamoDB

### DynamoDB Tables
- **Game Table**: Stores game state
- **Connections Table**: Stores WebSocket connection IDs

## Event Flow

1. **Client connects to WebSocket API**:
   - Connection ID is stored in DynamoDB
   - `ClientConnected` event is published to EventBridge

2. **Client sends a game operation**:
   - Client sends a WebSocket message with `action` and `data`
   - Default handler converts the message to an EventBridge event
   - EventBridge routes the event to the appropriate Lambda function

3. **Lambda processes the event**:
   - Lambda performs the requested operation on DynamoDB
   - Lambda publishes a result event to EventBridge

4. **Result is sent back to the client**:
   - EventBridge routes the result event to the WebSocket sender Lambda
   - Sender Lambda retrieves the client's connection ID
   - Sender Lambda sends the result back to the client via WebSocket

## Client Integration

The game-board.js WebSocket client integration includes:
- WebSocket connection establishment and reconnection
- JSON message format for game operations
- Event handling for server-sent messages

## Message Format

### Client to Server
```json
{
  "action": "createGame|updateGame|getGame|deleteGame",
  "data": {
    "gameId": "optional-game-id",
    "playerBoard": [],
    "enemyBoard": [],
    // other game data
  }
}
```

### Server to Client
```json
{
  "type": "GameCreated|GameUpdated|GameRequested|GameDeleted",
  "data": {
    "gameId": "game-id",
    "playerBoard": [],
    "enemyBoard": [],
    // other game data
  },
  "timestamp": "ISO timestamp"
}
```

## Advantages of Event-Driven Architecture

1. **Decoupling**: Components are loosely coupled, making the system more maintainable
2. **Scalability**: Components can scale independently
3. **Real-time Updates**: WebSockets provide immediate feedback to clients
4. **Resilience**: Events can be retried if processing fails
5. **Extensibility**: New event handlers can be added without modifying existing code

## Deployment

The architecture is deployed using AWS CDK, which provides infrastructure as code. The CDK stack includes all necessary resources and permissions.

## Local Development

For local development, the WebSocket endpoint in game-board.js needs to be updated with the actual WebSocket API endpoint after deployment.

## Testing

1. Deploy the CDK stack
2. Get the WebSocket endpoint from the CloudFormation outputs
3. Update the WebSocket endpoint in game-board.js
4. Test the game in the browser 