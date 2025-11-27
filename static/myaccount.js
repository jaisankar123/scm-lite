  
    // ======================================
    // Sidebar Toggle Logic (copied from login.js)
    // ======================================
    const sidebar = document.getElementById("sidebar");
    const hamburger = document.getElementById("hamburger");

    if (hamburger && sidebar) {
        hamburger.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            hamburger.classList.toggle("open");
        });
    }
    
    // ======================================
    // API Fetch and Display Logic (UPDATED FOR JWT)
    // ======================================
    async function fetchUserDetails() {
        const userEmail = sessionStorage.getItem('userEmail');
        const token = sessionStorage.getItem('accessToken'); // 1. Retrieve the token
        
        const displayDefault = (message) => {
            document.getElementById('displayName').textContent = message;
            document.getElementById('displayEmail').textContent = 'Please log in.';
            document.getElementById('mainUserInitial').textContent = '?';
            document.getElementById('headerUserInitial').textContent = '?';
        };

        if (!userEmail || !token) { // Check for both email and token
            displayDefault('Guest User');
            // Optionally redirect to login if user is not authenticated
            // window.location.href = '/login'; 
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:8000/account/me/${userEmail}`, {
                method: 'GET',
                headers: {
                    // 2. Attach Authorization header with Bearer token
                    'Authorization': `Bearer ${token}` 
                }
            });
            const userData = await response.json();

            if (!response.ok) {
                // If token is expired or invalid (401/403)
                if (response.status === 401 || response.status === 403) {
                    sessionStorage.clear(); // Clear local storage
                    alert("Session expired or unauthorized. Please log in again.");
                    window.location.href = '/login'; // Redirect to login
                    return;
                }
                throw new Error(userData.detail || 'Failed to fetch user details.');
            }

            // Success handling
            const userName = userData.name || 'User';
            const initial = userName.charAt(0).toUpperCase();

            // 1. Update Display Fields
            document.getElementById('displayName').textContent = userName;
            document.getElementById('displayEmail').textContent = userData.email;

            // 2. Update Initials (Main View and Header)
            document.getElementById('mainUserInitial').textContent = initial;
            document.getElementById('headerUserInitial').textContent = initial;

        } catch (error) {
            console.error("Error fetching user details:", error);
            displayDefault('Error Loading');
        }
    }
    
    // ======================================
    // Help Anchor and Contact Form Logic (UNCHANGED)
    // ======================================
    const helpLink = document.getElementById('helpLink');
    const messageFormDiv = document.getElementById('messageForm');
    const contactForm = document.getElementById('contactForm');
    const contactMessage = document.getElementById('contactMessage');
    const recipientEmail = "jaisankar.nb66@gmail.com";

    if (helpLink) {
        helpLink.addEventListener('click', (e) => {
            e.preventDefault();
            messageFormDiv.style.display = messageFormDiv.style.display === 'block' ? 'none' : 'block';
            contactMessage.textContent = "";
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const messageText = document.getElementById('messageText').value.trim();
            
            if (!messageText) {
                contactMessage.style.color = 'red';
                contactMessage.textContent = 'Please enter a message.';
                return;
            }

            const subject = encodeURIComponent(`Support Request from ${sessionStorage.getItem('userName') || 'User'}`);
            const body = encodeURIComponent(messageText);
            
            window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

            contactMessage.style.color = '#7af58b';
            contactMessage.textContent = 'Your email client should open now. Click "Help" to close this form.';
            
            document.getElementById('messageText').value = '';
        });
    }

    // Initialize on DOMContentLoaded
    document.addEventListener("DOMContentLoaded", fetchUserDetails);

    