        // Placeholder for API route that should fetch shipments for the logged-in user
        const SHIPMENTS_API_URL = 'http://127.0.0.1:8000/shipment/all'; 

        function renderShipments(shipments) {
            const tableBody = document.getElementById('shipmentsTableBody');
            const noDataMessage = document.getElementById('noDataMessage');
            tableBody.innerHTML = ''; // Clear previous data
            
            if (shipments.length === 0) {
                noDataMessage.textContent = 'No shipments found. Create one now!';
                noDataMessage.style.display = 'block';
            } else {
                noDataMessage.style.display = 'none';
                shipments.forEach(shipment => {
                    // Use the status field from the MongoDB payload
                    const statusClass = `status-${shipment.status ? shipment.status.toLowerCase() : 'created'}`;
                    const row = tableBody.insertRow();
                    
                    row.innerHTML = `
                        <td><strong>${shipment._id || 'N/A'}</strong></td>
                        <td>${shipment.containerNumber || 'N/A'}</td>
                        <td>${shipment.goodsType || 'N/A'}</td>
                        <td>${shipment.route || 'N/A'}</td>
                        <td>${shipment.deliveryDate || 'N/A'}</td>
                        <td class="${statusClass}">${shipment.status || 'Created'}</td>
                        <td>${shipment.created || 'N/A'}</td>
                        <td>${shipment.description || 'N/A'}</td>
                    `;
                });
            }
        }
        
        async function fetchShipments() {
            try {
                // NOTE: This route should ideally be /shipment/me/{email}
                // For simplicity, we assume /shipment/all returns all data currently.
                const response = await fetch(SHIPMENTS_API_URL); 
                const shipments = await response.json();
                
                if (response.ok) {
                    renderShipments(shipments);
                } else {
                    throw new Error(shipments.detail || 'Failed to fetch shipment data.');
                }
            } catch (error) {
                console.error("Shipment API error:", error);
                document.getElementById('noDataMessage').textContent = 'Error loading shipments.';
                document.getElementById('noDataMessage').style.display = 'block';
            }
        }


        document.addEventListener('DOMContentLoaded', function() {
            
            // 1. User Data Display Logic (copied from myaccount.html for consistency)
            const userName = sessionStorage.getItem('userName') || 'User';
            const userEmail = sessionStorage.getItem('userEmail') || 'No Email';
            const initial = userName.charAt(0).toUpperCase();

            document.getElementById('displayName').textContent = userName;
            document.getElementById('displayEmail').textContent = userEmail;
            document.getElementById('mainUserInitial').textContent = initial;
            document.getElementById('headerUserInitial').textContent = initial;

            // 2. Fetch and Render Shipments
            fetchShipments(); 
        });
