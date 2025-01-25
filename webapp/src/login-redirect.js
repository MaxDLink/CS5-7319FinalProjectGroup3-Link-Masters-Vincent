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
        const clientId = '53dbt4feojdrr5i9gpeameio62';
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
        const loginUrl = `https://us-east-10ouompryv.auth.us-east-1.amazoncognito.com/oauth2/authorize?` +
            `client_id=53dbt4feojdrr5i9gpeameio62&` +
            `response_type=code&` +
            `scope=email+openid&` +
            `redirect_uri=${redirectUri}`;

        log.info('Login Redirect', { loginUrl });

        // Immediate redirect
        window.location.href = loginUrl;

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