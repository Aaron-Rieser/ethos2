document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Create basic form data
    const formData = {
        neighbourhood: document.getElementById('neighbourhood').value,
        username: document.getElementById('username').value,
        post: document.getElementById('post').value,
        latitude: null,  // Default to null
        longitude: null
    };

    // Try to get location if available
    try {
        if (navigator.geolocation) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000 // 5 second timeout
                });
            });
            
            formData.latitude = position.coords.latitude;
            formData.longitude = position.coords.longitude;
        }
    } catch (error) {
        console.log('Location not available or denied, continuing without coordinates');
        // Post will continue with null coordinates
    }

    // Submit post regardless of whether we got coordinates
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            window.location.href = `index.html?neighbourhood=${encodeURIComponent(formData.neighbourhood)}`;
        } else {
            alert('Error submitting post');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting post');
    }
});