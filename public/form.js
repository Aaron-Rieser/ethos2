// Image compression function
function compressImage(file) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img;
            const maxSize = 1920; // Max dimension
            
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to blob with quality compression
            canvas.toBlob((blob) => {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            }, 'image/jpeg', 0.8); // 80% quality
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Handle image upload with compression
async function handleImageUpload(file) {
    if (file.size > 5 * 1024 * 1024) { // 5MB
        try {
            console.log('Compressing image...');
            const compressedFile = await compressImage(file);
            console.log(`Compressed: ${file.size} → ${compressedFile.size} bytes`);
            return compressedFile;
        } catch (error) {
            console.error('Compression failed:', error);
            return file; // Fallback to original
        }
    }
    return file;
}

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
    
    // Proactive token validation before form submission
    try {
        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
            errorMessage.textContent = 'Please login to post';
            errorMessage.style.display = 'block';
            return;
        }

        // Force fresh token validation with maximum longevity
        await auth0Client.getTokenSilently({
            timeoutInSeconds: 86400, // 24 hours for maximum longevity
            cacheMode: 'on' // Use cache for better performance
        });
        console.log('Token validation successful for form submission');
    } catch (tokenError) {
        console.error('Token validation failed during form submission:', tokenError);
        errorMessage.textContent = 'Your session has expired. Please log in again to create a post.';
        errorMessage.style.display = 'block';
        
        // Update UI to show logged out state
        const userCircle = document.getElementById('userInitial');
        const loginButton = document.getElementById('login');
        const logoutButton = document.getElementById('logout');
        
        if (userCircle) userCircle.style.display = 'none';
        if (loginButton) loginButton.style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'none';
        
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
        formData.append('title', document.getElementById('title').value);
        formData.append('post', document.getElementById('post').value);

        let lat = null;
        let lng = null;

        // Check for manually selected location first
        const selectedLat = localStorage.getItem('selectedLat');
        const selectedLng = localStorage.getItem('selectedLng');
        
        if (selectedLat && selectedLng) {
            lat = parseFloat(selectedLat);
            lng = parseFloat(selectedLng);
            console.log('Using manually selected location:', lat, lng);
        } else {
            // Fall back to geolocation if no manual selection
            try {
                if (navigator.geolocation) {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject);
                    });
                    lat = position.coords.latitude;
                    lng = position.coords.longitude;
                    localStorage.setItem('locationPermissionGranted', 'true');
                    console.log('Using geolocation:', lat, lng);
                }
            } catch (error) {
                console.log('Location not available or denied, continuing without coordinates');
            }
        }

        // Only append coordinates if they exist
        if (lat !== null && lng !== null) {
            formData.append('latitude', lat.toString());
            formData.append('longitude', lng.toString());
        }
        
        // Handle image with compression
        const imageInput = document.getElementById('image');
        const imageFile = imageInput.files[0];
        if (imageFile) {
            if (imageFile.size > 5 * 1024 * 1024) {
                // Show compression message
                loadingIndicator.textContent = 'Compressing image...';
            }
            
            const processedFile = await handleImageUpload(imageFile);
            formData.append('image', processedFile);
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

        // Clear selected location after successful post
        localStorage.removeItem('selectedLat');
        localStorage.removeItem('selectedLng');
        
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