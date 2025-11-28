// device-data-stream.js - FINAL CODE WITH JWT + SELECT2 + POLLING

// ==============================================
//  GLOBAL JWT VALIDATION FOR PAGE ACCESS
// ==============================================
const token = sessionStorage.getItem("accessToken");

if (!token) {
    alert("Unauthorized access. Please log in.");
    window.location.href = "/login";
}

// ==============================================
// ELEMENT REFERENCES
// ==============================================
const tbody = document.getElementById("dataTableBody");
const deviceIdSelect = document.getElementById("deviceId");
const dataForm = document.getElementById("dataForm");
const API_URL = "http://127.0.0.1:8000/device-data";
const POLLING_INTERVAL = 5000;

let pollingTimer = null;

// ==============================================
// HELPER: Populate device IDs
// ==============================================
function populateDeviceIds() {
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
    tbody.innerHTML = "";

    const filteredData = (selectedId && selectedId !== "all")
        ? data.filter(item => String(item.Device_ID) === selectedId)
        : data;

    filteredData.reverse().forEach(item => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${item.Device_ID || 'N/A'}</td>
            <td>${item.Battery_Level} V</td>
            <td>${item.First_Sensor_temperature} °C</td>
            <td>${item.Route_From || 'N/A'}</td>
            <td>${item.Route_To || 'N/A'}</td>
            <td>${new Date().toLocaleTimeString()}</td>
        `;

        tbody.appendChild(row);
    });
}

// ==============================================
// MAIN FETCH + POLLING LOGIC WITH JWT
// ==============================================
async function fetchAndRenderData() {
    const selectedId = deviceIdSelect.value;

    try {
        const response = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        // Handle token expiry / invalid token
        if (response.status === 401 || response.status === 403) {
            alert("Session expired. Please log in again.");
            sessionStorage.clear();
            window.location.href = "/login";
            return;
        }

        if (!response.ok) {
            console.error("API Error:", response.status);
            return;
        }

        const latestData = await response.json();
        renderTable(latestData, selectedId);

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

    if (!selectedId) {
        alert("Please select a Device ID or choose 'All Devices'.");
        return;
    }

    if (pollingTimer) clearInterval(pollingTimer);

    fetchAndRenderData();
    pollingTimer = setInterval(fetchAndRenderData, POLLING_INTERVAL);

    alert(`Started polling for Device ID: ${selectedId === "all" ? "All Devices" : selectedId}`);
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

        // When selection changes → stop previous polling
        $('#deviceId').on('change', function () {
            if (pollingTimer) clearInterval(pollingTimer);
        });
    });
});
