// Redirect to Cognito Hosted UI
function redirectToCognitoLogin() {
    const clientId = '53dbt4feojdrr5i9gpeameio62'; // Client ID
    const redirectUri = encodeURIComponent('https://d3iuzxi84xd7xi.cloudfront.net'); // CloudFront URL
    const cognitoDomain = 'https://us-east-10ouompryv.auth.us-east-1.amazoncognito.com'; // Cognito domain
  
    console.log('Client ID:', clientId);
    console.log('Redirect URI:', redirectUri);
    console.log('Cognito Domain:', cognitoDomain);
  
    const loginUrl = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=email+openid&redirect_uri=${redirectUri}`;
    console.log('Login URL:', loginUrl);
  
    window.location.href = loginUrl;
}
  
// Call this function when you want to initiate login
redirectToCognitoLogin();