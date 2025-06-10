// Store the current page content
let currentContent = '';
let currentPage = '';

// Initialize navigation
document.addEventListener('DOMContentLoaded', () => {
    // Get all navigation links
    const navLinks = document.querySelectorAll('nav a');
    
    // Add click handler to each link
    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Save current page content if we're leaving it
            if (currentPage && currentPage !== link.getAttribute('href')) {
                currentContent = document.querySelector('.container').innerHTML;
            }
            
            const targetPage = link.getAttribute('href');
            
            // If we're returning to the saved page
            if (targetPage === currentPage && currentContent) {
                document.querySelector('.container').innerHTML = currentContent;
                initializePageFunctions(targetPage);
                return;
            }
            
            // Load new page content
            try {
                const response = await fetch(targetPage);
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newContent = doc.querySelector('.container').innerHTML;
                
                document.querySelector('.container').innerHTML = newContent;
                currentPage = targetPage;
                currentContent = '';
                
                // Initialize page-specific functions
                initializePageFunctions(targetPage);
                
                // Update URL without refreshing
                window.history.pushState({}, '', targetPage);
                
                // Update active state in navigation
                navLinks.forEach(navLink => {
                    if (navLink.getAttribute('href') === targetPage) {
                        navLink.classList.add('font-bold');
                    } else {
                        navLink.classList.remove('font-bold');
                    }
                });
            } catch (error) {
                console.error('Error loading page:', error);
            }
        });
    });
});

// Initialize page-specific functions
function initializePageFunctions(page) {
    if (page.includes('index.html')) {
        // Route Planner page
        if (typeof initMap === 'function') {
            initMap();
        }
    } else if (page.includes('fleet.html')) {
        // Fleet Management page
        if (typeof updateUI === 'function') {
            updateUI();
        }
    } else if (page.includes('events.html')) {
        // Events page
        if (typeof loadEvents === 'function') {
            loadEvents();
        }
    }
} 