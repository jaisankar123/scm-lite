    // ... (Sidebar logic remains the same)

    // ======================
    // LOGIN / SIGNUP BUTTONS
    // ======================
    document.getElementById("loginBtn").addEventListener("click", () => {
        window.location.href = "login.html";
    });

    document.getElementById("signupBtn").addEventListener("click", () => {
        window.location.href = "signup.html";
    });

    // FIXED: Use the dashboard as the main landing page after "Explore"
    document.getElementById("exploreBtn").addEventListener("click", () => {
        window.location.href = "dashboard.html";
    });