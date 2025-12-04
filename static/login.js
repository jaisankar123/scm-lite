// Global state to track if we are waiting for the 2FA code
let isTwoFactorPending = false;
let pendingEmail = ""; // Store email temporarily for the 2FA submission

document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    // GET ALL REQUIRED ELEMENTS (Matching IDs from corrected login.html)
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const codeInput = document.getElementById("code");
    const message = document.getElementById("message");
    const credentialsGroup = document.getElementById("credentialsGroup");
    const twoFactorGroup = document.getElementById("twoFactorGroup");
    const mainSubmitBtn = document.getElementById("mainSubmitBtn");
    const loginTitle = document.getElementById("login-title"); // NEW: Capture the title element

    // Get current values
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const code = codeInput.value.trim();
    
    message.textContent = "";

    // Determine which step we are in
    if (!isTwoFactorPending) {
        // --- STEP 1: LOGIN (Email & Password) ---
        try {

            if (!email || !password) {
            message.style.color = "red";
            message.textContent = "Please enter both email and password.";
            return;
        }
            mainSubmitBtn.disabled = true;
            mainSubmitBtn.textContent = "Logging In...";

            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            mainSubmitBtn.disabled = false;
            // The button text is reset later if it fails, or changed if 2FA starts

            if (response.status === 202) {
                // SUCCESS: Credentials valid, 2FA code sent (HTTP 202)
                pendingEmail = data.email;
                isTwoFactorPending = true;
                
                // Switch UI to 2FA mode
                loginTitle.textContent = "Verify Code"; // Change title
                credentialsGroup.style.display = "none";
                twoFactorGroup.style.display = "block";
                mainSubmitBtn.textContent = "Verify Code";
                
                message.style.color = "blue";
                message.textContent = data.message || "Verification code sent. Check your email.";
                return;

            } else if (!response.ok) {
                // Standard login failure (401, 404, etc.)
                mainSubmitBtn.textContent = "Login"; // Reset button text
                message.style.color = "red";
                message.textContent = data.detail || "Login failed. Check your email and password.";
                return;
            }



        } catch (err) {
            console.error(err);
            mainSubmitBtn.disabled = false;
            mainSubmitBtn.textContent = "Login";
            message.style.color = "red";
            message.textContent = "Server error during login attempt.";
        }
    } else {
        // --- STEP 2: 2FA CODE VERIFICATION ---
        if (code.length !== 6) {
            message.style.color = "red";
            message.textContent = "Please enter the 6-digit code.";
            return;
        }

        try {
            mainSubmitBtn.disabled = true;
            mainSubmitBtn.textContent = "Verifying...";
            
            const response = await fetch("/verify-2fa", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: pendingEmail, code: code }) // Use stored email
            });

            const data = await response.json();

            if (!response.ok) {
                mainSubmitBtn.disabled = false;
                mainSubmitBtn.textContent = "Verify Code";
                
                message.style.color = "red";
                message.textContent = data.detail || "Verification failed. Try again.";
                return;
            }

            // FINAL SUCCESS: JWT received
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("userEmail", data.user_data.email);
            localStorage.setItem("userName", data.user_data.name);

            message.style.color = "lightgreen";
            message.textContent = "✔ Login successful! Redirecting...";

            // Reset state and redirect
            isTwoFactorPending = false;
            pendingEmail = "";
            window.location.href = "/dashboard";

        } catch (err) {
            console.error(err);
            mainSubmitBtn.disabled = false;
            mainSubmitBtn.textContent = "Verify Code";
            message.style.color = "red";
            message.textContent = "Server error during verification.";
        }
    }
});