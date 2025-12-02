// ========================
// API ENDPOINT
// ========================
const SHIPMENTS_API_URL = "/shipment/my";


// ========================
// RENDER SHIPMENTS
// ========================
function renderShipments(shipments) {
    const tableBody = document.getElementById("shipmentsTableBody");
    const noDataMessage = document.getElementById("noDataMessage");

    // Clear previous content
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
            <td><strong>${shipment.shipmentNumber || "N/A"}</strong></td>
            <td>${shipment.containerNumber || "N/A"}</td>
            <td>${shipment.goodsType || "N/A"}</td>
            <td>${shipment.route || "N/A"}</td>
            <td>${shipment.deliveryDate || "N/A"}</td>
            <td class="${statusClass}">${shipment.status || "Created"}</td>
            <td>${shipment.createdOnDisplay || "N/A"}</td> <!-- FIX: Use the formatted field from the backend -->
            <td>${shipment.description || "N/A"}</td>
        `;
    });
}


// ========================
// FETCH SHIPMENTS (WITH JWT)
// ========================
async function fetchShipments() {
    try {
        const token = localStorage.getItem("access_token");

        // FIX: Handle missing token and redirect if necessary
        if (!token) {
            document.getElementById("noDataMessage").textContent = "Please log in to view your shipments.";
            document.getElementById("noDataMessage").style.display = "block";
            // window.location.href = "/login"; // Uncomment this line if you want an automatic redirect
            return;
        }

        const response = await fetch(SHIPMENTS_API_URL, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        const shipments = await response.json();

        if (response.ok) {
            renderShipments(shipments);
        } else {
            // Handle potential unauthorized/expired token errors
            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem("accessToken"); // Clear invalid token
                document.getElementById("noDataMessage").textContent = "Session expired. Please log in again.";
                document.getElementById("noDataMessage").style.display = "block";
            }
            throw new Error(shipments.detail || "Failed to fetch shipment data.");
        }

    } catch (error) { // FIX: Correctly structured catch block
        console.error("Shipment API error:", error);
        document.getElementById("noDataMessage").textContent = "Error loading shipments. Check console for details.";
        document.getElementById("noDataMessage").style.display = "block";
    }
}


// ========================
// PAGE LOAD LOGIC
// ========================
document.addEventListener("DOMContentLoaded", function () {

    // ---- Load User Data for Header & Profile Box ----
    // FIX: Load from localStorage and provide stable fallbacks
    const userName = localStorage.getItem("userName");
    const userEmail = localStorage.getItem("userEmail");
    
    // Set display text, using stable defaults if the stored value is missing
    const displayName = userName || "User";
    const displayEmail = userEmail || "No Email";
    const initial = displayName.charAt(0).toUpperCase();

    document.getElementById("displayName").textContent = displayName;
    document.getElementById("displayEmail").textContent = displayEmail;
    document.getElementById("mainUserInitial").textContent = initial;
    document.getElementById("headerUserInitial").textContent = initial;

    // ---- Fetch Shipments ----
    fetchShipments();
});
