document.addEventListener('DOMContentLoaded', () => {

    // ======================================
    // JWT VALIDATION + USER DETAILS FETCH
    // ======================================
    async function fetchUserDetails() {
        const userEmail = sessionStorage.getItem('userEmail');
        const token = sessionStorage.getItem('accessToken');

        const displayDefault = (msg) => {
            document.getElementById('displayName').textContent = msg;
            document.getElementById('displayEmail').textContent = 'Please log in.';
            document.getElementById('userInitial').textContent = '?';
        };

        // If no token or user email → force login
        if (!userEmail || !token) {
            displayDefault('Guest');
            window.location.href = '/login';
            return;
        }

        try {
            const res = await fetch(`http://127.0.0.1:8000/account/me/${userEmail}`, {
                method: 'GET',
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            // Handle invalid/expired token
            if (res.status === 401 || res.status === 403) {
                sessionStorage.clear();
                alert("Session expired or unauthorized. Please login again.");
                window.location.href = '/login';
                return;
            }

            if (!res.ok) {
                throw new Error("Failed to load profile data");
            }

            const user = await res.json();

            // Update UI
            const name = user.name || 'User';
            const initial = name.charAt(0).toUpperCase();

            document.getElementById('displayName').textContent = name;
            document.getElementById('displayEmail').textContent = user.email;
            document.getElementById('userInitial').textContent = initial;

        } catch (err) {
            console.error("Error Loading Account Details:", err);
            displayDefault('Error');
        }
    }

    // ======================================
    // LOGOUT BUTTON HANDLER
    // ======================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.clear();
            window.location.href = '/login';
        });
    }

    // ======================================
    // INITIALIZE
    // ======================================
    fetchUserDetails();
});

    