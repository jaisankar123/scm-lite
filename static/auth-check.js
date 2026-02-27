// Common script to be used in all protected HTML pages

// ======================
// SIDEBAR TOGGLE LOGIC (FIX)
// ======================

const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");
const sidebarCloser = document.getElementById("sidebar-closer");

function toggleSidebar() {
    sidebar.classList.toggle("open");
}

// 1. Open sidebar when hamburger is clicked
if (hamburger) {
    hamburger.addEventListener("click", toggleSidebar);
}

// 2. Close sidebar when 'X' (sidebar closer) is clicked
if (sidebarCloser) {
    sidebarCloser.addEventListener("click", toggleSidebar);
}

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Use the correct storage and key name
    const token = localStorage.getItem("access_token"); 

    // Define pages that don't require a token
    const publicPaths = ['/login', '/signup', '/'];
    const isPublicPage = publicPaths.some(path => window.location.pathname === path);

    if (!token) {
        if (!isPublicPage) {
            window.location.href = "/login";
        }
        return;
    }

    // 2. Token exists, now verify it with the server (e.g., /api/v1/verify-token)
    try {
        const response = await fetch("/api/v1/verify-token", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}` 
            }
        });

        if (!response.ok) {
            // Server (main.py) returned 401/403: token is invalid/expired
            throw new Error("Token validation failed");
        }

        // If the user is on a public page (e.g., /login) but has a valid token, redirect them to the dashboard.
        if (isPublicPage && window.location.pathname !== '/') {
            window.location.href = "/dashboard";
        }

    } catch (error) {
        console.error("JWT verification failed:", error);
        // Clear invalid token and redirect to login
        localStorage.removeItem("access_token");
        
        if (!isPublicPage) {
            window.location.href = "/login";
        }
    }
    

});



