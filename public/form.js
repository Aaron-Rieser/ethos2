document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        neighbourhood: document.getElementById('neighbourhood').value,
        username: document.getElementById('username').value,
        post: document.getElementById('post').value
    };

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            // Redirect to feed page after successful submission
            // Use formData.neighbourhood instead of selectedNeighbourhood
            window.location.href = `index.html?neighbourhood=${encodeURIComponent(formData.neighbourhood)}`; 
        } else {
            alert('Error submitting post');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error submitting post');
    }
});