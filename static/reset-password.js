document.addEventListener("DOMContentLoaded", function() {
    const message = document.getElementById("message");
    const pageMessage = document.getElementById("pageMessage");
    const tokenInput = document.getElementById("resetToken");
    
    // 1. Extract token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        message.style.color = "red";
        message.textContent = "Error: Reset token is missing. Please request a new link.";
        pageMessage.style.display = "none";
        return;
    }
    
    // Store the token in the hidden field
    tokenInput.value = token;

    document.getElementById("resetPasswordForm").addEventListener("submit", async function(event) {
        event.preventDefault();

        const newPassword = document.getElementById("newPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        message.textContent = "";

        if (newPassword !== confirmPassword) {
            message.style.color = "red";
            message.textContent = "Passwords do not match!";
            return;
        }
        
        if (newPassword.length < 6) { // Basic validation
            message.style.color = "red";
            message.textContent = "Password must be at least 6 characters long.";
            return;
        }

        message.style.color = "black";
        message.textContent = "Updating password...";

        try {
            // 2. API ENDPOINT: POST request to validate token and update password
            const response = await fetch("/reset-password-confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: tokenInput.value,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                message.style.color = "lightgreen";
                message.textContent = "✔ Password successfully reset! Redirecting to login...";
                
                // Redirect user back to login after a few seconds
                setTimeout(() => {
                    window.location.href = "/login";
                }, 3000);
            } else {
                message.style.color = "red";
                // Display error (e.g., Token expired, Invalid token)
                message.textContent = data.detail || "Failed to reset password. Token may be invalid.";
            }

        } catch (err) {
            console.error("Password Reset API error:", err);
            message.style.color = "red";
            message.textContent = "Server connection error.";
        }
    });
});