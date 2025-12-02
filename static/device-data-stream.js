let pollingTimer = null;
let currentSelectedDeviceId = null; // Track the currently selected device ID for rendering

// ==============================================
// ELEMENT REFERENCES
// ==============================================
const tbody = document.getElementById("dataTableBody");
const deviceIdSelect = document.getElementById("deviceId");
const dataForm = document.getElementById("dataForm");
const API_URL = "/device-data";
// Reduced polling interval to 2 seconds for a more "stream-like" feel
const POLLING_INTERVAL = 2000; 

// ==============================================
// HELPER: Populate device IDs
// ==============================================
function populateDeviceIds() {
    // Generate device IDs 1150 through 1158
    const deviceIds = Array.from({ length: 9 }, (_, i) => 1150 + i);

    let optionsHtml = '<option value="">Select Device Id</option>';
    optionsHtml += '<option value="all">All Devices</option>';

    deviceIds.forEach(id => {
        optionsHtml += `<option value="${id}">${id}</option>`;
    });

    deviceIdSelect.innerHTML = optionsHtml;
}

// ==============================================
// HELPER: Render table rows
// ==============================================
function renderTable(data, selectedId) {
    // Check if the user is viewing 'All Devices' or a specific ID
    const filterId = selectedId && selectedId !== "all" ? selectedId : null;

    // Filter data client-side if a specific device is selected
    const filteredData = filterId
        ? data.filter(item => String(item.Device_ID) === filterId)
        : data;

    // Sort by timestamp (if available) or rely on the backend's sort
    filteredData.sort((a, b) => b.timestamp - a.timestamp);

    // Keep only the latest 15 records in the table for performance
    const displayData = filteredData.slice(0, 15);
    
    // Clear existing rows
    tbody.innerHTML = "";
    
    if (displayData.length === 0) {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="6" style="text-align: center;">No data available for ${filterId ? 'Device ID ' + filterId : 'selected devices'}.</td>`;
        tbody.appendChild(row);
        return;
    }

    displayData.forEach(item => {
        const row = document.createElement("tr");
        // FIX: The timestamp column was showing the client-side time. 
        // We will use the backend's timestamp if available, or current time as fallback.
        const displayTime = item.timestamp 
            ? new Date(item.timestamp * 1000).toLocaleTimeString() 
            : new Date().toLocaleTimeString();

        row.innerHTML = `
            <td>${item.Device_ID || 'N/A'}</td>
            <td>${item.Battery_Level} V</td>
            <td>${item.First_Sensor_temperature} °C</td>
            <td>${item.Route_From || 'N/A'}</td>
            <td>${item.Route_To || 'N/A'}</td>
            <td>${displayTime}</td>
        `;

        tbody.appendChild(row);
    });
}

// ==============================================
// MAIN FETCH + POLLING LOGIC WITH JWT
// ==============================================
async function fetchAndRenderData() {
    const selectedId = deviceIdSelect.value;
    const token = localStorage.getItem("access_token"); // FIX: Retrieve token correctly

    if (!token) {
        console.error("Authentication token is missing.");
        // alert("Session expired. Please log in again.");
        // window.location.href = "/login";
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        // Handle token expiry / invalid token
        if (response.status === 401 || response.status === 403) {
            console.error("Session expired.");
            clearInterval(pollingTimer); // Stop polling
            // alert("Session expired. Please log in again.");
            // localStorage.clear();
            // window.location.href = "/login";
            return;
        }

        if (!response.ok) {
            console.error("API Error:", response.status);
            return;
        }

        const latestData = await response.json();
        // Use the globally tracked ID to maintain selection consistency
        renderTable(latestData, currentSelectedDeviceId); 

    } catch (error) {
        console.error("Error fetching device data:", error);
    }
}

// ==============================================
// FORM SUBMIT EVENT (Start polling)
// ==============================================
dataForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const selectedId = deviceIdSelect.value;
    currentSelectedDeviceId = selectedId; // Update tracking variable

    if (!selectedId) {
        // Use a less intrusive message than alert
        console.log("Please select a Device ID or choose 'All Devices'.");
        return;
    }

    // Stop any existing polling timer before starting a new one
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
    
    // Immediately fetch and render data
    fetchAndRenderData(); 

    // Start the recurring polling
    pollingTimer = setInterval(fetchAndRenderData, POLLING_INTERVAL);

    console.log(`Started polling for Device ID: ${selectedId === "all" ? "All Devices" : selectedId}`);
});

// ==============================================
// INITIALIZATION
// ==============================================
document.addEventListener("DOMContentLoaded", function () {
    populateDeviceIds();

    // Initialize Select2
    $(document).ready(function () {
        $('#deviceId').select2({
            placeholder: "Type or select a Device Id",
            allowClear: true
        });

        // When selection changes: Clear the table and stop polling 
        $('#deviceId').on('change', function () {
            if (pollingTimer) {
                clearInterval(pollingTimer);
                pollingTimer = null;
            }
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Press "GET DEVICE DATA" to start the stream.</td></tr>';
            currentSelectedDeviceId = null;
        });

        // Initial state message
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Press "GET DEVICE DATA" to start the stream.</td></tr>';
    });
});

// REMOVED the connectWebSocket logic as it was not being used correctly 
// and conflicts with the polling implementation for this page's design