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
    
    

    

    

    // Deploy website files to S3
    // new s3deploy.BucketDeployment(this, 'DeployWebsite', {
    //   sources: [s3deploy.Source.asset('./webapp/dist', {
    //     bundling: {
    //       command: [
    //         'bash', '-c',
    //         'cp -r . /asset-output/'
    //       ],
    //       image: DockerImage.fromRegistry('public.ecr.aws/sam/build-nodejs18.x')
    //     }
    //   })],
    //   destinationBucket: bucket,
    //   distribution: distribution,
    //   distributionPaths: ['/*'],
    //   memoryLimit: 512,
    //   prune: false,
    //   retainOnDelete: false
    // });

   








    /// BACKEND STACK ///

    // Create a DynamoDB Table
    const table = new Table(this, 'MyTable', {
      partitionKey: { name:'pk', type: AttributeType.STRING },
      sortKey: { name:'sk', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: BillingMode.PAY_PER_REQUEST,

    });

    // Define a simple Lambda function
    const simpleLambda = new NodejsFunction(this, 'SimpleLambda', {
      entry: 'lambda/simple-lambda/index.js', 
      handler: 'handler', 
      runtime: lambda.Runtime.NODEJS_20_X, 
      architecture: lambda.Architecture.ARM_64, 
      environment: {
        // BUCKET: 
        DYNAMODB_TABLE: table.tableName, 
        
      }, // commented out to get simple lambda to work on mac cdk deploy --profile <profile>, but do we need bundling to work on windows 11 architecture? 
      // bundling: {
      //   platform: 'linux/amd64', 
      //   dockerImage: DockerImage.fromRegistry('public.ecr.aws/sam/build-nodejs20.x:latest-x86_64'),
      // },
      timeout: Duration.seconds(29),
      loggingFormat: lambda.LoggingFormat.JSON, 
      logRetention: RetentionDays.THREE_MONTHS, 
      memorySize: 1024, 
      tracing: lambda.Tracing.ACTIVE,  
    }); 
    table.grantReadWriteData(simpleLambda); 
  

    // Define the save Lambda function
    const saveLambda = new NodejsFunction(this, 'SaveLambda', {
      entry: 'lambda/save-lambda/index.js', // Path to your new Lambda function
      handler: 'handler', 
      runtime: lambda.Runtime.NODEJS_20_X, 
      architecture: lambda.Architecture.ARM_64, 
      environment: {
        DYNAMODB_TABLE: table.tableName, // Pass the dyanmo db table name as an environment variable 
      }, 
      timeout: Duration.seconds(29),
      loggingFormat: lambda.LoggingFormat.JSON, 
      logRetention: RetentionDays.THREE_MONTHS, 
      memorySize: 1024, 
      tracing: lambda.Tracing.ACTIVE,  
    });
    // Grant read/write permissions to the save Lambda 
    table.grantReadWriteData(saveLambda); 


    // http api 
    const api = new HttpApi(this, 'AppApi', {
      apiName: 'AppApi',
      corsPreflight: {
        allowOrigins: ['*'],  // In production, specify your actual domain instead of '*'
        allowMethods: [
          CorsHttpMethod.GET, 
          CorsHttpMethod.POST, 
          CorsHttpMethod.PUT, 
          CorsHttpMethod.DELETE, 
          CorsHttpMethod.OPTIONS
        ],
        allowHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Headers'],
      },
    });

    // Create Game Lambda
    const createGameLambda = new NodejsFunction(this, 'CreateGameLambda', {
      entry: 'lambda/create-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    // Get Game Lambda
    const getGameLambda = new NodejsFunction(this, 'GetGameLambda', {
      entry: 'lambda/get-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    // Update Game Lambda
    const updateGameLambda = new NodejsFunction(this, 'UpdateGameLambda', {
      entry: 'lambda/update-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    // Delete Game Lambda
    const deleteGameLambda = new NodejsFunction(this, 'DeleteGameLambda', {
      entry: 'lambda/delete-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    // Grant permissions
    table.grantReadWriteData(createGameLambda);
    table.grantReadWriteData(getGameLambda);
    table.grantReadWriteData(updateGameLambda);
    table.grantReadWriteData(deleteGameLambda);

    // CREATE - Start new game
    api.addRoutes({
      path: '/games',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('CreateGameIntegration', createGameLambda),
    });

    // READ - Get game state
    api.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetGameIntegration', getGameLambda),
    });

    // UPDATE - Update game state (moves, ship positions)
    api.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.PUT],
      integration: new HttpLambdaIntegration('UpdateGameIntegration', updateGameLambda),
    });

    // DELETE - End/delete game
    api.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.DELETE],
      integration: new HttpLambdaIntegration('DeleteGameIntegration', deleteGameLambda),
    });


  } 
} 


