let auth0Client;

const handleAuth0Callback = async () => {
    try {
        // Handle the redirect from Auth0
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            // Update UI after successful login
            await updateUI();
            // Remove the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (err) {
        console.error('Error handling Auth0 callback:', err);
    }
};

const configureAuth = async () => {
    try {
        console.log('Initializing Auth0...');
        auth0Client = await auth0.createAuth0Client({
            domain: 'dev-g0wpwzacl04kb6eb.ca.auth0.com',
            clientId: '8sx5KNflhuxg6zCpE0yQK3hutmjLLQ16',
            audience: 'https://dev-g0wpwzacl04kb6eb.ca.auth0.com/api/v2/',
            cacheLocation: 'localstorage',
            useRefreshTokens: true,
            redirectUri: window.location.origin, // Simplified redirect
            responseType: 'code',
            scope: 'openid profile email offline_access'
        });

        console.log('Auth0 configuration complete');

        if (window.location.search.includes("code=")) {
            try {
                await auth0Client.handleRedirectCallback();
                window.history.replaceState({}, document.title, window.location.pathname);
                await updateUI();
            } catch (callbackError) {
                console.error('Callback handling error:', callbackError);
            }
        }

        console.log('Auth0 initialized successfully');
    } catch (error) {
        console.error('Auth0 initialization error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code
        });
    }
};

const getAuthToken = async () => {
    try {
        if (await auth0Client.isAuthenticated()) {
            const token = await auth0Client.getTokenSilently({
                timeoutInSeconds: 60,
                cacheMode: 'on'
            });
            return token;
        }
        return null;
    } catch (err) {
        if (err.error === 'login_required') {
            console.log('Session expired, redirecting to login...');
            await login();
        }
        console.error('Error getting auth token:', err);
        return null;
    }
};

const updateUI = async () => {
    try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        
        const loginButton = document.getElementById('login');
        const logoutButton = document.getElementById('logout');
        const userProfile = document.getElementById('userProfile');
        
        if (!loginButton || !logoutButton || !userProfile) {
            console.warn('Auth UI elements not found');
            return;
        }
        
        loginButton.style.display = isAuthenticated ? 'none' : 'block';
        logoutButton.style.display = isAuthenticated ? 'block' : 'none';
        
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            userProfile.textContent = user.email;
        }
    } catch (err) {
        console.error('Error updating UI:', err);
    }
};

const login = async () => {
    try {
        console.log('Login attempt started');
        await auth0Client.loginWithRedirect({
            redirect_uri: window.location.origin
        });
        console.log('Login redirect initiated');
    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
    }
};

const logout = async () => {
    try {
        await auth0Client.logout({
            returnTo: window.location.origin
        });
    } catch (err) {
        console.error('Logout error:', err);
        // Optionally show error to user
        alert('Logout failed. Please try again.');
    }
};

configureAuth();

window.addEventListener('load', () => {
    console.log('Page loaded, checking Auth0 status');
    if (!auth0Client) {
        console.error('Auth0 client not initialized');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Create post link handler
    const createPostLink = document.querySelector('.create-post-link, #createPostLink'); // Look for either class or ID
    if (createPostLink) {
        createPostLink.addEventListener('click', async (e) => {
            if (!await auth0Client.isAuthenticated()) {
                e.preventDefault();
                const loginPrompt = document.getElementById('loginPrompt');
                if (loginPrompt) {
                    loginPrompt.style.display = 'block';
                    setTimeout(() => {
                        loginPrompt.style.display = 'none';
                    }, 3000);
                }
            }
        });
    }
});