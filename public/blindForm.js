document.getElementById('blindForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const errorMessage = document.getElementById('blindErrorMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const loadingIndicator = document.getElementById('blindLoadingIndicator');

    try {
        if (!auth0Client) {
            throw new Error('Authentication not initialized');
        }

        const isAuthenticated = await auth0Client.isAuthenticated();
        if (!isAuthenticated) {
            throw new Error('User not authenticated');
        }

        const token = await auth0Client.getTokenSilently();
        const user = await auth0Client.getUser();
        const formData = new FormData(this);
        
        formData.append('email', user.email);

        const lat = localStorage.getItem('selectedLat');
        const lng = localStorage.getItem('selectedLng');
        if (lat && lng) {
            formData.append('latitude', lat);
            formData.append('longitude', lng);
        }

        submitButton.disabled = true;
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        
        const response = await fetch('/api/posts', {  // Changed from '/api/blind'
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || 'Failed to submit blind');
        }
        window.location.href = 'feed.html';

    } catch (error) {
        console.error('Blind submission error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        if (submitButton) submitButton.disabled = false;
        loadingIndicator.style.display = 'none';
    }
});