document.addEventListener('DOMContentLoaded', () => {

    // ======================================
    // JWT VALIDATION + USER DETAILS FETCH
    // ======================================
    async function fetchUserDetails() {
        // ⭐ FIX: Use the correct keys/case from login.js
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        const token = localStorage.getItem('access_token'); // FIX: changed from 'accessToken'

        const displayDefault = (msg) => {
            document.getElementById('displayName').textContent = msg;
            document.getElementById('displayEmail').textContent = 'Please log in.';
            // document.getElementById('mainUserInitial').textContent = '?'; // This ID is in HTML
            // document.getElementById('headerUserInitial').textContent = '?'; // This ID is in HTML
        };

        // If no token or user email → force login
        if (!userEmail || !token) {
            displayDefault('Guest');
            // This is handled by auth-check.js, but keeping here as a fallback
            if (!window.location.pathname.includes('/login')) {
                 window.location.href = '/login';
            }
            return;
        }
        
        // Optimistically set name and initial from localStorage before API call
        const initial = userName ? userName.charAt(0).toUpperCase() : 'U';
        document.getElementById('displayName').textContent = userName || 'User';
        document.getElementById('displayEmail').textContent = userEmail;
        document.getElementById('mainUserInitial').textContent = initial;
        document.getElementById('headerUserInitial').textContent = initial; // Set header initial

        try {
            // FIX: Removed hardcoded IP and port, using relative path
            const res = await fetch(`/account/me/${userEmail}`, {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            // Handle invalid/expired token
            if (res.status === 401 || res.status === 403) {
                localStorage.clear();
                // Replace alert() with console log or custom UI component
                console.error("Session expired or unauthorized. Please login again."); 
                window.location.href = '/login';
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to load profile data");
            }

            const user = await res.json();
            
            // Re-update UI with fresh API data (name and email are guaranteed)
            const apiName = user.name || 'User';
            const apiInitial = apiName.charAt(0).toUpperCase();

            document.getElementById('displayName').textContent = apiName;
            document.getElementById('displayEmail').textContent = user.email;
            document.getElementById('mainUserInitial').textContent = apiInitial;
            document.getElementById('headerUserInitial').textContent = apiInitial;
            


        } catch (err) {
            console.error("Error Loading Account Details:", err);
            displayDefault('API Error: Could not fetch details');
        }
    }

    // ======================================
    // LOGOUT BUTTON HANDLER
    // ======================================
    // Note: If you want a logout button, add an element with id="logoutBtn" to myaccount.html
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/login';
        });
    }

    // ======================================
    // INITIALIZE
    // ======================================
    fetchUserDetails();
});