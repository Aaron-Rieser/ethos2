cument.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Get form data
    const formData = {
        neighbourhood: document.getElementById('neighbourhood').value,
        username: document.getElementById('username').value,
        post: document.getElementById('post').value,
        latitude: null,  // Will be updated if geolocation available
        longitude: null
    };

    // Try to get geolocation
    try {
        if (navigator.geolocation) {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            
            formData.latitude = position.coords.latitude;
            formData.longitude = position.coords.longitude;
        }
    } catch (error) {
        console.log('Geolocation not available or denied');
    }

    // Submit the post
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