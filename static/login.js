// ======================
// SIDEBAR TOGGLE LOGIC
// ======================
const sidebar = document.getElementById("sidebar");
const hamburger = document.getElementById("hamburger");

// Check if elements exist before adding listeners (important for safety)
if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        hamburger.classList.toggle("open"); // Toggle on hamburger for X animation
    });
}


// ======================
// LOGIN FORM LOGIC
// ======================
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    const message = document.getElementById("message");

    message.textContent = "";

    // -------- CLIENT VALIDATION -------- //
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    // Requires: at least 6 characters, one lowercase, one uppercase, one digit, one special character
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;

    if (!emailRegex.test(email)) {
        message.style.color = "red";
        message.textContent = "⚠️ Invalid email!";
        return;
    }

    if (!passRegex.test(pass)) {
        // This is the client-side strength check
        message.style.color = "red";
        message.textContent = "⚠️ Weak password! Must contain: min 6 chars, upper, lower, digit, special char.";
        return;
    }

    // -------- BACKEND CALL -------- //
    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: pass })
        });

        const result = await response.json();

        if (!response.ok) {
            // This section handles the backend failure (401 error with "Invalid password")
            message.style.color = "red";
            message.textContent = `⚠️ ${result.detail || 'Login failed.'}`;
            return;
        }

        // ⭐ Success Logic: Store JWT token and user data 
        if (result.access_token) {
            sessionStorage.setItem('accessToken', result.access_token);
        } else {
             message.style.color = "red";
             message.textContent = "⚠️ Login failed: Token missing.";
             return;
        }


        if (result.user_data && result.user_data.name && result.user_data.email) {
             // Store the name and email for display on protected pages
            sessionStorage.setItem('userName', result.user_data.name);
            sessionStorage.setItem('userEmail', result.user_data.email); 
        } else {
             sessionStorage.setItem('userName', email.split('@')[0]);
             sessionStorage.setItem('userEmail', email);
        }
        
        message.style.color = "#7af58b";
        message.textContent = "✔ Login successful! Redirecting...";

        alert("Logged in successfully!");

        // Redirect to the protected account page using the FastAPI route
        window.location.href = "/myaccount"; 

    } catch (error) {
        console.error("Fetch error during login:", error);
        message.style.color = "red";
        message.textContent = "⚠️ Server error! Check if FastAPI server is running at http://127.0.0.1:8000.";
    }
});