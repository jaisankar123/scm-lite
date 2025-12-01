document.addEventListener('DOMContentLoaded', function () {

    const shipmentForm = document.getElementById('shipmentForm');
    const createShipmentBtn = document.querySelector('.create-btn-style');
    const clearDetailsBtn = document.querySelector('.clear-btn-style');
    
    // ============================================
    // 1. VALIDATION AND FORM HELPERS
    // ============================================

    // Updated helper function to use IDs
    function getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value.trim() : "";
    }

    function validateForm(form) {
        let isValid = true;
        const required = form.querySelectorAll("input[required], select");

        required.forEach(input => {
            if (
                input.value.trim() === "" ||
                (input.tagName === "SELECT" && input.value.includes("Select")) // Assuming a 'Select' placeholder option exists
            ) {
                isValid = false;
                input.classList.add("is-invalid");
            } else {
                input.classList.remove("is-invalid");
            }
        });

        return isValid;
    }


    // ============================================
    // 2. FETCH DEVICES (Placeholder - NOT implemented in Python)
    // ============================================
    // NOTE: This function is currently commented out in the original JS.
    // To make it work, you would need a Python endpoint at /devices/all that returns a list of device IDs.
    // For now, we leave it commented out, and the HTML provides static device options.


    // ============================================
    // 3. CREATE SHIPMENT (with JWT and Database POST)
    // ============================================

    if (createShipmentBtn) {
        createShipmentBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            if (!validateForm(shipmentForm)) {
                // IMPORTANT: Removed alert() as per best practice, using console log for immediate feedback
                console.error("Validation failed: Please fill out all required fields.");
                return;
            }

            // ⭐ FIX: Using the correct localStorage key: "access_token"
            const token = localStorage.getItem("access_token");
            if (!token) {
                // IMPORTANT: Removed alert(), routing immediately
                console.error("Authentication failed. Redirecting to login.");
                window.location.href = "/login";
                return;
            }

            // Construct data payload using IDs from HTML
            const shipmentData = {
                shipmentNumber: getInputValue('shipmentNumber'),
                route: getInputValue('route'),
                device: getInputValue('device'),
                poNumber: getInputValue('poNumber'),
                containerNumber: getInputValue('containerNumber'),
                goodsType: getInputValue('goodsType'),
                deliveryDate: getInputValue('deliveryDate'),
                description: getInputValue('description'),
                ndcNumber: getInputValue('ndcNumber'),
                serialNumber: getInputValue('serialNumber'),
                deliveryNumber: getInputValue('deliveryNumber'),
                batchId: getInputValue('batchId'),
                status: "Created",
                // Ensure date format matches Python Pydantic expectation (simple string here)
                created: new Date().toLocaleDateString('en-US') 
            };

            try {
                // ⭐ FIX: Using relative path /shipment/new
                const res = await fetch("/shipment/new", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(shipmentData)
                });

                const output = await res.json();

                if (res.status === 401 || res.status === 403) {
                    console.error("Session expired or unauthorized. Please log in again.");
                    localStorage.clear();
                    window.location.href = "/login";
                    return;
                }

                if (!res.ok) {
                    // Show a message in the console, instead of alert()
                    console.error("Failed to create shipment: " + (output.detail || "Server error"));
                    return;
                }

                // Temporary success message display (replace with a custom modal later)
                console.log(`Shipment ${output.shipment_id} created successfully!`);
                shipmentForm.reset();

            } catch (err) {
                console.error("API Error: Could not reach server.", err);
            }
        });
    }


    // ============================================
    // 4. CLEAR FORM BUTTON
    // ============================================

    if (clearDetailsBtn) {
        clearDetailsBtn.addEventListener("click", (e) => {
            e.preventDefault();
            shipmentForm.reset();
            shipmentForm.querySelectorAll(".is-invalid").forEach(el => {
                el.classList.remove("is-invalid");
            });
            console.log("Form cleared!");
        });
    }

    // populateFormOptions();
});

