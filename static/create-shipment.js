document.addEventListener('DOMContentLoaded', function() {
    const shipmentForm = document.getElementById('shipmentForm');
    // Select the button elements using their specific classes
    const createShipmentBtn = document.querySelector('.create-btn-style');
    const clearDetailsBtn = document.querySelector('.clear-btn-style');
    
    // =================================
    // 1. VALIDATION AND SUBMISSION
    // =================================
    
    // Helper function to query inputs by their placeholder or index/selector
    function getInputValue(selector) {
        const element = shipmentForm.querySelector(selector);
        return element ? element.value.trim() : '';
    }

    function validateForm(form) {
        let isValid = true;
        const requiredInputs = form.querySelectorAll('input[required], select');

        requiredInputs.forEach(input => {
            if (input.value.trim() === '' || 
                (input.tagName === 'SELECT' && input.value.includes('Select'))) 
            {
                isValid = false;
                input.classList.add('is-invalid'); 
            } else {
                input.classList.remove('is-invalid');
            }
        });
        return isValid;
    }

    // --- Function to Fetch Routes and Devices ---
    async function populateFormOptions() {
        try {
            // NOTE: Assuming route options are static for now, only fetching devices
            const deviceResponse = await fetch('http://127.0.0.1:8000/devices/all');
            const deviceIds = await deviceResponse.json();
            
            const deviceSelect = shipmentForm.querySelector('select:nth-of-type(2)');
            let optionsHtml = '<option value="">Select Device</option>';
            deviceIds.forEach(id => {
                optionsHtml += `<option value="${id}">${id}</option>`;
            });
            deviceSelect.innerHTML = optionsHtml;
            
        } catch (error) {
            console.error('Failed to populate device IDs:', error);
        }
    }

    // --- API Submission Logic (WITH JWT INTEGRATION) ---
    createShipmentBtn.addEventListener('click', async function(event) {
        event.preventDefault();

        if (validateForm(shipmentForm)) {
            
            // 1. Retrieve the JWT from session storage
            const token = sessionStorage.getItem('accessToken');
            if (!token) {
                alert('Authentication required. Please log in first.');
                // Redirect user to login page if token is missing
                window.location.href = '/login'; 
                return;
            }

            // Collect ALL necessary data based on HTML structure
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
                status: 'Created', // Default status
                created: new Date().toLocaleDateString()
            };

            try {
                const response = await fetch('http://127.0.0.1:8000/shipment/new', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        // 2. Add Authorization header with Bearer token
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(shipmentData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert(`Shipment ${result.shipment_id} created successfully!`);
                    shipmentForm.reset();
                } else if (response.status === 401 || response.status === 403) {
                    // Handle unauthorized or forbidden access
                    alert(`Authentication failed: ${result.detail}. Please log in again.`);
                    sessionStorage.removeItem('accessToken'); // Clear invalid token
                    window.location.href = '/login';
                } else {
                    alert(`Creation Failed: ${result.detail || 'Server error.'}`);
                }
            } catch (error) {
                console.error('API Error:', error);
                alert('Server error: Could not create shipment.');
            }

        } else {
            alert('Please fill out all required details before creating the shipment.');
        }
    });

    // =================================
    // 2. CLEAR DETAILS FUNCTIONALITY
    // =================================
    
    clearDetailsBtn.addEventListener('click', function(event) {
        event.preventDefault(); 
        shipmentForm.reset();
        shipmentForm.querySelectorAll('.is-invalid').forEach(input => {
            input.classList.remove('is-invalid');
        });
        alert('Form details cleared.');
    });

    // Initialize form options on load
    populateFormOptions();
});