document.getElementById("forgotPasswordForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message");

    message.textContent = ""; // Clear previous messages
    message.style.color = "black";
    message.textContent = "Sending request...";

    try {
        // 💡 API ENDPOINT: This POST request will hit your new backend route.
        const response = await fetch("/reset-password-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "green";
            // IMPORTANT: Use a generic success message for security, regardless of whether the email exists.
            message.textContent = "Reset link has been sent. Check your email.";
        } else {
            message.style.color = "red";
            // Display error detail from the backend (e.g., "Email service offline")
            message.textContent = data.detail || "Failed to process request. Please try again later.";
        }

    } catch (err) {
        console.error("Forgot Password API error:", err);
        message.style.color = "red";
        message.textContent = "Server connection error. Please check your network.";
    }
});