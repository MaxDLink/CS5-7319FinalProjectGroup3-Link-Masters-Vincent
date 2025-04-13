import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb'; 
import * as lambda from 'aws-cdk-lib/aws-lambda' 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';


export class App extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
    const userPool = cognito.UserPool.fromUserPoolId(this, 'ExistingUserPool', 'us-east-1_0OuOMPrYV');
    const client = cognito.UserPoolClient.fromUserPoolClientId(this, 'ExistingUserPoolClient', '53dbt4feojdrr5i9gpeameio62');

   

   
    const originAccessIdentity = new OriginAccessIdentity(this, 'WebAppOriginAccessIdentity');

    const bucket = new Bucket(this, 'WebAppBucket', {
      publicReadAccess: false,
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
    });

    bucket.grantRead(originAccessIdentity);

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
    



    /// RESTFUL API BACKEND STACK ///

    const table = new Table(this, 'MyTable', {
      partitionKey: { name:'pk', type: AttributeType.STRING },
      sortKey: { name:'sk', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      billingMode: BillingMode.PAY_PER_REQUEST,

    });


    const api = new HttpApi(this, 'AppApi', {
      apiName: 'AppApi',
      corsPreflight: {
        allowOrigins: ['*'], 
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

    const createGameLambda = new NodejsFunction(this, 'CreateGameLambda', {
      entry: 'lambda/create-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    const getGameLambda = new NodejsFunction(this, 'GetGameLambda', {
      entry: 'lambda/get-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    const updateGameLambda = new NodejsFunction(this, 'UpdateGameLambda', {
      entry: 'lambda/update-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    const deleteGameLambda = new NodejsFunction(this, 'DeleteGameLambda', {
      entry: 'lambda/delete-game/index.js',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE: table.tableName,
      },
    });

    table.grantReadWriteData(createGameLambda);
    table.grantReadWriteData(getGameLambda);
    table.grantReadWriteData(updateGameLambda);
    table.grantReadWriteData(deleteGameLambda);

    api.addRoutes({
      path: '/games',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('CreateGameIntegration', createGameLambda),
    });

    api.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('GetGameIntegration', getGameLambda),
    });

    api.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.PUT],
      integration: new HttpLambdaIntegration('UpdateGameIntegration', updateGameLambda),
    });

    api.addRoutes({
      path: '/games/{gameId}',
      methods: [HttpMethod.DELETE],
      integration: new HttpLambdaIntegration('DeleteGameIntegration', deleteGameLambda),
    });

  } 
} 


