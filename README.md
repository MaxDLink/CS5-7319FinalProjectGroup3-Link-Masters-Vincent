### Compilation & Implementation Platform

Javascript in Visual Studio Code with AWS CDK & Vite

AWS CDK Version: 2.148.1

Node.js Version: 20.14.9

### What to download

Visual studio code: https://code.visualstudio.com/

To install aws cdk and vite, run the following:

cd selected && npm install && cd webapp && npm install

cd unselected && npm install && cd webapp && npm install

### How to compile the code:

1. cd selected/webapp

2. npm run build

### Serve with vite for local testing

cd selected/webapp/ && npm run build && npm run dev

### Deploy to AWS with cdk deploy

cd selected/webapp && npm run build && cd .. && cdk deploy

If you want to avoid deploying, here are the deployed links that you can paste into your browser. This way you can quickly test the deployed versions without having to configure your aws account.

Selected: https://d3lgu0g9lgbw30.cloudfront.net

Unselected: https://d2sv6rk6q755dp.cloudfront.net

### Changes to Approach 

Originally, we wanted to develop a single client side architecture in our proposal. However, we decided to split this single client side server implementation two different implementations: 

1. A RESTFUL API implementation

2. An Eventbus implementation

Splitting into 1 and 2 lets us compare and dive deeper into the technicalities specific to these implementations. 
Instead of over generalizing our architecture, we will be able to use an architectural style tailored to our use case.  


### AWS Serverless 

Our implementation also uses AWS S3 and Cloudfront, which fall under AWS serverless. Cloudfront gives us over 300 global points of presence. Points of presence cache content closer to the user, so there is lower latency and faster load times. On top of this, each AWS region (in our case us-east-1) has three availability zones. These availability zones are data centers, so if one goes down, then we have two more so that our app stays up. These services are highly scalable, meaning that our game could take on thousands of concurrent players if we were to add multiplayer. 

### Selected Architecture:

EventBus - one constant connection

Event bus has a real time connection which means that multiple events can happen at once. Features are easier to add because the event bus structure decouples the features. Scalability is easier with event bus. 

The RESTFUL architecture is a request and response format, which means that real time communication is not possible and features are harder to add because features are not decoupled. Multiple users are not allowed to interact with RESTFUL api. 

For our game setup, the eventbus allows us to scale with new features and even add in multiplayer later. The event bus is the optimal choice. 

### Unselected Architecture:

RESTFUL API - small procedure calls using api gateway. Clunkier than EventBus

RESTFUL architecture has low latency and it is difficult to maintain real time features


In the Readme Word file, you must elaborate in detail on the difference
between your implementations (e.g., source code, reusable
components/connectors, etc.) for both candidate architecture styles.