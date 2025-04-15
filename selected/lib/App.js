"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const cdk = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_apigatewayv2_1 = require("aws-cdk-lib/aws-apigatewayv2");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
const events = require("aws-cdk-lib/aws-events");
const targets = require("aws-cdk-lib/aws-events-targets");
const aws_apigatewayv2_2 = require("aws-cdk-lib/aws-apigatewayv2");
const aws_apigatewayv2_integrations_2 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_iam_1 = require("aws-cdk-lib/aws-iam");
class App extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const originAccessIdentity = new aws_cloudfront_1.OriginAccessIdentity(this, 'WebAppOriginAccessIdentity');
        const bucket = new aws_s3_1.Bucket(this, 'WebAppBucket', {
            publicReadAccess: false,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
        });
        bucket.grantRead(originAccessIdentity);
        // Define CloudFront 
        const distribution = new aws_cloudfront_1.Distribution(this, 'WebAppDistribution', {
            defaultBehavior: {
                origin: new aws_cloudfront_origins_1.S3Origin(bucket, {
                    originAccessIdentity: originAccessIdentity,
                }),
                viewerProtocolPolicy: aws_cloudfront_1.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: 'index.html',
            errorResponses: [
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: '/index.html',
                }
            ],
        });
        // Deploy the HTML to the bucket
        new aws_s3_deployment_1.BucketDeployment(this, 'WebAppDeployment', {
            sources: [aws_s3_deployment_1.Source.asset('./webapp/dist')],
            destinationBucket: bucket,
            distribution,
            distributionPaths: ['/*'],
        });
        new aws_cdk_lib_1.CfnOutput(this, 'WebAppURL', {
            value: `https://${distribution.domainName}`,
            description: 'The URL of the deployed web application',
        });
        const eventBus = new events.EventBus(this, 'GameEventBus', {
            eventBusName: 'game-events'
        });
        // Define Database
        const table = new aws_dynamodb_1.Table(this, 'MyTable', {
            partitionKey: { name: 'pk', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'sk', type: aws_dynamodb_1.AttributeType.STRING },
            timeToLiveAttribute: 'ttl',
            stream: aws_dynamodb_1.StreamViewType.NEW_AND_OLD_IMAGES,
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
        });
        const connectionsTable = new aws_dynamodb_1.Table(this, 'WebSocketConnections', {
            partitionKey: { name: 'connectionId', type: aws_dynamodb_1.AttributeType.STRING },
            timeToLiveAttribute: 'ttl',
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Define Lambdas
        const createGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'CreateGameLambda', {
            entry: 'lambda/create-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        table.grantReadWriteData(createGameLambda);
        eventBus.grantPutEventsTo(createGameLambda);
        const getGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetGameLambda', {
            entry: 'lambda/get-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        table.grantReadData(getGameLambda);
        eventBus.grantPutEventsTo(getGameLambda);
        const updateGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'UpdateGameLambda', {
            entry: 'lambda/update-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        table.grantReadWriteData(updateGameLambda);
        eventBus.grantPutEventsTo(updateGameLambda);
        const deleteGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'DeleteGameLambda', {
            entry: 'lambda/delete-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        table.grantReadWriteData(deleteGameLambda);
        eventBus.grantPutEventsTo(deleteGameLambda);
        const eventPublisherLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'EventPublisherLambda', {
            entry: 'lambda/event-publisher/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        eventBus.grantPutEventsTo(eventPublisherLambda);
        const webSocketConnectHandler = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketConnectHandler', {
            entry: 'lambda/websocket-handlers/connect.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        eventBus.grantPutEventsTo(webSocketConnectHandler);
        connectionsTable.grantReadWriteData(webSocketConnectHandler);
        webSocketConnectHandler.addEnvironment('CONNECTIONS_TABLE', connectionsTable.tableName);
        const webSocketDisconnectHandler = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketDisconnectHandler', {
            entry: 'lambda/websocket-handlers/disconnect.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                EVENT_BUS_NAME: eventBus.eventBusName,
            },
        });
        eventBus.grantPutEventsTo(webSocketDisconnectHandler);
        connectionsTable.grantReadWriteData(webSocketDisconnectHandler);
        webSocketDisconnectHandler.addEnvironment('CONNECTIONS_TABLE', connectionsTable.tableName);
        const webSocketDefaultHandler = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketDefaultHandler', {
            entry: 'lambda/websocket-handlers/default.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                EVENT_BUS_NAME: eventBus.eventBusName,
                DYNAMODB_TABLE: table.tableName,
            },
        });
        eventBus.grantPutEventsTo(webSocketDefaultHandler);
        table.grantReadWriteData(webSocketDefaultHandler);
        connectionsTable.grantReadWriteData(webSocketDefaultHandler);
        webSocketDefaultHandler.addEnvironment('CONNECTIONS_TABLE', connectionsTable.tableName);
        const webSocketApi = new aws_apigatewayv2_2.WebSocketApi(this, 'GameWebSocketApi', {
            connectRouteOptions: { integration: new aws_apigatewayv2_integrations_2.WebSocketLambdaIntegration('ConnectIntegration', webSocketConnectHandler) },
            disconnectRouteOptions: { integration: new aws_apigatewayv2_integrations_2.WebSocketLambdaIntegration('DisconnectIntegration', webSocketDisconnectHandler) },
            defaultRouteOptions: { integration: new aws_apigatewayv2_integrations_2.WebSocketLambdaIntegration('DefaultIntegration', webSocketDefaultHandler) },
        });
        const webSocketStage = new aws_apigatewayv2_2.WebSocketStage(this, 'GameWebSocketStage', {
            webSocketApi,
            stageName: 'prod',
            autoDeploy: true,
        });
        const webSocketSenderLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'WebSocketSenderLambda', {
            entry: 'lambda/websocket-handlers/sender.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                WEBSOCKET_ENDPOINT: webSocketStage.url.replace('wss://', ''),
            },
        });
        connectionsTable.grantReadWriteData(webSocketSenderLambda);
        webSocketSenderLambda.addEnvironment('CONNECTIONS_TABLE', connectionsTable.tableName);
        webSocketSenderLambda.addToRolePolicy(new aws_iam_1.PolicyStatement({
            effect: aws_iam_1.Effect.ALLOW,
            actions: ['execute-api:ManageConnections'],
            resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/*`],
        }));
        // Event Rules
        new events.Rule(this, 'GameCreatedRule', {
            eventBus,
            description: 'Rule for game creation events',
            eventPattern: {
                source: ['game.service'],
                detailType: ['CreateGameRequest'],
            },
            targets: [new targets.LambdaFunction(createGameLambda)],
        });
        new events.Rule(this, 'GameUpdatedRule', {
            eventBus,
            description: 'Rule for game update events',
            eventPattern: {
                source: ['game.service'],
                detailType: ['UpdateGameRequest'],
            },
            targets: [new targets.LambdaFunction(updateGameLambda)],
        });
        new events.Rule(this, 'GameDeletedRule', {
            eventBus,
            description: 'Rule for game deletion events',
            eventPattern: {
                source: ['game.service'],
                detailType: ['GameDeleteRequest'],
            },
            targets: [new targets.LambdaFunction(deleteGameLambda)],
        });
        new events.Rule(this, 'GameRequestedRule', {
            eventBus,
            description: 'Rule for game request events',
            eventPattern: {
                source: ['game.service'],
                detailType: ['GetGameRequest'],
            },
            targets: [new targets.LambdaFunction(getGameLambda)],
        });
        new events.Rule(this, 'GameWebSocketSenderRule', {
            eventBus,
            description: 'Rule for forwarding game events to WebSocket clients',
            eventPattern: {
                source: ['game.service'],
                detailType: [
                    'GameCreated',
                    'GameUpdated',
                    'GameDeleted',
                    'GameRequested',
                ],
            },
            targets: [new targets.LambdaFunction(webSocketSenderLambda)],
        });
        // Define API
        const api = new aws_apigatewayv2_1.HttpApi(this, 'EventBridgeApi', {
            apiName: 'EventBridgeApi',
            corsPreflight: {
                allowOrigins: ['*'],
                allowMethods: [
                    aws_apigatewayv2_1.CorsHttpMethod.GET,
                    aws_apigatewayv2_1.CorsHttpMethod.POST,
                    aws_apigatewayv2_1.CorsHttpMethod.OPTIONS
                ],
                allowHeaders: ['Content-Type', 'Authorization'],
            },
        });
        api.addRoutes({
            path: '/events',
            methods: [aws_apigatewayv2_1.HttpMethod.POST],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('EventPublisherIntegration', eventPublisherLambda),
        });
    }
}
exports.App = App;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQywyREFBNEY7QUFDNUYsaURBQWdEO0FBQ2hELHFFQUE4RDtBQUM5RCw2Q0FBdUQ7QUFDdkQsbUVBQW1GO0FBQ25GLDZGQUFrRjtBQUNsRiwrREFBc0c7QUFDdEcsK0NBQStEO0FBQy9ELCtFQUE4RDtBQUM5RCxxRUFBeUU7QUFDekUsaURBQWlEO0FBQ2pELDBEQUEwRDtBQUMxRCxtRUFBNEU7QUFDNUUsNkZBQXVGO0FBQ3ZGLGlEQUE4RDtBQUU5RCxNQUFhLEdBQUksU0FBUSxHQUFHLENBQUMsS0FBSztJQUNoQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxxQ0FBb0IsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUUxRixNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQzlDLGdCQUFnQixFQUFFLEtBQUs7WUFDdkIsYUFBYSxFQUFFLDJCQUFhLENBQUMsTUFBTTtZQUNuQyxpQkFBaUIsRUFBRSwwQkFBaUIsQ0FBQyxTQUFTO1NBQy9DLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUV2QyxxQkFBcUI7UUFDckIsTUFBTSxZQUFZLEdBQUcsSUFBSSw2QkFBWSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUNoRSxlQUFlLEVBQUU7Z0JBQ2YsTUFBTSxFQUFFLElBQUksaUNBQVEsQ0FBQyxNQUFNLEVBQUU7b0JBQzNCLG9CQUFvQixFQUFFLG9CQUFvQjtpQkFDM0MsQ0FBQztnQkFDRixvQkFBb0IsRUFBRSxxQ0FBb0IsQ0FBQyxpQkFBaUI7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RSxnQkFBZ0IsRUFBRTtZQUM5QyxPQUFPLEVBQUUsZ0JBQWdCO1lBQ3pCLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLFlBQVksRUFBRTtvQkFDWixpQ0FBYyxDQUFDLEdBQUc7b0JBQ2xCLGlDQUFjLENBQUMsSUFBSTtvQkFDbkIsaUNBQWMsQ0FBQyxPQUFPO2lCQUN2QjtnQkFDRCxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO2FBQ2hEO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxTQUFTO1lBQ2YsT0FBTyxFQUFFLENBQUMsNkJBQVUsQ0FBQyxJQUFJLENBQUM7WUFDMUIsV0FBVyxFQUFFLElBQUkscURBQXFCLENBQUMsMkJBQTJCLEVBQUUsb0JBQW9CLENBQUM7U0FDMUYsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBaFJELGtCQWdSQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7VGFibGUsIEJpbGxpbmdNb2RlLCBBdHRyaWJ1dGVUeXBlLCBTdHJlYW1WaWV3VHlwZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7IFxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnIFxuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcydcbmltcG9ydCB7IFJlbW92YWxQb2xpY3ksIENmbk91dHB1dCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IEh0dHBBcGksIENvcnNIdHRwTWV0aG9kLCBIdHRwTWV0aG9kIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgeyBEaXN0cmlidXRpb24sIE9yaWdpbkFjY2Vzc0lkZW50aXR5LCBWaWV3ZXJQcm90b2NvbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCB7IEJsb2NrUHVibGljQWNjZXNzLCBCdWNrZXQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgUzNPcmlnaW4gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCB7IEJ1Y2tldERlcGxveW1lbnQsIFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcbmltcG9ydCB7IFdlYlNvY2tldEFwaSwgV2ViU29ja2V0U3RhZ2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuaW1wb3J0IHsgUG9saWN5U3RhdGVtZW50LCBFZmZlY3QgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcblxuZXhwb3J0IGNsYXNzIEFwcCBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcbiAgICBcbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBPcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnV2ViQXBwT3JpZ2luQWNjZXNzSWRlbnRpdHknKTtcblxuICAgIGNvbnN0IGJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgJ1dlYkFwcEJ1Y2tldCcsIHtcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IGZhbHNlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgIH0pO1xuICAgIGJ1Y2tldC5ncmFudFJlYWQob3JpZ2luQWNjZXNzSWRlbnRpdHkpO1xuXG4gICAgLy8gRGVmaW5lIENsb3VkRnJvbnQgXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IERpc3RyaWJ1dGlvbih0aGlzLCAnV2ViQXBwRGlzdHJpYnV0aW9uJywge1xuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgIG9yaWdpbjogbmV3IFMzT3JpZ2luKGJ1Y2tldCwge1xuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5OiBvcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgICAgfSksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBWaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgIH0sXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICB9XG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gRGVwbG95IHRoZSBIVE1MIHRvIHRoZSBidWNrZXRcbiAgICBuZXcgQnVja2V0RGVwbG95bWVudCh0aGlzLCAnV2ViQXBwRGVwbG95bWVudCcsIHtcbiAgICAgIHNvdXJjZXM6IFtTb3VyY2UuYXNzZXQoJy4vd2ViYXBwL2Rpc3QnKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uLCBcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sIFxuICAgIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnV2ViQXBwVVJMJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIFVSTCBvZiB0aGUgZGVwbG95ZWQgd2ViIGFwcGxpY2F0aW9uJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IGV2ZW50QnVzID0gbmV3IGV2ZW50cy5FdmVudEJ1cyh0aGlzLCAnR2FtZUV2ZW50QnVzJywge1xuICAgICAgZXZlbnRCdXNOYW1lOiAnZ2FtZS1ldmVudHMnXG4gICAgfSk7XG5cbiAgICAvLyBEZWZpbmUgRGF0YWJhc2VcblxuICAgIGNvbnN0IHRhYmxlID0gbmV3IFRhYmxlKHRoaXMsICdNeVRhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6J3BrJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTonc2snLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsXG4gICAgICBzdHJlYW06IFN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcbiAgICAgIGJpbGxpbmdNb2RlOiBCaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgfSk7XG5cbiAgICBjb25zdCBjb25uZWN0aW9uc1RhYmxlID0gbmV3IFRhYmxlKHRoaXMsICdXZWJTb2NrZXRDb25uZWN0aW9ucycsIHtcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29ubmVjdGlvbklkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnLFxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIERlZmluZSBMYW1iZGFzXG5cbiAgICBjb25zdCBjcmVhdGVHYW1lTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdDcmVhdGVHYW1lTGFtYmRhJywge1xuICAgICAgZW50cnk6ICdsYW1iZGEvY3JlYXRlLWdhbWUvaW5kZXguanMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBEWU5BTU9EQl9UQUJMRTogdGFibGUudGFibGVOYW1lLFxuICAgICAgICBFVkVOVF9CVVNfTkFNRTogZXZlbnRCdXMuZXZlbnRCdXNOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICB0YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlR2FtZUxhbWJkYSk7XG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyhjcmVhdGVHYW1lTGFtYmRhKTtcblxuICAgIGNvbnN0IGdldEdhbWVMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldEdhbWVMYW1iZGEnLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9nZXQtZ2FtZS9pbmRleC5qcycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIERZTkFNT0RCX1RBQkxFOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEVWRU5UX0JVU19OQU1FOiBldmVudEJ1cy5ldmVudEJ1c05hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRhYmxlLmdyYW50UmVhZERhdGEoZ2V0R2FtZUxhbWJkYSk7XG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyhnZXRHYW1lTGFtYmRhKTtcblxuICAgIGNvbnN0IHVwZGF0ZUdhbWVMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1VwZGF0ZUdhbWVMYW1iZGEnLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS91cGRhdGUtZ2FtZS9pbmRleC5qcycsXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIERZTkFNT0RCX1RBQkxFOiB0YWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEVWRU5UX0JVU19OQU1FOiBldmVudEJ1cy5ldmVudEJ1c05hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVHYW1lTGFtYmRhKTtcbiAgICBldmVudEJ1cy5ncmFudFB1dEV2ZW50c1RvKHVwZGF0ZUdhbWVMYW1iZGEpO1xuXG4gICAgY29uc3QgZGVsZXRlR2FtZUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnRGVsZXRlR2FtZUxhbWJkYScsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2RlbGV0ZS1nYW1lL2luZGV4LmpzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRFlOQU1PREJfVEFCTEU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgRVZFTlRfQlVTX05BTUU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGRlbGV0ZUdhbWVMYW1iZGEpO1xuICAgIGV2ZW50QnVzLmdyYW50UHV0RXZlbnRzVG8oZGVsZXRlR2FtZUxhbWJkYSk7XG5cbiAgICBjb25zdCBldmVudFB1Ymxpc2hlckxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnRXZlbnRQdWJsaXNoZXJMYW1iZGEnLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9ldmVudC1wdWJsaXNoZXIvaW5kZXguanMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBFVkVOVF9CVVNfTkFNRTogZXZlbnRCdXMuZXZlbnRCdXNOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBldmVudEJ1cy5ncmFudFB1dEV2ZW50c1RvKGV2ZW50UHVibGlzaGVyTGFtYmRhKTtcblxuICAgIGNvbnN0IHdlYlNvY2tldENvbm5lY3RIYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdXZWJTb2NrZXRDb25uZWN0SGFuZGxlcicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL3dlYnNvY2tldC1oYW5kbGVycy9jb25uZWN0LmpzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRVZFTlRfQlVTX05BTUU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyh3ZWJTb2NrZXRDb25uZWN0SGFuZGxlcik7XG4gICAgY29ubmVjdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEod2ViU29ja2V0Q29ubmVjdEhhbmRsZXIpO1xuICAgIHdlYlNvY2tldENvbm5lY3RIYW5kbGVyLmFkZEVudmlyb25tZW50KCdDT05ORUNUSU9OU19UQUJMRScsIGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lKTtcblxuICAgIGNvbnN0IHdlYlNvY2tldERpc2Nvbm5lY3RIYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdXZWJTb2NrZXREaXNjb25uZWN0SGFuZGxlcicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL3dlYnNvY2tldC1oYW5kbGVycy9kaXNjb25uZWN0LmpzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRVZFTlRfQlVTX05BTUU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyh3ZWJTb2NrZXREaXNjb25uZWN0SGFuZGxlcik7XG4gICAgY29ubmVjdGlvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEod2ViU29ja2V0RGlzY29ubmVjdEhhbmRsZXIpO1xuICAgIHdlYlNvY2tldERpc2Nvbm5lY3RIYW5kbGVyLmFkZEVudmlyb25tZW50KCdDT05ORUNUSU9OU19UQUJMRScsIGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lKTtcblxuICAgIGNvbnN0IHdlYlNvY2tldERlZmF1bHRIYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdXZWJTb2NrZXREZWZhdWx0SGFuZGxlcicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL3dlYnNvY2tldC1oYW5kbGVycy9kZWZhdWx0LmpzJyxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgRVZFTlRfQlVTX05BTUU6IGV2ZW50QnVzLmV2ZW50QnVzTmFtZSxcbiAgICAgICAgRFlOQU1PREJfVEFCTEU6IHRhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgZXZlbnRCdXMuZ3JhbnRQdXRFdmVudHNUbyh3ZWJTb2NrZXREZWZhdWx0SGFuZGxlcik7XG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHdlYlNvY2tldERlZmF1bHRIYW5kbGVyKTtcbiAgICBjb25uZWN0aW9uc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh3ZWJTb2NrZXREZWZhdWx0SGFuZGxlcik7XG4gICAgd2ViU29ja2V0RGVmYXVsdEhhbmRsZXIuYWRkRW52aXJvbm1lbnQoJ0NPTk5FQ1RJT05TX1RBQkxFJywgY29ubmVjdGlvbnNUYWJsZS50YWJsZU5hbWUpO1xuXG4gICAgY29uc3Qgd2ViU29ja2V0QXBpID0gbmV3IFdlYlNvY2tldEFwaSh0aGlzLCAnR2FtZVdlYlNvY2tldEFwaScsIHtcbiAgICAgIGNvbm5lY3RSb3V0ZU9wdGlvbnM6IHsgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignQ29ubmVjdEludGVncmF0aW9uJywgd2ViU29ja2V0Q29ubmVjdEhhbmRsZXIpIH0sXG4gICAgICBkaXNjb25uZWN0Um91dGVPcHRpb25zOiB7IGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ0Rpc2Nvbm5lY3RJbnRlZ3JhdGlvbicsIHdlYlNvY2tldERpc2Nvbm5lY3RIYW5kbGVyKSB9LFxuICAgICAgZGVmYXVsdFJvdXRlT3B0aW9uczogeyBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdEZWZhdWx0SW50ZWdyYXRpb24nLCB3ZWJTb2NrZXREZWZhdWx0SGFuZGxlcikgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdlYlNvY2tldFN0YWdlID0gbmV3IFdlYlNvY2tldFN0YWdlKHRoaXMsICdHYW1lV2ViU29ja2V0U3RhZ2UnLCB7XG4gICAgICB3ZWJTb2NrZXRBcGksXG4gICAgICBzdGFnZU5hbWU6ICdwcm9kJyxcbiAgICAgIGF1dG9EZXBsb3k6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCB3ZWJTb2NrZXRTZW5kZXJMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1dlYlNvY2tldFNlbmRlckxhbWJkYScsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL3dlYnNvY2tldC1oYW5kbGVycy9zZW5kZXIuanMnLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBXRUJTT0NLRVRfRU5EUE9JTlQ6IHdlYlNvY2tldFN0YWdlLnVybC5yZXBsYWNlKCd3c3M6Ly8nLCAnJyksXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGNvbm5lY3Rpb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHdlYlNvY2tldFNlbmRlckxhbWJkYSk7XG4gICAgd2ViU29ja2V0U2VuZGVyTGFtYmRhLmFkZEVudmlyb25tZW50KCdDT05ORUNUSU9OU19UQUJMRScsIGNvbm5lY3Rpb25zVGFibGUudGFibGVOYW1lKTtcblxuICAgIHdlYlNvY2tldFNlbmRlckxhbWJkYS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgZWZmZWN0OiBFZmZlY3QuQUxMT1csXG4gICAgICAgIGFjdGlvbnM6IFsnZXhlY3V0ZS1hcGk6TWFuYWdlQ29ubmVjdGlvbnMnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6ZXhlY3V0ZS1hcGk6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OiR7d2ViU29ja2V0QXBpLmFwaUlkfS8ke3dlYlNvY2tldFN0YWdlLnN0YWdlTmFtZX0vKmBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgLy8gRXZlbnQgUnVsZXNcblxuICAgIG5ldyBldmVudHMuUnVsZSh0aGlzLCAnR2FtZUNyZWF0ZWRSdWxlJywge1xuICAgICAgZXZlbnRCdXMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1J1bGUgZm9yIGdhbWUgY3JlYXRpb24gZXZlbnRzJyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsnZ2FtZS5zZXJ2aWNlJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFsnQ3JlYXRlR2FtZVJlcXVlc3QnXSxcbiAgICAgIH0sXG4gICAgICB0YXJnZXRzOiBbbmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oY3JlYXRlR2FtZUxhbWJkYSldLFxuICAgIH0pO1xuXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdHYW1lVXBkYXRlZFJ1bGUnLCB7XG4gICAgICBldmVudEJ1cyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUnVsZSBmb3IgZ2FtZSB1cGRhdGUgZXZlbnRzJyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsnZ2FtZS5zZXJ2aWNlJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFsnVXBkYXRlR2FtZVJlcXVlc3QnXSxcbiAgICAgIH0sXG4gICAgICB0YXJnZXRzOiBbbmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24odXBkYXRlR2FtZUxhbWJkYSldLFxuICAgIH0pO1xuXG4gICAgbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdHYW1lRGVsZXRlZFJ1bGUnLCB7XG4gICAgICBldmVudEJ1cyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUnVsZSBmb3IgZ2FtZSBkZWxldGlvbiBldmVudHMnLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydnYW1lLnNlcnZpY2UnXSxcbiAgICAgICAgZGV0YWlsVHlwZTogWydHYW1lRGVsZXRlUmVxdWVzdCddLFxuICAgICAgfSxcbiAgICAgIHRhcmdldHM6IFtuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihkZWxldGVHYW1lTGFtYmRhKV0sXG4gICAgfSk7XG5cbiAgICBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0dhbWVSZXF1ZXN0ZWRSdWxlJywge1xuICAgICAgZXZlbnRCdXMsXG4gICAgICBkZXNjcmlwdGlvbjogJ1J1bGUgZm9yIGdhbWUgcmVxdWVzdCBldmVudHMnLFxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XG4gICAgICAgIHNvdXJjZTogWydnYW1lLnNlcnZpY2UnXSxcbiAgICAgICAgZGV0YWlsVHlwZTogWydHZXRHYW1lUmVxdWVzdCddLFxuICAgICAgfSxcbiAgICAgIHRhcmdldHM6IFtuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihnZXRHYW1lTGFtYmRhKV0sXG4gICAgfSk7XG5cbiAgICBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0dhbWVXZWJTb2NrZXRTZW5kZXJSdWxlJywgeyBcbiAgICAgIGV2ZW50QnVzLFxuICAgICAgZGVzY3JpcHRpb246ICdSdWxlIGZvciBmb3J3YXJkaW5nIGdhbWUgZXZlbnRzIHRvIFdlYlNvY2tldCBjbGllbnRzJyxcbiAgICAgIGV2ZW50UGF0dGVybjoge1xuICAgICAgICBzb3VyY2U6IFsnZ2FtZS5zZXJ2aWNlJ10sXG4gICAgICAgIGRldGFpbFR5cGU6IFtcbiAgICAgICAgICAnR2FtZUNyZWF0ZWQnLCBcbiAgICAgICAgICAnR2FtZVVwZGF0ZWQnLCBcbiAgICAgICAgICAnR2FtZURlbGV0ZWQnLCBcbiAgICAgICAgICAnR2FtZVJlcXVlc3RlZCcsXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgdGFyZ2V0czogW25ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKHdlYlNvY2tldFNlbmRlckxhbWJkYSldLFxuICAgIH0pO1xuXG4gICAgLy8gRGVmaW5lIEFQSVxuXG4gICAgY29uc3QgYXBpID0gbmV3IEh0dHBBcGkodGhpcywgJ0V2ZW50QnJpZGdlQXBpJywge1xuICAgICAgYXBpTmFtZTogJ0V2ZW50QnJpZGdlQXBpJyxcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXG4gICAgICAgICAgQ29yc0h0dHBNZXRob2QuR0VULCBcbiAgICAgICAgICBDb3JzSHR0cE1ldGhvZC5QT1NULCBcbiAgICAgICAgICBDb3JzSHR0cE1ldGhvZC5PUFRJT05TXG4gICAgICAgIF0sXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9ldmVudHMnLFxuICAgICAgbWV0aG9kczogW0h0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRXZlbnRQdWJsaXNoZXJJbnRlZ3JhdGlvbicsIGV2ZW50UHVibGlzaGVyTGFtYmRhKSxcbiAgICB9KTtcbiAgfVxufSBcbiJdfQ==