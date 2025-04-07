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
            }, // commented out to get simple lambda to work on mac cdk deploy --profile <profile>, but do we need bundling to work on windows 11 architecture? 
            // bundling: {
            //   platform: 'linux/amd64', 
            //   dockerImage: DockerImage.fromRegistry('public.ecr.aws/sam/build-nodejs20.x:latest-x86_64'),
            // },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQywyREFBNEY7QUFDNUYsaURBQWdEO0FBQ2hELHFFQUE4RDtBQUM5RCw2Q0FBaUU7QUFDakUsbURBQXFEO0FBQ3JELG1FQUFtRjtBQUNuRiw2RkFBa0Y7QUFFbEYsbURBQW1EO0FBQ25ELCtEQUFzRztBQUN0RywrQ0FBK0Q7QUFDL0QsK0VBQThEO0FBQzlELHFFQUF5RTtBQUN6RSw0REFBNEQ7QUFFNUQsOENBQThDO0FBRTlDLE1BQWEsR0FBSSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ2hDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsb0RBQW9EO1FBQ3BELE1BQU0sY0FBYyxHQUFHO1lBQ3JCLFVBQVUsRUFBRSxxQkFBcUI7WUFDakMsUUFBUSxFQUFFLDRCQUE0QjtTQUN2QyxDQUFDO1FBQ0YsaURBQWlEO1FBQ2pELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ2xHLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFLDRCQUE0QixDQUFDLENBQUM7UUFLekgsZ0JBQWdCO1FBQ2hCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxxQ0FBb0IsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLENBQUMsQ0FBQztRQUUxRix1Q0FBdUM7UUFDdkMsTUFBTSxNQUFNLEdBQUcsSUFBSSxlQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUM5QyxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE1BQU07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VyxFQUFFLElBQUkscURBQXFCLENBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLENBQUM7U0FDbEYsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUNGO0FBNU9ELGtCQTRPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQge1RhYmxlLCBCaWxsaW5nTW9kZSwgQXR0cmlidXRlVHlwZSwgU3RyZWFtVmlld1R5cGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInOyBcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnIFxyXG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJ1xyXG5pbXBvcnQgeyBEdXJhdGlvbiwgUmVtb3ZhbFBvbGljeSwgQ2ZuT3V0cHV0IH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBSZXRlbnRpb25EYXlzIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgeyBIdHRwQXBpLCBDb3JzSHR0cE1ldGhvZCwgSHR0cE1ldGhvZCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xyXG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IERvY2tlckltYWdlIH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0IHsgRGlzdHJpYnV0aW9uLCBPcmlnaW5BY2Nlc3NJZGVudGl0eSwgVmlld2VyUHJvdG9jb2xQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCB7IEJsb2NrUHVibGljQWNjZXNzLCBCdWNrZXQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgeyBTM09yaWdpbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgeyBCdWNrZXREZXBsb3ltZW50LCBTb3VyY2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XHJcbi8vIHsgQVBJR2F0ZXdheUV2ZW50LCBDb250ZXh0LCBDYWxsYmFjayB9IGZyb20gXCJhd3MtbGFtYmRhXCI7XHJcblxyXG4vLyBpbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXBwIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBBZGQgQ29nbml0byBjb25maWcgYXQgdGhlIHRvcCBvZiB5b3VyIGNvbnN0cnVjdG9yXHJcbiAgICBjb25zdCB1c2VyUG9vbENvbmZpZyA9IHtcclxuICAgICAgdXNlclBvb2xJZDogJ3VzLWVhc3QtMV8wT3VPTVByWVYnLCBcclxuICAgICAgY2xpZW50SWQ6ICc1M2RidDRmZW9qZHJyNWk5Z3BlYW1laW82MidcclxuICAgIH07XHJcbiAgICAvLyBUT0RPOiBEZWZpbmUgY29nbml0byBBUk4gZm9yIGJhY2tlbmQgc2VydmljZXMgXHJcbiAgICBjb25zdCB1c2VyUG9vbCA9IGNvZ25pdG8uVXNlclBvb2wuZnJvbVVzZXJQb29sSWQodGhpcywgJ0V4aXN0aW5nVXNlclBvb2wnLCAndXMtZWFzdC0xXzBPdU9NUHJZVicpO1xyXG4gICAgY29uc3QgY2xpZW50ID0gY29nbml0by5Vc2VyUG9vbENsaWVudC5mcm9tVXNlclBvb2xDbGllbnRJZCh0aGlzLCAnRXhpc3RpbmdVc2VyUG9vbENsaWVudCcsICc1M2RidDRmZW9qZHJyNWk5Z3BlYW1laW82MicpO1xyXG5cclxuICAgXHJcblxyXG4gICBcclxuICAgIC8vIHdlYmFwcCBzdGFjayBcclxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IE9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsICdXZWJBcHBPcmlnaW5BY2Nlc3NJZGVudGl0eScpO1xyXG5cclxuICAgIC8vIFMzIGJ1Y2tldCBmb3Igc3RhdGljIHdlYnNpdGUgaG9zdGluZ1xyXG4gICAgY29uc3QgYnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCAnV2ViQXBwQnVja2V0Jywge1xyXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBDbG91ZEZyb250IE9yaWdpbiBBY2Nlc3MgSWRlbnRpdHkgcGVybWlzc2lvbiB0byByZWFkIGZyb20gdGhlIGJ1Y2tldFxyXG4gICAgYnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7XHJcblxyXG4gICAgLy8gQ2xvdWRGcm9udCBkaXN0cmlidXRpb25cclxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBEaXN0cmlidXRpb24odGhpcywgJ1dlYkFwcERpc3RyaWJ1dGlvbicsIHtcclxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XHJcbiAgICAgICAgb3JpZ2luOiBuZXcgUzNPcmlnaW4oYnVja2V0LCB7XHJcbiAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eTogb3JpZ2luQWNjZXNzSWRlbnRpdHksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IFZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICB9LFxyXG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuICAgIC8vIERlcGxveSB0aGUgSFRNTCBmaWxlIHRvIHRoZSBTMyBidWNrZXRcclxuICAgIG5ldyBCdWNrZXREZXBsb3ltZW50KHRoaXMsICdXZWJBcHBEZXBsb3ltZW50Jywge1xyXG4gICAgICBzb3VyY2VzOiBbU291cmNlLmFzc2V0KCcuL3dlYmFwcC9kaXN0JyldLCAvLyBQYXRoIHRvIHlvdXIgd2ViYXBwIGZvbGRlciBjb250YWluaW5nIGluZGV4Lmh0bWxcclxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IGJ1Y2tldCxcclxuICAgICAgZGlzdHJpYnV0aW9uLCAvLyBPcHRpb25hbDogSW52YWxpZGF0ZSBjYWNoZSB3aGVuIG5ldyBjb250ZW50IGlzIGRlcGxveWVkXHJcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sIC8vIE9wdGlvbmFsOiBJbnZhbGlkYXRlIGFsbCBwYXRoc1xyXG4gICAgfSk7XHJcbiAgICAvLyBPdXRwdXQgdGhlIENsb3VkRnJvbnQgVVJMXHJcbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdXZWJBcHBVUkwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kb21haW5OYW1lfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIFVSTCBvZiB0aGUgZGVwbG95ZWQgd2ViIGFwcGxpY2F0aW9uJyxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBcclxuXHJcbiAgICBcclxuXHJcbiAgICBcclxuXHJcbiAgICAvLyBEZXBsb3kgd2Vic2l0ZSBmaWxlcyB0byBTM1xyXG4gICAgLy8gbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XHJcbiAgICAvLyAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQoJy4vd2ViYXBwL2Rpc3QnLCB7XHJcbiAgICAvLyAgICAgYnVuZGxpbmc6IHtcclxuICAgIC8vICAgICAgIGNvbW1hbmQ6IFtcclxuICAgIC8vICAgICAgICAgJ2Jhc2gnLCAnLWMnLFxyXG4gICAgLy8gICAgICAgICAnY3AgLXIgLiAvYXNzZXQtb3V0cHV0LydcclxuICAgIC8vICAgICAgIF0sXHJcbiAgICAvLyAgICAgICBpbWFnZTogRG9ja2VySW1hZ2UuZnJvbVJlZ2lzdHJ5KCdwdWJsaWMuZWNyLmF3cy9zYW0vYnVpbGQtbm9kZWpzMTgueCcpXHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gICB9KV0sXHJcbiAgICAvLyAgIGRlc3RpbmF0aW9uQnVja2V0OiBidWNrZXQsXHJcbiAgICAvLyAgIGRpc3RyaWJ1dGlvbjogZGlzdHJpYnV0aW9uLFxyXG4gICAgLy8gICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxyXG4gICAgLy8gICBtZW1vcnlMaW1pdDogNTEyLFxyXG4gICAgLy8gICBwcnVuZTogZmFsc2UsXHJcbiAgICAvLyAgIHJldGFpbk9uRGVsZXRlOiBmYWxzZVxyXG4gICAgLy8gfSk7XHJcblxyXG4gICBcclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4gICAgLy8vIEJBQ0tFTkQgU1RBQ0sgLy8vXHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgRHluYW1vREIgVGFibGVcclxuICAgIGNvbnN0IHRhYmxlID0gbmV3IFRhYmxlKHRoaXMsICdNeVRhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZToncGsnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6J3NrJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsXHJcbiAgICAgIHN0cmVhbTogU3RyZWFtVmlld1R5cGUuTkVXX0FORF9PTERfSU1BR0VTLFxyXG4gICAgICBiaWxsaW5nTW9kZTogQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIERlZmluZSBhIHNpbXBsZSBMYW1iZGEgZnVuY3Rpb25cclxuICAgIGNvbnN0IHNpbXBsZUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnU2ltcGxlTGFtYmRhJywge1xyXG4gICAgICBlbnRyeTogJ2xhbWJkYS9zaW1wbGUtbGFtYmRhL2luZGV4LmpzJywgXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJywgXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLCBcclxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCwgXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLy8gQlVDS0VUOiBcclxuICAgICAgICBEWU5BTU9EQl9UQUJMRTogdGFibGUudGFibGVOYW1lLCBcclxuICAgICAgICBcclxuICAgICAgfSwgLy8gY29tbWVudGVkIG91dCB0byBnZXQgc2ltcGxlIGxhbWJkYSB0byB3b3JrIG9uIG1hYyBjZGsgZGVwbG95IC0tcHJvZmlsZSA8cHJvZmlsZT4sIGJ1dCBkbyB3ZSBuZWVkIGJ1bmRsaW5nIHRvIHdvcmsgb24gd2luZG93cyAxMSBhcmNoaXRlY3R1cmU/IFxyXG4gICAgICAvLyBidW5kbGluZzoge1xyXG4gICAgICAvLyAgIHBsYXRmb3JtOiAnbGludXgvYW1kNjQnLCBcclxuICAgICAgLy8gICBkb2NrZXJJbWFnZTogRG9ja2VySW1hZ2UuZnJvbVJlZ2lzdHJ5KCdwdWJsaWMuZWNyLmF3cy9zYW0vYnVpbGQtbm9kZWpzMjAueDpsYXRlc3QteDg2XzY0JyksXHJcbiAgICAgIC8vIH0sXHJcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMjkpLFxyXG4gICAgICBsb2dnaW5nRm9ybWF0OiBsYW1iZGEuTG9nZ2luZ0Zvcm1hdC5KU09OLCBcclxuICAgICAgbG9nUmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLlRIUkVFX01PTlRIUywgXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsIFxyXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsICBcclxuICAgIH0pOyBcclxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShzaW1wbGVMYW1iZGEpOyBcclxuICBcclxuXHJcbiAgICAvLyBEZWZpbmUgdGhlIHNhdmUgTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICBjb25zdCBzYXZlTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdTYXZlTGFtYmRhJywge1xyXG4gICAgICBlbnRyeTogJ2xhbWJkYS9zYXZlLWxhbWJkYS9pbmRleC5qcycsIC8vIFBhdGggdG8geW91ciBuZXcgTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJywgXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLCBcclxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCwgXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRFlOQU1PREJfVEFCTEU6IHRhYmxlLnRhYmxlTmFtZSwgLy8gUGFzcyB0aGUgZHlhbm1vIGRiIHRhYmxlIG5hbWUgYXMgYW4gZW52aXJvbm1lbnQgdmFyaWFibGUgXHJcbiAgICAgIH0sIFxyXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDI5KSxcclxuICAgICAgbG9nZ2luZ0Zvcm1hdDogbGFtYmRhLkxvZ2dpbmdGb3JtYXQuSlNPTiwgXHJcbiAgICAgIGxvZ1JldGVudGlvbjogUmV0ZW50aW9uRGF5cy5USFJFRV9NT05USFMsIFxyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LCBcclxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLCAgXHJcbiAgICB9KTtcclxuICAgIC8vIEdyYW50IHJlYWQvd3JpdGUgcGVybWlzc2lvbnMgdG8gdGhlIHNhdmUgTGFtYmRhIFxyXG4gICAgdGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHNhdmVMYW1iZGEpOyBcclxuXHJcblxyXG4gICAgLy8gaHR0cCBhcGkgXHJcbiAgICBjb25zdCBhcGkgPSBuZXcgSHR0cEFwaSh0aGlzLCAnQXBwQXBpJywge1xyXG4gICAgICBhcGlOYW1lOiAnQXBwQXBpJyxcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sICAvLyBJbiBwcm9kdWN0aW9uLCBzcGVjaWZ5IHlvdXIgYWN0dWFsIGRvbWFpbiBpbnN0ZWFkIG9mICcqJ1xyXG4gICAgICAgIGFsbG93TWV0aG9kczogW1xyXG4gICAgICAgICAgQ29yc0h0dHBNZXRob2QuR0VULCBcclxuICAgICAgICAgIENvcnNIdHRwTWV0aG9kLlBPU1QsIFxyXG4gICAgICAgICAgQ29yc0h0dHBNZXRob2QuUFVULCBcclxuICAgICAgICAgIENvcnNIdHRwTWV0aG9kLkRFTEVURSwgXHJcbiAgICAgICAgICBDb3JzSHR0cE1ldGhvZC5PUFRJT05TXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nLCAnQWNjZXNzLUNvbnRyb2wtUmVxdWVzdC1IZWFkZXJzJ10sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgR2FtZSBMYW1iZGFcclxuICAgIGNvbnN0IGNyZWF0ZUdhbWVMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0NyZWF0ZUdhbWVMYW1iZGEnLCB7XHJcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2NyZWF0ZS1nYW1lL2luZGV4LmpzJyxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBEWU5BTU9EQl9UQUJMRTogdGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IEdhbWUgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRHYW1lTGFtYmRhID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRHYW1lTGFtYmRhJywge1xyXG4gICAgICBlbnRyeTogJ2xhbWJkYS9nZXQtZ2FtZS9pbmRleC5qcycsXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRFlOQU1PREJfVEFCTEU6IHRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBHYW1lIExhbWJkYVxyXG4gICAgY29uc3QgdXBkYXRlR2FtZUxhbWJkYSA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnVXBkYXRlR2FtZUxhbWJkYScsIHtcclxuICAgICAgZW50cnk6ICdsYW1iZGEvdXBkYXRlLWdhbWUvaW5kZXguanMnLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIERZTkFNT0RCX1RBQkxFOiB0YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBEZWxldGUgR2FtZSBMYW1iZGFcclxuICAgIGNvbnN0IGRlbGV0ZUdhbWVMYW1iZGEgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0RlbGV0ZUdhbWVMYW1iZGEnLCB7XHJcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2RlbGV0ZS1nYW1lL2luZGV4LmpzJyxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBEWU5BTU9EQl9UQUJMRTogdGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcclxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVHYW1lTGFtYmRhKTtcclxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShnZXRHYW1lTGFtYmRhKTtcclxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVHYW1lTGFtYmRhKTtcclxuICAgIHRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShkZWxldGVHYW1lTGFtYmRhKTtcclxuXHJcbiAgICAvLyBBZGQgcm91dGVzIHRvIEFQSVxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZ2FtZXMnLFxyXG4gICAgICBtZXRob2RzOiBbSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZUdhbWVJbnRlZ3JhdGlvbicsIGNyZWF0ZUdhbWVMYW1iZGEpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZ2FtZXMve2dhbWVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0R2FtZUludGVncmF0aW9uJywgZ2V0R2FtZUxhbWJkYSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9nYW1lcy97Z2FtZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFtIdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVHYW1lSW50ZWdyYXRpb24nLCB1cGRhdGVHYW1lTGFtYmRhKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2dhbWVzL3tnYW1lSWR9JyxcclxuICAgICAgbWV0aG9kczogW0h0dHBNZXRob2QuREVMRVRFXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0RlbGV0ZUdhbWVJbnRlZ3JhdGlvbicsIGRlbGV0ZUdhbWVMYW1iZGEpLFxyXG4gICAgfSk7XHJcblxyXG4gIH0gXHJcbn0gXHJcblxyXG5cclxuIl19