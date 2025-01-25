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
  
  // Add CORS headers with specific origin
  const corsHeaders = {
    'access-control-allow-origin': [{
      key: 'Access-Control-Allow-Origin',
      value: 'https://d10iucnlpv2uup.cloudfront.net'
    }],
    'access-control-allow-methods': [{
      key: 'Access-Control-Allow-Methods',
      value: 'GET,POST,OPTIONS'
    }],
    'access-control-allow-credentials': [{
      key: 'Access-Control-Allow-Credentials',
      value: 'true'
    }]
  };

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: '204',
      statusDescription: 'No Content',
      headers: corsHeaders
    };
  }

  // Always allow static assets and root
  if (request.uri === '/' || request.uri.match(/\.(html|js|css|jpg|png|gif)$/)) {
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
          ...corsHeaders,
          'location': [{
            key: 'Location',
            value: 'https://d10iucnlpv2uup.cloudfront.net/'  // Explicit redirect URL
          }],
          'set-cookie': [{
            key: 'Set-Cookie',
            value: `CognitoToken=${code}; Path=/; Secure; SameSite=Lax; Domain=d10iucnlpv2uup.cloudfront.net`
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
      `client_id=53dbt4feojdrr5i9gpeameio62&` +
      `response_type=code&` +
      `scope=email+openid&` +
      `redirect_uri=${encodeURIComponent('https://d10iucnlpv2uup.cloudfront.net')}`;

    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        ...corsHeaders,
        'location': [{
          key: 'Location',
          value: loginUrl
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
        ...corsHeaders,
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

  // Handle root path without auth
  if (request.uri === '/' && !authCookie) {
    console.log('Root path without auth, redirecting to login');
    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        ...corsHeaders,
        'location': [{
          key: 'Location',
          value: '/login'
        }]
      }
    };
  }

  console.log('Auth cookie found, allowing request');
  return request;
};