let auth0Client;

const initializeAuth0 = async () => {
    if (auth0Client) return auth0Client; // Return existing instance if available
    
    try {
        console.log('Initializing Auth0...');
        auth0Client = await auth0.createAuth0Client({
            domain: 'dev-g0wpwzacl04kb6eb.ca.auth0.com',
            clientId: '8sx5KNflhuxg6zCpE0yQK3hutmjLLQ16',
            cacheLocation: 'localstorage',
            useRefreshTokens: true,
            authorizationParams: {
                audience: 'https://dev-g0wpwzacl04kb6eb.ca.auth0.com/api/v2/',
                redirect_uri: window.location.origin,
                scope: 'openid profile email offline_access',
                response_type: 'code'
            }
        });
        
        await updateUI(); // Update UI immediately after initialization
        return auth0Client;
    } catch (error) {
        console.error('Auth0 initialization error:', error);
        throw error;
    }
};

const handleAuth0Callback = async () => {
    try {
        // Handle the redirect from Auth0
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            // Update UI after successful login
            await updateUI();
            // Remove the URL parameters and redirect to clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.reload(); // Add this to refresh the page after callback
        }
    } catch (err) {
        console.error('Error handling Auth0 callback:', err);
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
        console.log('Auth status:', isAuthenticated); // Add this debug log
        
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
            console.log('User session:', user); // Add this debug log
            userProfile.textContent = user.email;
        }
    } catch (err) {
        console.error('Error updating UI:', err);
    }
};

const login = async () => {
    try {
        if (!auth0Client) {
            throw new Error('Auth0 client not initialized');
        }
        console.log('Login attempt started');
        await auth0Client.loginWithRedirect({
            authorizationParams: {
                redirect_uri: window.location.href
            }
        });
        console.log('Login redirect initiated');
    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed. Please try again.');
    }
};

const logout = async () => {
    try {
        if (!auth0Client) {
            throw new Error('Auth0 client not initialized');
        }
        await auth0Client.logout({
            returnTo: window.location.href
        });
    } catch (err) {
        console.error('Logout error:', err);
        alert('Logout failed. Please try again.');
    }
};

window.addEventListener('load', async () => {
    console.log('Page loaded, initializing Auth0');
    try {
        await initializeAuth0();
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log('Auth status on page load:', isAuthenticated);
        
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            console.log('User session found:', user.email);
        }
        await updateUI();
        await handleAuth0Callback(); // Add this to handle any auth callbacks
    } catch (error) {
        console.error('Error during page load:', error);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Wait for Auth0 initialization first
        if (!auth0Client) {
            await initializeAuth0();
        }
        
        // Then set up event listeners
        const createPostLink = document.querySelector('.create-post-link, #createPostLink');
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

        // Add login/logout button handlers
        const loginButton = document.getElementById('login');
        if (loginButton) {
            loginButton.addEventListener('click', login);
            console.log('Login button handler added');
        }
        
        const logoutButton = document.getElementById('logout');
        if (logoutButton) {
            logoutButton.addEventListener('click', logout);
            console.log('Logout button handler added');
        }
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
    }
});