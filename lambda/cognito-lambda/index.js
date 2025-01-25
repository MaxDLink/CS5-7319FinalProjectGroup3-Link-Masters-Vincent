const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');

const cognito = new CognitoIdentityProvider({ region: 'us-east-1' });

const userPoolConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_0OuOMPrYV',
  clientId: '53dbt4feojdrr5i9gpeameio62'
};

exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  console.log('Request:', JSON.stringify(request, null, 2));
  
  // Always allow static assets and root
  if (request.uri === '/' || request.uri.match(/\.(html|js|css|jpg|png|gif)$/)) {
    console.log('Allowing static asset or root:', request.uri);
    return request;
  }

  // Handle OAuth callback with code
  if (request.querystring && request.querystring.includes('code=')) {
    console.log('Handling OAuth callback');
    try {
      const params = new URLSearchParams(request.querystring);
      const code = params.get('code');
      
      return {
        status: '302',
        statusDescription: 'Found',
        headers: {
          'location': [{
            key: 'Location',
            value: '/'
          }],
          'set-cookie': [{
            key: 'Set-Cookie',
            value: `CognitoToken=${code}; Path=/; Secure; SameSite=Lax; Domain=${request.headers.host[0].value}`
          }],
          'cache-control': [{
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate'
          }]
        }
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return request;
    }
  }

  // Handle login page request
  if (request.uri === '/login') {
    console.log('Redirecting to login');
    const loginUrl = `https://us-east-10ouompryv.auth.us-east-1.amazoncognito.com/oauth2/authorize?` +
      `client_id=${userPoolConfig.clientId}&` +
      `response_type=code&` +
      `scope=email+openid&` +
      `redirect_uri=https://${request.headers.host[0].value}`;

    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        'location': [{
          key: 'Location',
          value: loginUrl
        }],
        'cache-control': [{
          key: 'Cache-Control',
          value: 'no-cache'
        }]
      }
    };
  }

  // Check for auth cookie
  const cookies = request.headers.cookie || [];
  const authCookie = cookies.find(cookie => cookie.value.includes('CognitoToken='));
  
  if (!authCookie) {
    console.log('No auth cookie found, redirecting to login');
    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        'location': [{
          key: 'Location',
          value: '/login'
        }],
        'cache-control': [{
          key: 'Cache-Control',
          value: 'no-cache'
        }]
      }
    };
  }

  console.log('Auth cookie found, allowing request');
  return request;
};