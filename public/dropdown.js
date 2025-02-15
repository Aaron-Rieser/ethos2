document.addEventListener('DOMContentLoaded', () => {
    // Wait a short moment to ensure Auth0 has initialized
    setTimeout(() => {
        const userInitial = document.getElementById('userInitial');
        const dropdownContent = document.querySelector('.dropdown-content');
        
        if (userInitial && dropdownContent) {
            // Toggle dropdown when clicking user circle
            userInitial.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('User circle clicked');
                dropdownContent.classList.toggle('show');
            });

            // Close dropdown when clicking anywhere else
            window.addEventListener('click', (e) => {
                if (!userInitial.contains(e.target) && dropdownContent.classList.contains('show')) {
                    dropdownContent.classList.remove('show');
                }
            });
        } else {
            console.log('Dropdown elements not found:', {
                userInitial: !!userInitial,
                dropdownContent: !!dropdownContent
            });
        }
    }, 1000); // Wait 1 second for Auth0 to initialize
});
