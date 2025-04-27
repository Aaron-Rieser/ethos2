document.getElementById('dealForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const errorMessage = document.getElementById('dealErrorMessage');
    const submitButton = e.target.querySelector('button[type="submit"]');
    const loadingIndicator = document.getElementById('dealLoadingIndicator');

    const title = document.getElementById('dealTitle').value;
    if (!title) {
        errorMessage.textContent = 'Please enter a title';
        errorMessage.style.display = 'block';
        return;
    }
    
    try {
        // Check auth0 initialization and authentication
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
        
        // Add email to formData
        formData.append('email', user.email);

        // Debug logging
        console.log('Deal submission data:', {
            neighbourhood: formData.get('neighbourhood'),
            title: formData.get('title'),  // Add title to debug logging
            price: formData.get('price'),
            post: formData.get('post'),
            email: formData.get('email'),
            image: formData.get('image')
        });

        // Disable submit button and show loading
        submitButton.disabled = true;
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        
        const response = await fetch('/api/deals', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        // Log response details for debugging
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Server response:', errorData);
            throw new Error(errorData || 'Failed to submit deal');
        }

        // Redirect on success
        window.location.href = `index.html?neighbourhood=${encodeURIComponent(formData.get('neighbourhood'))}`;
    } catch (error) {
        console.error('Deal submission error:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        if (submitButton) submitButton.disabled = false;
        loadingIndicator.style.display = 'none';
    }
});