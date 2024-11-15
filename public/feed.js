document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        const container = document.getElementById('posts-container');
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post-card';
            postElement.innerHTML = `
                <div class="username">${post.username}</div>
                <div class="neighbourhood">${post.neighbourhood}</div>
                <p>${post.post}</p>
            `;
            container.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        document.getElementById('posts-container').innerHTML = 
            '<p>Error loading posts. Please try again later.</p>';
    }
});