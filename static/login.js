document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("message");

    message.textContent = "";

    try {
        const response = await fetch("http://127.0.0.1:8000/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            message.style.color = "red";
            message.textContent = data.detail || "Login failed";
            return;
        }

        // ⭐ SAVE JWT TOKEN IN LOCALSTORAGE
        localStorage.setItem("access_token", data.access_token);

        message.style.color = "lightgreen";
        message.textContent = "✔ Login successful!";

        // Redirect
        window.location.href = "/dashboard";

    } catch (err) {
        console.error(err);
        message.style.color = "red";
        message.textContent = "Server error";
    }
});
