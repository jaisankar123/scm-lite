document.addEventListener('DOMContentLoaded', function () {

    // ============================================
    // GLOBAL JWT VALIDATION FOR PAGE ACCESS
    // ============================================
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
        alert("Unauthorized access. Please log in.");
        window.location.href = "/login";
        return;
    }

    const shipmentForm = document.getElementById('shipmentForm');
    const createShipmentBtn = document.querySelector('.create-btn-style');
    const clearDetailsBtn = document.querySelector('.clear-btn-style');


    // ============================================
    // 1. VALIDATION AND FORM HELPERS
    // ============================================

    function getInputValue(selector) {
        const element = shipmentForm.querySelector(selector);
        return element ? element.value.trim() : "";
    }

    function validateForm(form) {
        let isValid = true;
        const required = form.querySelectorAll("input[required], select");

        required.forEach(input => {
            if (
                input.value.trim() === "" ||
                (input.tagName === "SELECT" && input.value.includes("Select"))
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
    // 2. FETCH DEVICES (WITH JWT)
    // ============================================

    async function populateFormOptions() {
        try {

            const res = await fetch("http://127.0.0.1:8000/devices/all", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.status === 401 || res.status === 403) {
                sessionStorage.clear();
                alert("Session expired. Please login again.");
                window.location.href = "/login";
                return;
            }

            const deviceIds = await res.json();
            const deviceSelect = shipmentForm.querySelector("select:nth-of-type(2)");

            let html = `<option value="">Select Device</option>`;
            deviceIds.forEach(id => html += `<option value="${id}">${id}</option>`);

            deviceSelect.innerHTML = html;

        } catch (err) {
            console.error("Error loading devices:", err);
        }
    }


    // ============================================
    // 3. CREATE SHIPMENT (WITH JWT)
    // ============================================

    if (createShipmentBtn) {
        createShipmentBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            if (!validateForm(shipmentForm)) {
                alert("Please fill out all required fields.");
                return;
            }

            const token = sessionStorage.getItem("accessToken");
            if (!token) {
                alert("Authentication failed. Login again.");
                window.location.href = "/login";
                return;
            }

            const shipmentData = {
                shipmentNumber: getInputValue('input[placeholder="Shipment Number"]'),
                route: getInputValue('select:nth-of-type(1)'),
                device: getInputValue('select:nth-of-type(2)'),
                poNumber: getInputValue('input[placeholder="PO Number"]'),
                containerNumber: getInputValue('input[placeholder="Container Number"]'),
                goodsType: getInputValue('select:nth-of-type(3)'),
                deliveryDate: getInputValue('input[type="date"]'),
                description: getInputValue('input[placeholder="Shipment Description"]'),
                ndcNumber: getInputValue('input[placeholder="NDC Number"]'),
                serialNumber: getInputValue('input[placeholder="Serial number of Goods"]'),
                deliveryNumber: getInputValue('input[placeholder="Delivery Number"]'),
                batchId: getInputValue('input[placeholder="Batch Id"]'),
                status: "Created",
                created: new Date().toLocaleDateString()
            };

            try {
                const res = await fetch("http://127.0.0.1:8000/shipment/new", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(shipmentData)
                });

                const output = await res.json();

                if (res.status === 401 || res.status === 403) {
                    alert("Session expired. Please log in again.");
                    sessionStorage.clear();
                    window.location.href = "/login";
                    return;
                }

                if (!res.ok) {
                    alert("Failed to create shipment: " + (output.detail || "Server error"));
                    return;
                }

                alert(`Shipment ${output.shipment_id} created successfully!`);
                shipmentForm.reset();

            } catch (err) {
                console.error("API Error:", err);
                alert("Server error. Try again later.");
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
            alert("Form cleared!");
        });
    }

    populateFormOptions();
});

