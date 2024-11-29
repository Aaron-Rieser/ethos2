let allPosts = []; // Store all posts globally

document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Fetching posts...');
        const response = await fetch('/api/posts');
        allPosts = await response.json();
        console.log('Posts received:', allPosts);
        
        displayPosts(allPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        document.getElementById('posts-container').innerHTML = 
            '<p>Error loading posts. Please try again later.</p>';
    }
});

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    container.innerHTML = ''; // Clear existing posts
    
    if (posts.length === 0) {
        container.innerHTML = '<p>No posts yet!</p>';
        return;
    }
    
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="username">${post.username}</div>
            <div class="neighbourhood" onclick="filterByNeighbourhood('${post.neighbourhood}')">${post.neighbourhood}</div>
            <p>${post.post}</p>
        `;
        container.appendChild(postElement);
    });
}

function filterByNeighbourhood(neighbourhood) {
    const filteredPosts = allPosts.filter(post => post.neighbourhood === neighbourhood);
    displayPosts(filteredPosts);
    
    // Show filter info
    const filterInfo = document.getElementById('filter-info');
    const currentFilter = document.getElementById('current-filter');
    filterInfo.style.display = 'block';
    currentFilter.textContent = neighbourhood;
}

function showAllPosts() {
    displayPosts(allPosts);
    // Hide filter info
    document.getElementById('filter-info').style.display = 'none';
}