// Immediately invoke the function when the script loads
(function() {
    // Set up logging
    const log = {
        info: (title, ...args) => {
            console.log(`%c[INFO] ${title}`, 'color: blue; font-weight: bold', ...args);
        },
        error: (title, ...args) => {
            console.error(`%c[ERROR] ${title}`, 'color: red; font-weight: bold', ...args);
        },
        warn: (title, ...args) => {
            console.warn(`%c[WARN] ${title}`, 'color: orange; font-weight: bold', ...args);
        }
    };

    try {
        const clientId = '9ihaiqmpt1f94sci2553h6cfn';
        const isLocal = window.location.hostname === 'localhost';
        const redirectUri = encodeURIComponent('https://d10iucnlpv2uup.cloudfront.net');
        
        // Log initial state
        log.info('Initial State', {
            currentUrl: window.location.href,
            isLocal,
            hostname: window.location.hostname,
            redirectUri: decodeURIComponent(redirectUri),
            pathname: window.location.pathname,
            search: window.location.search
        });
        
        const urlParams = new URLSearchParams(window.location.search);
        log.info('URL Parameters', Object.fromEntries(urlParams.entries()));
        
        // Handle callback
        if (urlParams.has('error')) {
            log.error('Auth Error Details', {
                error: urlParams.get('error'),
                description: urlParams.get('error_description'),
                state: urlParams.get('state')
            });
            document.body.innerHTML = `
                <h1>Authentication Error</h1>
                <p>Error: ${urlParams.get('error')}</p>
                <p>Description: ${urlParams.get('error_description')}</p>
                <button onclick="window.location.href='/'">Try Again</button>
            `;
            return;
        }
        
        if (urlParams.has('code')) {
            log.info('Auth Code Received');
            const code = urlParams.get('code');
            if (isLocal) {
                log.info('Storing token in localStorage');
                localStorage.setItem('CognitoToken', code);
            } else {
                log.info('Storing token in cookie');
                document.cookie = `CognitoToken=${code}; path=/; secure; samesite=lax`;
            }
            window.location.href = '/';
            return;
        }

        // Check if already authenticated
        const isAuthenticated = isLocal 
            ? localStorage.getItem('CognitoToken')
            : document.cookie.includes('CognitoToken=');

        log.info('Authentication Check', { isAuthenticated });

        if (isAuthenticated) {
            log.info('Already authenticated, no redirect needed');
            return;
        }

        // Build the authorization URL
        const loginUrl = `https://us-east-1vtsic3zeh.auth.us-east-1.amazoncognito.com/oauth2/authorize?` +
            `client_id=9ihaiqmpt1f94sci2553h6cfn&` +
            `response_type=code&` +
            `scope=${encodeURIComponent('email openid phone')}&` +
            // `redirect_uri=${encodeURIComponent('https://d10iucnlpv2uup.cloudfront.net/')}&` +
            `redirect_uri=${encodeURIComponent('http://localhost:5173/')}&` +
            `state=${encodeURIComponent(Date.now().toString())}&` +
            `identity_provider=COGNITO`;

        log.info('Login Redirect', { loginUrl });

        // Create and click a link with crossorigin attribute
        const link = document.createElement('a');
        link.href = loginUrl;
        link.crossOrigin = 'use-credentials';  // or 'anonymous' depending on your needs
        link.click();

    } catch (error) {
        log.error('Fatal Error', {
            message: error.message,
            stack: error.stack,
            error
        });
        document.body.innerHTML = `
            <h1>Fatal Error</h1>
            <p>${error.message}</p>
            <pre>${error.stack}</pre>
            <button onclick="window.location.href='/'">Try Again</button>
        `;
    }
})();