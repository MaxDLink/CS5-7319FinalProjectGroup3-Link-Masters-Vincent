import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({ region: 'us-east-1' });

const userPoolConfig = {
  region: 'us-east-1',
  userPoolId: 'us-east-1_0OuOMPrYV',
  clientId: '53dbt4feojdrr5i9gpeameio62'
};

const corsHeaders = {
  'access-control-allow-origin': [{
    key: 'Access-Control-Allow-Origin',
    value: 'https://d10iucnlpv2uup.cloudfront.net'
  }],
  'access-control-allow-methods': [{
    key: 'Access-Control-Allow-Methods',
    value: 'GET, HEAD, OPTIONS, POST'
  }],
  'access-control-allow-headers': [{
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token'
  }],
  'access-control-expose-headers': [{
    key: 'Access-Control-Expose-Headers',
    value: 'Location'
  }],
  'access-control-allow-credentials': [{
    key: 'Access-Control-Allow-Credentials',
    value: 'true'
  }],
  'cross-origin-resource-policy': [{
    key: 'Cross-Origin-Resource-Policy',
    value: 'cross-origin'
  }]
};

export const handler = async (event) => {
  const request = event.Records[0].cf.request;
  console.log('Request:', JSON.stringify(request));

  // Skip auth check for assets
  if (request.uri.startsWith('/assets/')) {
    console.log('Asset request, bypassing auth check');
    return request;
  }

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return {
      status: '204',
      statusDescription: 'No Content',
      headers: corsHeaders
    };
  }
  
  // Check for auth code in query string
  const queryString = request.querystring || '';
  const hasAuthCode = queryString.includes('code=');

  if (hasAuthCode) {
    console.log('Auth code present, allowing request');
    return request;
  }

  // Check for auth cookie
  const cookies = request.headers.cookie || [];
  const authCookie = cookies.find(cookie => cookie.value.includes('CognitoToken='));
  
  if (!authCookie) {
    console.log('No auth cookie found, redirecting to Cognito');
    const cognitoDomain = 'us-east-10ouompryv.auth.us-east-1.amazoncognito.com';
    const loginUrl = `https://${cognitoDomain}/oauth2/authorize?` +
      `client_id=53dbt4feojdrr5i9gpeameio62&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('email openid')}&` +
      `redirect_uri=${encodeURIComponent('https://d10iucnlpv2uup.cloudfront.net/')}&` +
      `state=${encodeURIComponent(Date.now().toString())}&` +
      `identity_provider=COGNITO`;

    console.log('Generated login URL:', loginUrl);
    
    return {
      status: '302',
      statusDescription: 'Found',
      headers: {
        ...corsHeaders,
        'location': [{
          key: 'Location',
          value: loginUrl
        }],
        'vary': [{
          key: 'Vary',
          value: 'Origin'
        }]
      }
    };
  }

  console.log('Auth cookie found, allowing request');
  return request;
};