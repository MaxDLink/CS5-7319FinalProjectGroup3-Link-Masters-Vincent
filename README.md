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

Event bus has a real time connection which means that multiple events can happen at once. Features are easier to add because the event bus structure decouples the features. Scalability is easier with event bus. All of our functions communicate through the eventbus, which means that we have a separation of concerns. We achieve this communication with api gateway and eventbridge and a websocket. The eventbridge has rules that allow or disallow routing events through the eventbus. The client sends a message via the websocket up to api gateway. Api gateway triggers the default.js lambda function to publish an event to eventbridge. Eventbridge routes the function based on routing rules to another targeted lambda function. The function publishes an event back through eventbridge to the client and the sender.js lambda displays that event to the client.

Eventbus has strong decoupling, enhanced scalability, and filtering with eventbridge rules. Some cons of Eventbus are that it has potential latency, error handling complexity, and "eventual consistency". This eventual consistency means that different parts of the program can update at different times, but optimistic updating can improve this issue from a user experience perspective.

### Unselected Architecture:

The RESTFUL architecture is a request and response format. The RESTFUL api uses apigateway endpoints POST, GET, PUT, DELETE. RESTFUL api lacks event routing, which means that real time communication is more difficult compared to Eventbus. RESTFUL api is stateless, which means that every request from a client contains all the information needed for the server to fulfill it. However, REST can suffer from over-fetching and under-fetching and chattiness with complex operations. There may also be slight overhead for requests, since every request must be self contained.

Eventbus favors a game format compared to RESTFUL api.

### Rationale for Final Selection

For our game setup, the eventbus allows us to scale with new features and even add in multiplayer later

The event bus is the optimal choice.
