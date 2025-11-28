// ========================
// API ENDPOINT
// ========================
const SHIPMENTS_API_URL = "http://127.0.0.1:8000/shipment/my";


// ========================
// RENDER SHIPMENTS
// ========================
function renderShipments(shipments) {
    const tableBody = document.getElementById("shipmentsTableBody");
    const noDataMessage = document.getElementById("noDataMessage");

    tableBody.innerHTML = "";

    if (shipments.length === 0) {
        noDataMessage.textContent = "No shipments found. Create one now!";
        noDataMessage.style.display = "block";
        return;
    }

    noDataMessage.style.display = "none";

    shipments.forEach(shipment => {
        const statusClass = `status-${shipment.status ? shipment.status.toLowerCase() : "created"}`;
        const row = tableBody.insertRow();

        row.innerHTML = `
            <td><strong>${shipment._id || "N/A"}</strong></td>
            <td>${shipment.containerNumber || "N/A"}</td>
            <td>${shipment.goodsType || "N/A"}</td>
            <td>${shipment.route || "N/A"}</td>
            <td>${shipment.deliveryDate || "N/A"}</td>
            <td class="${statusClass}">${shipment.status || "Created"}</td>
            <td>${shipment.timestamp || "N/A"}</td>
            <td>${shipment.description || "N/A"}</td>
        `;
    });
}



// ========================
// FETCH SHIPMENTS (WITH JWT)
// ========================
async function fetchShipments() {
    try {
        const token = sessionStorage.getItem("accessToken");

        // If token missing → redirect
        if (!token) {
            window.location.href = "/login";
            return;
        }

        const response = await fetch(SHIPMENTS_API_URL, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
            }
        });

        const shipments = await response.json();

        if (response.ok) {
            renderShipments(shipments);
        } else {
            throw new Error(shipments.detail || "Failed to fetch shipment data.");
        }

    } catch (error) {
        console.error("Shipment API error:", error);
        document.getElementById("noDataMessage").textContent = "Error loading shipments.";
        document.getElementById("noDataMessage").style.display = "block";
    }
}



// ========================
// PAGE LOAD LOGIC
// ========================
document.addEventListener("DOMContentLoaded", function () {

    // ---- Load User Data for Header & Profile Box ----
    const userName = sessionStorage.getItem("userName") || "User";
    const userEmail = sessionStorage.getItem("userEmail") || "No Email";
    const initial = userName.charAt(0).toUpperCase();

    document.getElementById("displayName").textContent = userName;
    document.getElementById("displayEmail").textContent = userEmail;
    document.getElementById("mainUserInitial").textContent = initial;
    document.getElementById("headerUserInitial").textContent = initial;

    // ---- Fetch Shipments ----
    fetchShipments();
});
