// Logo Dropdown Behavior
document.addEventListener('DOMContentLoaded', function() {
    const logoDropdowns = document.querySelectorAll('.logo-dropdown');
    
    logoDropdowns.forEach(dropdown => {
        const logo = dropdown.querySelector('.site-title');
        const dropdownContent = dropdown.querySelector('.logo-dropdown-content');
        let isOpen = false;
        let isMobile = window.innerWidth <= 768;
        
        // Check if mobile on resize
        window.addEventListener('resize', () => {
            isMobile = window.innerWidth <= 768;
        });
        
        if (isMobile) {
            // Mobile behavior: click to toggle
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isOpen = !isOpen;
                dropdownContent.style.display = isOpen ? 'block' : 'none';
            });
            
            // Close on click outside
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    isOpen = false;
                    dropdownContent.style.display = 'none';
                }
            });
            
            // Close on navigation
            dropdownContent.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') {
                    isOpen = false;
                    dropdownContent.style.display = 'none';
                }
            });
        } else {
            // Desktop behavior: hover
            let hoverTimeout;
            
            dropdown.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                dropdownContent.style.display = 'block';
            });
            
            dropdown.addEventListener('mouseleave', () => {
                hoverTimeout = setTimeout(() => {
                    dropdownContent.style.display = 'none';
                }, 150); // Small delay to prevent flickering
            });
            
            // Keep open when hovering over dropdown content
            dropdownContent.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
            });
            
            dropdownContent.addEventListener('mouseleave', () => {
                hoverTimeout = setTimeout(() => {
                    dropdownContent.style.display = 'none';
                }, 150);
            });
        }
    });

    // User Dropdown Behavior - Only add if not already handled by auth.js
    const userDropdowns = document.querySelectorAll('.user-dropdown');
    
    userDropdowns.forEach(dropdown => {
        const userCircle = dropdown.querySelector('.user-circle');
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        
        if (userCircle && dropdownContent) {
            // Check if auth.js has already set up the event listener
            const hasAuthHandler = userCircle.onclick !== null || 
                                 userCircle._authHandlerAttached === true;
            
            if (!hasAuthHandler) {
                // Toggle dropdown when clicking user circle
                userCircle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdownContent.classList.toggle('show');
                });

                // Close dropdown when clicking anywhere else
                document.addEventListener('click', (e) => {
                    if (!dropdown.contains(e.target)) {
                        dropdownContent.classList.remove('show');
                    }
                });
            }
        }
    });
});
