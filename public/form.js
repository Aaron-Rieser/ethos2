document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Use FormData instead of plain object for file upload
    const formData = new FormData();
    formData.append('neighbourhood', document.getElementById('neighbourhood').value);
    formData.append('username', document.getElementById('username').value);
    formData.append('post', document.getElementById('post').value);
    formData.append('latitude', null);
    formData.append('longitude', null);

    // Handle image if present
    const imageFile = document.getElementById('image').files[0];
    if (imageFile) {
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
            // Remove Content-Type header - FormData sets its own
            body: formData
        });

        if (response.ok) {
            window.location.href = `index.html?neighbourhood=${encodeURIComponent(formData.get('neighbourhood'))}`;
        } else {
            alert('Error submitting post');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting post');
    }
});