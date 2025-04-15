import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb'; 
import * as lambda from 'aws-cdk-lib/aws-lambda' 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';

export class App extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const originAccessIdentity = new OriginAccessIdentity(this, 'WebAppOriginAccessIdentity');

    const bucket = new Bucket(this, 'WebAppBucket', {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });
    bucket.grantRead(originAccessIdentity);

    // Define CloudFront 
    const distribution = new Distribution(this, 'WebAppDistribution', {
      defaultBehavior: {
        origin: new S3Origin(bucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
    new BucketDeployment(this, 'WebAppDeployment', {
      sources: [Source.asset('./webapp/dist')],
      destinationBucket: bucket,
      distribution, 
      distributionPaths: ['/*'], 
    });

    new CfnOutput(this, 'WebAppURL', {
      value: `https://${distribution.domainName}`,
      description: 'The URL of the deployed web application',
    });

    const eventBus = new events.EventBus(this, 'GameEventBus', {
      eventBusName: 'game-events'
    });

    // Define Database

    const table = new Table(this, 'MyTable', {
      partitionKey: { name:'pk', type: AttributeType.STRING },
      sortKey: { name:'sk', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    const connectionsTable = new Table(this, 'WebSocketConnections', {
      partitionKey: { name: 'connectionId', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Define Lambdas

    const createGameLambda = new NodejsFunction(this, 'CreateGameLambda', {
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

    const getGameLambda = new NodejsFunction(this, 'GetGameLambda', {
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

    const updateGameLambda = new NodejsFunction(this, 'UpdateGameLambda', {
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

    const deleteGameLambda = new NodejsFunction(this, 'DeleteGameLambda', {
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

    const eventPublisherLambda = new NodejsFunction(this, 'EventPublisherLambda', {
      entry: 'lambda/event-publisher/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
    });
    eventBus.grantPutEventsTo(eventPublisherLambda);

    const webSocketConnectHandler = new NodejsFunction(this, 'WebSocketConnectHandler', {
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

    const webSocketDisconnectHandler = new NodejsFunction(this, 'WebSocketDisconnectHandler', {
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

    const webSocketDefaultHandler = new NodejsFunction(this, 'WebSocketDefaultHandler', {
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

    const webSocketApi = new WebSocketApi(this, 'GameWebSocketApi', {
      connectRouteOptions: { integration: new WebSocketLambdaIntegration('ConnectIntegration', webSocketConnectHandler) },
      disconnectRouteOptions: { integration: new WebSocketLambdaIntegration('DisconnectIntegration', webSocketDisconnectHandler) },
      defaultRouteOptions: { integration: new WebSocketLambdaIntegration('DefaultIntegration', webSocketDefaultHandler) },
    });

    const webSocketStage = new WebSocketStage(this, 'GameWebSocketStage', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
    });

    const webSocketSenderLambda = new NodejsFunction(this, 'WebSocketSenderLambda', {
      entry: 'lambda/websocket-handlers/sender.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        WEBSOCKET_ENDPOINT: webSocketStage.url.replace('wss://', ''),
      },
    });
    connectionsTable.grantReadWriteData(webSocketSenderLambda);
    webSocketSenderLambda.addEnvironment('CONNECTIONS_TABLE', connectionsTable.tableName);

    webSocketSenderLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['execute-api:ManageConnections'],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/*`],
      })
    );

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

    const api = new HttpApi(this, 'EventBridgeApi', {
      apiName: 'EventBridgeApi',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          CorsHttpMethod.GET, 
          CorsHttpMethod.POST, 
          CorsHttpMethod.OPTIONS
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    api.addRoutes({
      path: '/events',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('EventPublisherIntegration', eventPublisherLambda),
    });
  }
} 
