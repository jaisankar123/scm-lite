document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    const confirmPass = document.getElementById("confirmPassword").value;
    const message = document.getElementById("message");

    message.textContent = "";

    // -------- CLIENT VALIDATION -------- //
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{6,}$/;

    if (!name || !email || !pass || !confirmPass) {
        message.style.color = "red";
        message.textContent = "⚠ Please fill in all fields!";
        return;
    }

    if (!emailRegex.test(email)) {
        message.style.color = "red";
        message.textContent = "⚠ Invalid email format!";
        return;
    }

    if (pass !== confirmPass) {
        message.style.color = "red";
        message.textContent = "⚠ Passwords do not match!";
        return;
    }

    if (!passRegex.test(pass)) {
        message.style.color = "red";
        message.textContent = "⚠ Weak password! Must contain: min 6 chars, upper, lower, digit, special char.";
        return;
    }

    // -------- BACKEND CALL -------- //
    try {
        const response = await fetch("http://127.0.0.1:8000/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name,
                email: email,
                password: pass
            })
        });

        const result = await response.json();

        if (!response.ok) {
            message.style.color = "red";
            message.textContent = `⚠ Signup failed: ${result.detail || 'Unknown error'}`;
            return;
        }

        message.style.color = "#7af58b";
        message.textContent = "✔ Signup successful! Redirecting to login...";
        alert("Signup successful! You can now log in.");
        window.location.href = "login.html";

    } catch (error) {
        console.error(error);
        message.style.color = "red";
        message.textContent = "⚠ Server error! Check if FastAPI server is running at http://127.0.0.1:8000.";
    }
});