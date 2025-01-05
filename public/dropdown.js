document.addEventListener('DOMContentLoaded', () => {
    const userInitial = document.getElementById('userInitial');
    
    if (userInitial) {
        // Toggle dropdown when clicking user circle
        userInitial.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.querySelector('.dropdown-content');
            dropdown.classList.toggle('show');
        });

        // Close dropdown when clicking anywhere else
        window.addEventListener('click', () => {
            const dropdown = document.querySelector('.dropdown-content');
            if (dropdown && dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        });
    }
});
