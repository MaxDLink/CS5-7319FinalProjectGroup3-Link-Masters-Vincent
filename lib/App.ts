import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Table, BillingMode, AttributeType, StreamViewType } from 'aws-cdk-lib/aws-dynamodb'; 
import * as lambda from 'aws-cdk-lib/aws-lambda' 
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HttpApi, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'; 
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'; 
import * as iam from 'aws-cdk-lib/aws-iam';

// { APIGatewayEvent, Context, Callback } from "aws-lambda";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class App extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
    // S3 bucket for static website hosting
    const bucket = new s3.Bucket(this, 'WebAppBucket', {
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Ensure the bucket is private
      enforceSSL: true,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'WebAppDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html', // Serve index.html as the default
    });

    // Add a bucket policy to allow CloudFront access
    bucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/*`],
        principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      })
    );

    // Deploy the HTML file to the S3 bucket
    new s3deploy.BucketDeployment(this, 'WebAppDeployment', {
      sources: [s3deploy.Source.asset('./webapp/dist')], // Use the dist folder for deployment
      destinationBucket: bucket,
      distribution, // Optional: Invalidate cache when new content is deployed
      distributionPaths: ['/*'], // Optional: Invalidate all paths
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'WebAppURL', {
      value: `https://${distribution.domainName}`,
      description: 'The URL of the deployed web application',
    });

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
        
      }, 
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
        allowOrigins: ['*'], // Production and development origins
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS], // Allow specific HTTP methods
        allowHeaders: ['Content-Type', 'Authorization', 'Access-Control-Request-Headers'],
      },
    });

    // Add a route connected to Lambda
    api.addRoutes({
      path: '/load',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('LambdaIntegration', simpleLambda), 
    });

    // Add a save route connected to Lambda
    api.addRoutes({
      path: '/save',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('SaveLambdaIntegration', saveLambda), 
    });


  } 
} 


