document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorMessage = document.getElementById('errorMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
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
        
        // Get form values first
        const post_type = document.getElementById('post_type').value;
        const neighbourhood = document.getElementById('neighbourhood').value;
        const post = document.getElementById('post').value;
        
        // Validate required fields
        if (!post_type || !neighbourhood || !post) {
            console.error('Missing required fields:', { post_type, neighbourhood, post });
            throw new Error('Please fill in all required fields');
        }

        // Create FormData and append basic fields
        const formData = new FormData();
        formData.append('post_type', post_type);
        formData.append('neighbourhood', neighbourhood);
        formData.append('post', post);
        formData.append('email', user.email);
        formData.append('user_id', user.sub);

        // Handle coordinates if available
        let lat = null;
        let lng = null;
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

        if (lat !== null && lng !== null) {
            formData.append('latitude', lat.toString());
            formData.append('longitude', lng.toString());
        }

        // Handle price for deals
        if (post_type === 'deal') {
            const price = document.getElementById('price').value;
            if (!price && price !== '0') {
                throw new Error('Price is required for deals');
            }
            formData.append('price', price);
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

        // Debug log the FormData contents
        console.log('FormData contents:');
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        // Submit post
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.details || data.error || 'Error submitting post');
        }

        window.location.href = `index.html?neighbourhood=${encodeURIComponent(neighbourhood)}`;
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingIndicator.style.display = 'none';
        submitButton.disabled = false;
    }
});