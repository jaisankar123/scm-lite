document.addEventListener('DOMContentLoaded', function() {
    const shipmentForm = document.getElementById('shipmentForm');
    // Ensure selectors match your create-shipment.html buttons
    const createShipmentBtn = document.querySelector('.create-btn-style');
    const clearDetailsBtn = document.querySelector('.clear-btn-style');
    
    // =================================
    // 1. VALIDATION AND SUBMISSION
    // =================================
    
    function validateForm(form) {
        let isValid = true;
        // Select all required inputs: text, date, and select elements
        const requiredInputs = form.querySelectorAll('input[type="text"], input[type="date"], select');

        requiredInputs.forEach(input => {
            // Check for empty strings or the default 'Select' option
            if (input.value.trim() === '' || 
                (input.tagName === 'SELECT' && input.value.includes('Select'))) 
            {
                isValid = false;
                // Add class to visually highlight the field (styled in CSS)
                input.classList.add('is-invalid'); 
            } else {
                input.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    // Only add listeners if the form elements exist (i.e., on create-shipment.html)
    if (createShipmentBtn && shipmentForm) {
        createShipmentBtn.addEventListener('click', function(event) {
            event.preventDefault(); // Stop default form submission (page reload)

            if (validateForm(shipmentForm)) {
                // Success
                alert('Shipment created successfully!');
                
                // Clear the form after successful submission
                shipmentForm.reset();

            } else {
                // Validation failed
                alert('Please fill out all required details before creating the shipment.');
            }
        });
    }

    // =================================
    // 2. CLEAR DETAILS FUNCTIONALITY
    // =================================
    
    if (clearDetailsBtn && shipmentForm) {
        clearDetailsBtn.addEventListener('click', function(event) {
            event.preventDefault(); 
            
            // Reset all form fields
            shipmentForm.reset();
            
            // Remove any validation error styling
            shipmentForm.querySelectorAll('.is-invalid').forEach(input => {
                input.classList.remove('is-invalid');
            });
            
            alert('Form details cleared.');
        });
    }
});