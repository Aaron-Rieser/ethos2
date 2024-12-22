document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        neighbourhood: document.getElementById('neighbourhood').value,
        username: document.getElementById('username').value,
        post: document.getElementById('post').value,
        latitude: null,
        longitude: null
    };

    // Try to get location - either from stored permission or new request
    try {
        if (navigator.geolocation) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            formData.latitude = position.coords.latitude;
            formData.longitude = position.coords.longitude;
            // Store permission for future use
            localStorage.setItem('locationPermissionGranted', 'true');
        }
    } catch (error) {
        console.log('Location not available or denied, continuing without coordinates');
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