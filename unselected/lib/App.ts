import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb'; 
import * as lambda from 'aws-cdk-lib/aws-lambda' 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { DockerImage } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
// Add imports for EventBridge
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
// { APIGatewayEvent, Context, Callback } from "aws-lambda";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class App extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Add Cognito config at the top of your constructor
    const userPoolConfig = {
      userPoolId: 'us-east-1_0OuOMPrYV', 
      clientId: '53dbt4feojdrr5i9gpeameio62'
    };
    // TODO: Define cognito ARN for backend services 
    const userPool = cognito.UserPool.fromUserPoolId(this, 'ExistingUserPool', 'us-east-1_0OuOMPrYV');
    const client = cognito.UserPoolClient.fromUserPoolClientId(this, 'ExistingUserPoolClient', '53dbt4feojdrr5i9gpeameio62');

   
    // webapp stack 
    const originAccessIdentity = new OriginAccessIdentity(this, 'WebAppOriginAccessIdentity');

    // S3 bucket for static website hosting
    const bucket = new Bucket(this, 'WebAppBucket', {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    // Grant CloudFront Origin Access Identity permission to read from the bucket
    bucket.grantRead(originAccessIdentity);

    // CloudFront distribution
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
    // Deploy the HTML file to the S3 bucket
    new BucketDeployment(this, 'WebAppDeployment', {
      sources: [Source.asset('./webapp/dist')], // Path to your webapp folder containing index.html
      destinationBucket: bucket,
      distribution, // Optional: Invalidate cache when new content is deployed
      distributionPaths: ['/*'], // Optional: Invalidate all paths
    });
    // Output the CloudFront URL
    new CfnOutput(this, 'WebAppURL', {
      value: `https://${distribution.domainName}`,
      description: 'The URL of the deployed web application',
    });

    /// EVENTBUS STACK ///

    // Create a DynamoDB Table
    const table = new Table(this, 'MyTable', {
      partitionKey: { name:'pk', type: AttributeType.STRING },
      sortKey: { name:'sk', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Create an EventBridge event bus
    const eventBus = new events.EventBus(this, 'GameEventBus', {
      eventBusName: 'game-events'
    });

    // Output the EventBus name
    new CfnOutput(this, 'EventBusName', {
      value: eventBus.eventBusName,
      description: 'Name of the EventBridge event bus',
    });

    // Define a simple Lambda function
    const simpleLambda = new NodejsFunction(this, 'SimpleLambda', {
      entry: 'lambda/simple-lambda/index.js', 
      handler: 'handler', 
      runtime: lambda.Runtime.NODEJS_20_X, 
      architecture: lambda.Architecture.ARM_64, 
      environment: {
        DYNAMODB_TABLE: table.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      }, 
      timeout: Duration.seconds(29),
      loggingFormat: lambda.LoggingFormat.JSON, 
      logRetention: RetentionDays.THREE_MONTHS, 
      memorySize: 1024, 
      tracing: lambda.Tracing.ACTIVE,  
    }); 
    table.grantReadWriteData(simpleLambda); 
    // Grant permission to put events on the event bus
    eventBus.grantPutEventsTo(simpleLambda);
  
    // Define the save Lambda function
    const saveLambda = new NodejsFunction(this, 'SaveLambda', {
      entry: 'lambda/save-lambda/index.js', 
      handler: 'handler', 
      runtime: lambda.Runtime.NODEJS_20_X, 
      architecture: lambda.Architecture.ARM_64, 
      environment: {
        DYNAMODB_TABLE: table.tableName,
        EVENT_BUS_NAME: eventBus.eventBusName,
      }, 
      timeout: Duration.seconds(29),
      loggingFormat: lambda.LoggingFormat.JSON, 
      logRetention: RetentionDays.THREE_MONTHS, 
      memorySize: 1024, 
      tracing: lambda.Tracing.ACTIVE,  
    });
    // Grant read/write permissions to the save Lambda 
    table.grantReadWriteData(saveLambda);
    // Grant permission to put events on the event bus
    eventBus.grantPutEventsTo(saveLambda);

    // Create Game Lambda
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

    // Get Game Lambda
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

    // Update Game Lambda
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

    // Delete Game Lambda
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

    // Create EventBridge rules to route events to Lambda functions
    
    // Rule for game creation events
    new events.Rule(this, 'GameCreatedRule', {
      eventBus,
      description: 'Rule for game creation events',
      eventPattern: {
        source: ['game.service'],
        detailType: ['GameCreated'],
      },
      targets: [new targets.LambdaFunction(createGameLambda)],
    });

    // Rule for game update events
    new events.Rule(this, 'GameUpdatedRule', {
      eventBus,
      description: 'Rule for game update events',
      eventPattern: {
        source: ['game.service'],
        detailType: ['GameUpdated'],
      },
      targets: [new targets.LambdaFunction(updateGameLambda)],
    });

    // Rule for game deletion events
    new events.Rule(this, 'GameDeletedRule', {
      eventBus,
      description: 'Rule for game deletion events',
      eventPattern: {
        source: ['game.service'],
        detailType: ['GameDeleted'],
      },
      targets: [new targets.LambdaFunction(deleteGameLambda)],
    });

    // Rule for general save events
    new events.Rule(this, 'DataSavedRule', {
      eventBus,
      description: 'Rule for data save events',
      eventPattern: {
        source: ['data.service'],
        detailType: ['DataSaved'],
      },
      targets: [new targets.LambdaFunction(saveLambda)],
    });

    // Create an HTTP API that can publish events to EventBridge
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

    // Create a Lambda function to handle HTTP requests and publish to EventBridge
    const eventPublisherLambda = new NodejsFunction(this, 'EventPublisherLambda', {
      entry: 'lambda/event-publisher/index.js', // Use the dedicated event publisher Lambda
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        EVENT_BUS_NAME: eventBus.eventBusName,
      },
    });
    eventBus.grantPutEventsTo(eventPublisherLambda);

    // Add route to the API
    api.addRoutes({
      path: '/events',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('EventPublisherIntegration', eventPublisherLambda),
    });

    // Output the API URL
    new CfnOutput(this, 'EventBridgeApiUrl', {
      value: api.apiEndpoint,
      description: 'The URL of the EventBridge API',
    });
  }
} 


