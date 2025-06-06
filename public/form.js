document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    const title = document.getElementById('title').value;
    if (!title) {
        errorMessage.textContent = 'Please enter a title';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Check authentication
    if (!auth0Client) {
        try {
            await initializeAuth0();
        } catch (error) {
            console.error('Error initializing Auth0:', error);
            errorMessage.textContent = 'Authentication service not available';
            errorMessage.style.display = 'block';
            return;
        }
    }
    
    // Check authentication
    let isAuthenticated = false;
    try {
        isAuthenticated = await auth0Client.isAuthenticated();
    } catch (error) {
        console.error('Error checking authentication:', error);
        errorMessage.textContent = 'Error checking authentication status';
        errorMessage.style.display = 'block';
        return;
    }

    if (!isAuthenticated) {
        errorMessage.textContent = 'Please login to post';
        errorMessage.style.display = 'block';
        return;
    }
    
    // Get user info and token
    try {
        const user = await auth0Client.getUser();
        const token = await auth0Client.getTokenSilently();
        console.log('User info:', user);

        if (!user.email) {
            errorMessage.textContent = 'User email not available';
            errorMessage.style.display = 'block';
            return;
        }

        // Reset error message and show loading state
        errorMessage.style.display = 'none';
        submitButton.disabled = true;
        loadingIndicator.style.display = 'block';
        
        // Create FormData
        const formData = new FormData();
        formData.append('user_id', user.sub);
        formData.append('email', user.email);
        formData.append('title', document.getElementById('title').value); // Add this line
        formData.append('post', document.getElementById('post').value);

        let lat = null;
        let lng = null;

        // Get location if available
        try {
            if (navigator.geolocation) {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                lat = position.coords.latitude;
                lng = position.coords.longitude;
                localStorage.setItem('locationPermissionGranted', 'true');
            }
        } catch (error) {
            console.log('Location not available or denied, continuing without coordinates');
        }

        // Only append coordinates if they exist
        if (lat !== null && lng !== null) {
            formData.append('latitude', lat.toString());
            formData.append('longitude', lng.toString());
        }
        
        // Handle image
        const imageInput = document.getElementById('image');
        const imageFile = imageInput.files[0];
        if (imageFile) {
            if (imageFile.size > 5 * 1024 * 1024) {
                throw new Error('File size exceeds 5MB limit');
            }
            formData.append('image', imageFile);
        }

        // Submit post
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.details || data.error || 'Error submitting post');
        }

        window.location.href = 'feed.html';

    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingIndicator.style.display = 'none';
        submitButton.disabled = false;
    }
});