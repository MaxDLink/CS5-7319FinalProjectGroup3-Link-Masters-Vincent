const { DedicatedIpPool } = require("aws-cdk-lib/aws-ses");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const eventBridge = new AWS.EventBridge();

exports.handler = async (event) => {
    try {
        console.log("Event received:", JSON.stringify(event, null, 2));

        let connectionId;
        let data;

        // Parse data from event
        try {
            if (typeof event.detail === "string") {
                data = JSON.parse(event.detail);
            } else if (typeof event.detail === "object" && event.detail !== null) {
                data = event.detail;
            } else {
                console.warn("No valid data found in event");
                data = {};
            }

            connectionId = data.connectionId ?? "unknown";
        } catch (error) {
            console.error("Error parsing event data:", error);
            data = {};
            connectionId = "unknown";
        }

        const gameId = uuidv4();
        console.log(`Generated new game ID: ${gameId}`);

        // Create Game tuple to insert in the database
        const gameItem = {
            pk: `GAME#${gameId}`,
            sk: "METADATA",
            gameId: gameId,
            playerBoard: data.playerBoard ?? Array(4).fill().map(() => Array(4).fill("")),
            enemyBoard: data.enemyBoard ?? Array(4).fill().map(() => Array(4).fill("")),
            enemyShipPositions: data.enemyShipPositions ?? [],
            shipsPlaced: 0,
            playerHits: 0,
            enemyHits: 0,
            status: "IN_PROGRESS",
            isPlayerTurn: null,
            wins: 0,
            losses: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Database interaction
        await dynamoDB
            .put({
                TableName: process.env.DYNAMODB_TABLE,
                Item: gameItem,
            })
            .promise();

        console.log(`Game ${gameId} created successfully and stored in DynamoDB`);

        // Data to send to EventBridge
        const eventData = {
            gameId: gameId,
            connectionId: connectionId,
            playerBoard: gameItem.playerBoard,
            enemyBoard: gameItem.enemyBoard,
            enemyShipPositions: gameItem.enemyShipPositions,
            shipsPlaced: gameItem.shipsPlaced,
            status: gameItem.status,
            isPlayerTurn: gameItem.isPlayerTurn,
            wins: gameItem.wins,
            losses: gameItem.losses,
        };

        if (!eventData.gameId) {
            console.error("WARNING: gameId is missing from eventData!");
            eventData.gameId = gameId;
        }

        console.log(
            `Publishing GameCreated event with data:`,
            JSON.stringify(eventData, null, 2)
        );

        // Publish the event to EventBridge
        const eventResult = await eventBridge
            .putEvents({
                Entries: [
                    {
                        Source: "game.service",
                        DetailType: "GameCreated",
                        Detail: JSON.stringify(eventData),
                        EventBusName: process.env.EVENT_BUS_NAME,
                    },
                ],
            })
            .promise();

        console.log(
            "Event published with result:",
            JSON.stringify(eventResult, null, 2)
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Game created successfully",
                gameId: gameId,
            }),
        };
    } catch (error) {
        console.error("Error creating game:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error creating game",
                error: error.message,
            }),
        };
    }
};
