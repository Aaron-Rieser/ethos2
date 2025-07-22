let auth0Client;

const initializeAuth0 = async () => {
    if (auth0Client) return auth0Client;
    
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
                scope: 'openid profile email offline_access',  // Added offline_access
                response_type: 'token id_token',  // Changed from 'code'
                prompt: 'consent'
            },
            // Maximum token longevity settings
            sessionCheckExpiryDays: 30, // Check session for 30 days
            cacheLocation: 'localstorage', // Persistent storage
            useRefreshTokens: true, // Enable refresh tokens for longer sessions
            useRefreshTokensFallback: true // Fallback to refresh tokens
        });
        
        // Check if we need to handle a callback
        if (window.location.search.includes('code=') && 
            window.location.search.includes('state=')) {
            // Handle the redirect and retrieve tokens
            await auth0Client.handleRedirectCallback();
            window.history.replaceState({}, document.title, window.location.origin);
        }
        
        await updateUI();
        return auth0Client;
    } catch (error) {
        console.error('Auth0 initialization error:', error);
        console.error('Detailed Auth0 callback error:', error);  // Enhanced error logging
        throw error;
    }
};

async function validateAndRefreshToken() {
    try {
        if (!auth0Client) {
            await initializeAuth0();
        }

        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
            return false;
        }

        // Single token refresh attempt with maximum longevity
        try {
            await auth0Client.getTokenSilently({
                timeoutInSeconds: 86400, // 24 hours for maximum longevity
                cacheMode: 'on',  // Use cache by default
                authorizationParams: {
                    audience: 'https://dev-g0wpwzacl04kb6eb.ca.auth0.com/api/v2/',
                    scope: 'openid profile email offline_access'
                }
            });
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

const handleAuth0Callback = async () => {
    try {
        console.log('Checking for callback...');
        const query = window.location.search;
        if (query.includes("code=") && query.includes("state=")) {
            console.log('Processing callback...');
            await auth0Client.handleRedirectCallback();
            
            const isAuthenticated = await auth0Client.isAuthenticated();
            if (isAuthenticated) {
                const user = await auth0Client.getUser();
                console.log('User authenticated:', user);
                console.log('Auth0 user object:', user);  // Keep debug line
                console.log('Auth0 email:', user.email);  // Keep debug line
                
                // Create/update account in database
                try {
                    const token = await auth0Client.getTokenSilently();
                    await fetch('/api/account', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    console.error('Error creating/updating account:', error);
                }
                
                // Keep explicit UI element updates
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
            
            // Clear the URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    } catch (err) {
        console.error('Callback error details:', {
            message: err.message,
            error: err,
            stack: err.stack
        });
    }
};

const getAuthToken = async () => {
    try {
        if (!auth0Client) {
            throw new Error('Auth0 client not initialized');
        }
        
        if (await auth0Client.isAuthenticated()) {
            // Try to validate and refresh token first
            const isValid = await validateAndRefreshToken();
            if (!isValid) {
                throw new Error('Token refresh failed');
            }
            
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
        } else {
            console.error('Error getting auth token:', err);
        }
        return null;
    }
};

async function checkUnreadMessages() {
    try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
            return;
        }

        const token = await auth0Client.getTokenSilently({
            cacheMode: 'on'
        });

        const response = await fetch('/api/messages/unread/count', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch unread count');
        }

        const { count } = await response.json();
        
        const userCircle = document.getElementById('userInitial');
        if (!userCircle) return;

        let badge = userCircle.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            userCircle.appendChild(badge);
        }
        
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error checking unread messages:', error);
        if (error.error === 'login_required') {
            clearInterval(messageCheckInterval);
            messageCheckInterval = null;
        }
    }
}

function clearMessageCheck() {
    if (messageCheckInterval) {
        clearInterval(messageCheckInterval);
        messageCheckInterval = null;
    }
}

const updateUI = async () => {
    try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        console.log('Auth status:', isAuthenticated);
        
        const loginButton = document.getElementById('login');
        const userProfile = document.getElementById('userProfile');
        const userCircle = document.getElementById('userInitial');
        const userEmailDisplay = document.querySelector('.dropdown-content .user-email');
        
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
                const initial = user.email[0].toUpperCase();
                userCircle.textContent = initial;
                userCircle.style.display = 'flex';
                userCircle.title = user.email;
            }
            if (userEmailDisplay) {
                const truncatedEmail = user.email.split('@')[0];
                userEmailDisplay.textContent = truncatedEmail;
            }

            await checkUnreadMessages();
        } else {
            if (userProfile) userProfile.textContent = '';
            if (userCircle) userCircle.style.display = 'none';
            if (userEmailDisplay) userEmailDisplay.textContent = '';
        }
    } catch (err) {
        console.error('Error updating UI:', err);
    }
};

