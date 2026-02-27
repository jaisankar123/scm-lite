// ======================
// LOGIN / SIGNUP BUTTONS
// ======================

const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const token = localStorage.getItem("access_token");

// Add event listeners only if buttons exist
if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        window.location.href = "/login";
    });
}

if (signupBtn) {
    signupBtn.addEventListener("click", () => {
        window.location.href = "/signup";
    });
}

// Hide login & signup when user IS logged in
if (token) {
    if (loginBtn) loginBtn.style.display = "none";
    if (signupBtn) signupBtn.style.display = "none";
}


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