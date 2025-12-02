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

    // User Dropdown Behavior - Single source of truth for all pages
    // Use a unique handler that won't conflict with auth.js
    const userDropdowns = document.querySelectorAll('.user-dropdown');
    
    userDropdowns.forEach(dropdown => {
        const userCircle = dropdown.querySelector('.user-circle');
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        
        if (userCircle && dropdownContent) {
            // Use a flag to prevent duplicate handlers
            if (!userCircle._dropdownHandlerSetup) {
                userCircle._dropdownHandlerSetup = true;
                
                // Create handler function
                const toggleDropdown = (e) => {
                    e.stopPropagation();
                    
                    const isShown = dropdownContent.classList.contains('show') || 
                                   dropdownContent.style.display === 'block';
                    
                    if (isShown) {
                        dropdownContent.style.display = 'none';
                        dropdownContent.classList.remove('show');
                    } else {
                        dropdownContent.style.display = 'block';
                        dropdownContent.classList.add('show');
                    }
                };
                
                // Attach handler - this will work alongside any auth.js handler
                userCircle.addEventListener('click', toggleDropdown);
            }
        }
    });
    
    // Close dropdown when clicking anywhere else (only set up once per page)
    if (!window._dropdownCloseHandlerAttached) {
        window._dropdownCloseHandlerAttached = true;
        document.addEventListener('click', (e) => {
            // Close all user dropdowns if click is outside
            const allDropdowns = document.querySelectorAll('.user-dropdown');
            allDropdowns.forEach(dd => {
                if (!dd.contains(e.target)) {
                    const content = dd.querySelector('.dropdown-content');
                    if (content) {
                        content.style.display = 'none';
                        content.classList.remove('show');
                    }
                }
            });
        });
    }
});
