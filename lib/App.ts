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
import { DockerImage } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';

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

    const userPool = cognito.UserPool.fromUserPoolId(this, 'ExistingUserPool', 'us-east-1_0OuOMPrYV');
    const client = cognito.UserPoolClient.fromUserPoolClientId(this, 'ExistingUserPoolClient', '53dbt4feojdrr5i9gpeameio62');

    // S3 bucket for static website hosting
    const bucket = new s3.Bucket(this, 'WebAppBucket', {
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Change to RETAIN in production
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Ensure the bucket is private
      enforceSSL: true,
    });

    // Define cognito Lambda first
    const cognitoLambdaRole = new iam.Role(this, 'CognitoLambdaRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('lambda.amazonaws.com'),
        new iam.ServicePrincipal('edgelambda.amazonaws.com')
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      inlinePolicies: {
        'EdgeFunctionPolicy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
                'cognito-idp:GetUser',
                's3:GetObject'
              ],
              resources: ['*']  // For edge functions, we need to allow all regions
            })
          ]
        })
      }
    });

    const cognitoLambda = new NodejsFunction(this, 'CognitoLambda', {
      entry: 'lambda/cognito-lambda/index.js', 
      handler: 'handler', 
      runtime: lambda.Runtime.NODEJS_18_X,  // CloudFront requirement
      architecture: lambda.Architecture.X86_64,  // CloudFront requirement
      timeout: Duration.seconds(5),  // CloudFront requirement
      memorySize: 128,
      role: cognitoLambdaRole,
    }); 

    // Then define CloudFront distribution
    const responseHeadersPolicy = cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS;

    const logBucket = new s3.Bucket(this, 'CloudFrontLogsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,  // Enable ACLs
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    const distribution = new cloudfront.Distribution(this, 'WebAppDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [{
          functionVersion: cognitoLambda.currentVersion,
          eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
          includeBody: true
        }],
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        responseHeadersPolicy: responseHeadersPolicy
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0)
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.seconds(0)
        }
      ],
      enableLogging: true,
      logBucket: logBucket,
      logFilePrefix: 'cloudfront-logs/'
    });

    // Add a bucket policy to allow CloudFront access
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${bucket.bucketArn}/*`],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': distribution.distributionArn
          },
        },
      })
    );

    // Deploy website files to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset('./webapp/dist', {
        bundling: {
          command: [
            'bash', '-c',
            'cp -r . /asset-output/'
          ],
          image: DockerImage.fromRegistry('public.ecr.aws/sam/build-nodejs18.x')
        }
      })],
      destinationBucket: bucket,
      distribution: distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
      prune: false,
      retainOnDelete: false
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
      bundling: {
        platform: 'linux/amd64', 
        dockerImage: DockerImage.fromRegistry('public.ecr.aws/sam/build-nodejs20.x:latest-x86_64'),
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

    api.addRoutes({
      path: '/cognito',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('CognitoLambdaIntegration', cognitoLambda), 
    });


  } 
} 