const login = async () => {
    try {
        if (!auth0Client) {
            console.log('Auth0 not initialized, initializing now...');
            await initializeAuth0();
        }
        
        console.log('Login attempt started');
        await auth0Client.loginWithRedirect({
            authorizationParams: {
                redirect_uri: window.location.origin,
                scope: 'openid profile email offline_access',
                audience: 'https://dev-g0wpwzacl04kb6eb.ca.auth0.com/api/v2/',
                response_type: 'token id_token',
                prompt: 'login'
            },
            // Request maximum token longevity
            maxAge: 86400 * 30, // 30 days in seconds
            prompt: 'login'
        });
        console.log('Login redirect initiated');
    } catch (err) {
        console.error('Login error:', {
            message: err.message,
            error: err,
            stack: err.stack,
            description: err.error_description
        });
        alert('Login failed. Please try again.');
    }
};

const logout = async () => {
    try {
        if (!auth0Client) {
            throw new Error('Auth0 client not initialized');
        }
        clearMessageCheck();
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
            try {
                        // Token validation with maximum longevity
        await auth0Client.getTokenSilently({
            timeoutInSeconds: 86400, // 24 hours for maximum longevity
            cacheMode: 'on',  // Use cache by default
            authorizationParams: {
                audience: 'https://dev-g0wpwzacl04kb6eb.ca.auth0.com/api/v2/',
                scope: 'openid profile email offline_access'
            }
        });
                
                // Start message check interval only if not already running
                if (!messageCheckInterval) {
                    await checkUnreadMessages(); // Check immediately
                    messageCheckInterval = setInterval(checkUnreadMessages, 30000);
                }

                // Get user info and update UI elements
                const user = await auth0Client.getUser();
                const userCircle = document.getElementById('userInitial');
                const loginButton = document.getElementById('login');
                const logoutButton = document.getElementById('logout');
                const userEmailDisplay = document.querySelector('.dropdown-content .user-email');
                
                if (userCircle) {
                    userCircle.textContent = user.email.charAt(0).toUpperCase();
                    userCircle.style.display = 'flex';
                    userCircle.title = user.email;
                }
                if (loginButton) loginButton.style.display = 'none';
                if (logoutButton) logoutButton.style.display = 'block';
                if (userEmailDisplay) {
                    const truncatedEmail = user.email.split('@')[0];
                    userEmailDisplay.textContent = truncatedEmail;
                }

                // Check messages immediately
                await checkUnreadMessages();
                
            } catch (error) {
                console.error('Token refresh failed:', error);
                // Don't clear interval here - let checkUnreadMessages handle that
            }
        } else {
            // Clear interval if user is not authenticated
            if (messageCheckInterval) {
                clearInterval(messageCheckInterval);
                messageCheckInterval = null;
            }
        }
        
        await handleAuth0Callback();
        
    } catch (error) {
        console.error('Error during page load:', {
            message: error.message,
            error: error,
            stack: error.stack
        });
        // Clear interval on error
        if (messageCheckInterval) {
            clearInterval(messageCheckInterval);
            messageCheckInterval = null;
        }
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
                    // Use the new popup system if available, otherwise fall back to inline
                    if (typeof window.showLoginPopup === 'function') {
                        window.showLoginPopup('create a post');
                    } else {
                        const loginPrompt = document.getElementById('loginPrompt');
                        if (loginPrompt) {
                            loginPrompt.style.display = 'block';
                            setTimeout(() => {
                                loginPrompt.style.display = 'none';
                            }, 3000);
                        }
                    }
                }
            });
        }

        const userInitial = document.getElementById('userInitial');
        if (userInitial) {
            userInitial.addEventListener('click', (e) => {
                console.log('userInitial clicked');
                e.stopPropagation();
                const dropdown = document.querySelector('.dropdown-content');
                console.log('Found dropdown:', dropdown);
                
                // More explicit class handling
                if (dropdown) {
                    const isCurrentlyShown = dropdown.classList.contains('show');
                    console.log('Currently shown:', isCurrentlyShown);
                    
                    if (isCurrentlyShown) {
                        dropdown.style.display = 'none';
                        dropdown.classList.remove('show');
                    } else {
                        dropdown.style.display = 'block';
                        dropdown.classList.add('show');
                    }
                    
                    console.log('New display style:', dropdown.style.display);
                    console.log('New classes:', dropdown.classList);
                }
            });
        
            // Close dropdown when clicking anywhere else
            window.addEventListener('click', () => {
                const dropdown = document.querySelector('.dropdown-content');
                if (dropdown) {
                    dropdown.style.display = 'none';
                    dropdown.classList.remove('show');
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

let messageCheckInterval;

window.addEventListener('unload', () => {
    if (messageCheckInterval) {
        clearInterval(messageCheckInterval);
    }
});