const { Authenticator } = require('cognito-at-edge');

const authenticator = new Authenticator({
  region: 'us-east-1',
  userPoolId: 'us-east-1_0OuOMPrYV',
  userPoolAppId: '53dbt4feojdrr5i9gpeameio62',
  userPoolDomain: 'us-east-10ouompryv.auth.us-east-1.amazoncognito.com',
});

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2)); // Log the incoming event

  try {
    const request = event.Records[0].cf.request;
    const response = await authenticator.handle(request);
    return response;
  } catch (error) {
    console.error('Error handling authentication:', error);
    return {
      status: '500',
      statusDescription: 'Internal Server Error',
      body: 'Error handling authentication',
    };
  }
};