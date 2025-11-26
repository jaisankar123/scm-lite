// device-data-stream.js - FINAL UNIFIED CODE WITH SELECT2 AND POLLING

const tbody = document.getElementById("dataTableBody");
const deviceIdSelect = document.getElementById("deviceId");
const dataForm = document.getElementById("dataForm");
const API_URL = "http://127.0.0.1:8000/device-data"; 
const POLLING_INTERVAL = 5000; 

// A global variable to store the timer, allowing us to stop polling
let pollingTimer = null; 

// --- Helper Functions ---

function populateDeviceIds() {
    // NOTE: This array should ideally be fetched from the backend, 
    // but for quick testing, we use the IDs from server.py (1150 to 1158)
    const deviceIds = Array.from({ length: 9 }, (_, i) => 1150 + i);
    
    // Add default 'Select' option
    let optionsHtml = '<option value="">Select Device Id</option>';
    
    // Add 'All Devices' option
    optionsHtml += '<option value="all">All Devices</option>';
    
    // Add specific device IDs
    deviceIds.forEach(id => {
        optionsHtml += `<option value="${id}">${id}</option>`;
    });
    
    deviceIdSelect.innerHTML = optionsHtml;
}

function renderTable(data, selectedId) {
    // Clear the existing table data
    tbody.innerHTML = ''; 

    // Filter the data if a specific device is selected
    // Note: selectedId comes in as a string, data.Device_ID is a number, so we compare strings.
    const filteredData = (selectedId && selectedId !== 'all')
        ? data.filter(item => String(item.Device_ID) === selectedId)
        : data;

    // Reverse the array so the newest data appears at the top
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


// --- Main Polling/Fetching Logic ---

async function fetchAndRenderData() {
    // Read the current selected ID inside the polling function
    // This allows the table to update if the user changes the filter while polling is running.
    const selectedId = deviceIdSelect.value;
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            console.error(`Error fetching data: HTTP status ${response.status}`);
            return;
        }
        
        const latestData = await response.json();
        
        // Render the filtered data
        renderTable(latestData, selectedId);

    } catch (error) {
        console.error("Error fetching device data:", error);
    }
}

// --- Event Listener for Button ---

dataForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Prevents page reload

    const selectedId = deviceIdSelect.value;
    
    // Check if a valid option (not the initial empty value) is selected
    if (!selectedId) {
        alert("Please select a Device Id or 'All Devices' to start.");
        return;
    }
    
    // 1. Clear any existing timer to stop previous polling
    if (pollingTimer) {
        clearInterval(pollingTimer);
    }

    // 2. Start the polling loop based on the current selection
    fetchAndRenderData(); // Immediate fetch
    pollingTimer = setInterval(fetchAndRenderData, POLLING_INTERVAL);
    
    alert(`Started polling for Device ID: ${selectedId === 'all' ? 'All Devices' : selectedId}`);
});


// --- Initialization ---

document.addEventListener('DOMContentLoaded', function() {
    // 1. Populate the dropdown options
    populateDeviceIds();

    // 2. Initialize Select2
    // We use the standard jQuery ready function to ensure jQuery and Select2 libraries are loaded
    $(document).ready(function() {
        $('#deviceId').select2({
            placeholder: "Type or select a Device Id",
            allowClear: true // Allows users to clear the search/selection
        });
        
        // --- BONUS FIX: Bind the form submission to Select2 change ---
        // This makes polling start/stop when the user selects a value from the searchable box
        $('#deviceId').on('change', function() {
            // Check if the polling loop is active and stop it when selection changes
            if (pollingTimer) {
                clearInterval(pollingTimer);
            }
        });
    });
});