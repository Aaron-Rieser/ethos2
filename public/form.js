document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    
    // Reset error message
    errorMessage.style.display = 'none';
    
    // Show loading state
    submitButton.disabled = true;
    loadingIndicator.style.display = 'block';
    
    // Use FormData instead of plain object for file upload
    const formData = new FormData();
    formData.append('neighbourhood', document.getElementById('neighbourhood').value);
    formData.append('username', document.getElementById('username').value);
    formData.append('post', document.getElementById('post').value);
    formData.append('latitude', null);
    formData.append('longitude', null);

    // Handle image if present
    const imageInput = document.getElementById('image');
    const imageFile = imageInput.files[0];
    if (imageFile) {
        // Check file size before upload
        if (imageFile.size > 5 * 1024 * 1024) { // 5MB in bytes
            errorMessage.textContent = 'File size exceeds 5MB limit';
            errorMessage.style.display = 'block';
            loadingIndicator.style.display = 'none';
            submitButton.disabled = false;
            imageInput.value = ''; // Clear the file input
            return;
        }
        formData.append('image', imageFile);
    }

    // Try to get location
    try {
        if (navigator.geolocation) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            formData.set('latitude', position.coords.latitude);
            formData.set('longitude', position.coords.longitude);
            localStorage.setItem('locationPermissionGranted', 'true');
        }
    } catch (error) {
        console.log('Location not available or denied, continuing without coordinates');
    }

    // Submit post
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.details || data.error || 'Error submitting post');
        }

        window.location.href = `index.html?neighbourhood=${encodeURIComponent(formData.get('neighbourhood'))}`;
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        loadingIndicator.style.display = 'none';
        submitButton.disabled = false;
    }
});

// Add file size check on file input change
document.getElementById('image').addEventListener('change', function(e) {
    const errorMessage = document.getElementById('errorMessage');
    const file = this.files[0];
    
    if (file && file.size > 5 * 1024 * 1024) { // 5MB in bytes
        errorMessage.textContent = 'File size exceeds 5MB limit';
        errorMessage.style.display = 'block';
        this.value = ''; // Clear the file input
    } else {
        errorMessage.style.display = 'none';
    }
});