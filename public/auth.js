let auth0Client;

const initializeAuth0 = async () => {
    if (auth0Client) return auth0Client;
    
    try {
        console.log('Initializing Auth0...');
        auth0Client = await auth0.createAuth0Client({
            domain: 'dev-g0wpwzacl04kb6eb.ca.auth0.com',
            clientId: '8sx5KNflhuxg6zCpE0yQK3hutmjLLQ16',
            cacheLocation: 'localstorage',
            useRefreshTokens: true,  // Make sure this is true
            authorizationParams: {
                audience: 'https://dev-g0wpwzacl04kb6eb.ca.auth0.com/api/v2/',
                redirect_uri: window.location.origin,
                scope: 'openid profile email offline_access',
                response_type: 'code',
                prompt: 'consent'  // Add this to ensure refresh token
            }
        });
        
        await updateUI();
        return auth0Client;
    } catch (error) {
        console.error('Auth0 initialization error:', error);
        throw error;
    }
};

const handleAuth0Callback = async () => {
    try {
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            await auth0Client.handleRedirectCallback();
            
            // Force UI update after callback
            const isAuthenticated = await auth0Client.isAuthenticated();
            if (isAuthenticated) {
                const user = await auth0Client.getUser();
                console.log('User authenticated:', user);
                
                // Explicitly update UI elements
                const loginButton = document.getElementById('login');
                const logoutButton = document.getElementById('logout');
                const userCircle = document.getElementById('userInitial');
                
                if (loginButton) loginButton.style.display = 'none';
                if (logoutButton) logoutButton.style.display = 'block';
                if (userCircle) {
                    userCircle.textContent = user.email.charAt(0).toUpperCase();
                    userCircle.style.display = 'flex';
                    userCircle.title = user.email;
                }
            }
            
            window.history.replaceState({}, document.title, window.location.pathname);
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
        console.log('Auth status:', isAuthenticated);
        
        const loginButton = document.getElementById('login');
        const userProfile = document.getElementById('userProfile');
        const userCircle = document.getElementById('userInitial');
        
        // Check each element individually before using it
        if (loginButton) {
            loginButton.style.display = isAuthenticated ? 'none' : 'block';
        }
        
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            console.log('User session:', user);
            
            if (userProfile) {
                userProfile.textContent = user.email;
            }
            if (userCircle) {
                const initial = user.email.charAt(0).toUpperCase();
                userCircle.textContent = initial;
                userCircle.style.display = 'flex';
                userCircle.title = user.email;  // Keep this for tooltip functionality
            }
        } else {
            if (userProfile) userProfile.textContent = '';
            if (userCircle) userCircle.style.display = 'none';
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
                redirect_uri: window.location.origin,  // Change from window.location.href
                prompt: 'consent'  // Add this to ensure refresh token
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
        
        // Add these new checks
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (isAuthenticated) {
            const user = await auth0Client.getUser();
            const userCircle = document.getElementById('userInitial');
            const loginButton = document.getElementById('login');
            const logoutButton = document.getElementById('logout');
            
            if (userCircle) {
                userCircle.textContent = user.email.charAt(0).toUpperCase();
                userCircle.style.display = 'flex';
                userCircle.title = user.email;
            }
            if (loginButton) loginButton.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'block';
        }
        
        console.log('Auth status on page load:', isAuthenticated);
        await handleAuth0Callback();
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