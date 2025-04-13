"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const cdk = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const lambda = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const aws_apigatewayv2_1 = require("aws-cdk-lib/aws-apigatewayv2");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const cognito = require("aws-cdk-lib/aws-cognito");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
// { APIGatewayEvent, Context, Callback } from "aws-lambda";
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class App extends cdk.Stack {
    constructor(scope, id, props) {
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
        const originAccessIdentity = new aws_cloudfront_1.OriginAccessIdentity(this, 'WebAppOriginAccessIdentity');
        // S3 bucket for static website hosting
        const bucket = new aws_s3_1.Bucket(this, 'WebAppBucket', {
            publicReadAccess: false,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
        });
        // Grant CloudFront Origin Access Identity permission to read from the bucket
        bucket.grantRead(originAccessIdentity);
        // CloudFront distribution
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
        // Deploy the HTML file to the S3 bucket
        new aws_s3_deployment_1.BucketDeployment(this, 'WebAppDeployment', {
            sources: [aws_s3_deployment_1.Source.asset('./webapp/dist')], // Path to your webapp folder containing index.html
            destinationBucket: bucket,
            distribution, // Optional: Invalidate cache when new content is deployed
            distributionPaths: ['/*'], // Optional: Invalidate all paths
        });
        // Output the CloudFront URL
        new aws_cdk_lib_1.CfnOutput(this, 'WebAppURL', {
            value: `https://${distribution.domainName}`,
            description: 'The URL of the deployed web application',
        });
        /// BACKEND STACK ///
        // Create a DynamoDB Table
        const table = new aws_dynamodb_1.Table(this, 'MyTable', {
            partitionKey: { name: 'pk', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'sk', type: aws_dynamodb_1.AttributeType.STRING },
            timeToLiveAttribute: 'ttl',
            stream: aws_dynamodb_1.StreamViewType.NEW_AND_OLD_IMAGES,
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
        });
        // Define a simple Lambda function
        const simpleLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'SimpleLambda', {
            entry: 'lambda/simple-lambda/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            environment: {
                // BUCKET: 
                DYNAMODB_TABLE: table.tableName,
            }, 
            timeout: aws_cdk_lib_1.Duration.seconds(29),
            loggingFormat: lambda.LoggingFormat.JSON,
            logRetention: aws_logs_1.RetentionDays.THREE_MONTHS,
            memorySize: 1024,
            tracing: lambda.Tracing.ACTIVE,
        });
        table.grantReadWriteData(simpleLambda);
        // Define the save Lambda function
        const saveLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'SaveLambda', {
            entry: 'lambda/save-lambda/index.js', // Path to your new Lambda function
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            environment: {
                DYNAMODB_TABLE: table.tableName, // Pass the dyanmo db table name as an environment variable 
            },
            timeout: aws_cdk_lib_1.Duration.seconds(29),
            loggingFormat: lambda.LoggingFormat.JSON,
            logRetention: aws_logs_1.RetentionDays.THREE_MONTHS,
            memorySize: 1024,
            tracing: lambda.Tracing.ACTIVE,
        });
        // Grant read/write permissions to the save Lambda 
        table.grantReadWriteData(saveLambda);
        // http api 
        const api = new aws_apigatewayv2_1.HttpApi(this, 'AppApi', {
            apiName: 'AppApi',
            corsPreflight: {
                allowOrigins: ['*'], // In production, specify your actual domain instead of '*'
                allowMethods: [
                    aws_apigatewayv2_1.CorsHttpMethod.GET,
                    aws_apigatewayv2_1.CorsHttpMethod.POST,
                    aws_apigatewayv2_1.CorsHttpMethod.PUT,
                    aws_apigatewayv2_1.CorsHttpMethod.DELETE,
                    aws_apigatewayv2_1.CorsHttpMethod.OPTIONS
                ],
                allowHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Headers'],
            },
        });
        // Create Game Lambda
        const createGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'CreateGameLambda', {
            entry: 'lambda/create-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
            },
        });
        // Get Game Lambda
        const getGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'GetGameLambda', {
            entry: 'lambda/get-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
            },
        });
        // Update Game Lambda
        const updateGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'UpdateGameLambda', {
            entry: 'lambda/update-game/index.js',
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                DYNAMODB_TABLE: table.tableName,
            },
        });
        // Delete Game Lambda
        const deleteGameLambda = new aws_lambda_nodejs_1.NodejsFunction(this, 'DeleteGameLambda', {
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
        // Add routes to API
        api.addRoutes({
            path: '/games',
            methods: [aws_apigatewayv2_1.HttpMethod.POST],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('CreateGameIntegration', createGameLambda),
        });
        api.addRoutes({
            path: '/games/{gameId}',
            methods: [aws_apigatewayv2_1.HttpMethod.GET],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('GetGameIntegration', getGameLambda),
        });
        api.addRoutes({
            path: '/games/{gameId}',
            methods: [aws_apigatewayv2_1.HttpMethod.PUT],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('UpdateGameIntegration', updateGameLambda),
        });
        api.addRoutes({
            path: '/games/{gameId}',
            methods: [aws_apigatewayv2_1.HttpMethod.DELETE],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('DeleteGameIntegration', deleteGameLambda),
        });
    }
}
exports.App = App;
