document.addEventListener('DOMContentLoaded', function () {

    // =========================================
    // 0. JWT VALIDATION FOR DASHBOARD ACCESS
    // =========================================

    // const token = localStorage.getItem("access_token");

    // if (!token) {
    //     // No valid session, redirect to login page
    //     window.location.href = "/login";
    //     console.log("No JWT found, redirecting to login.");
    //     return;  // Stop further execution
    // }

    // console.log("JWT validated for dashboard.");

    // =========================================
    // 1. FORM VALIDATION LOGIC (Your Code)
    // =========================================

    const shipmentForm = document.getElementById('shipmentForm');
    const createShipmentBtn = document.querySelector('.create-btn-style');
    const clearDetailsBtn = document.querySelector('.clear-btn-style');

    function validateForm(form) {
        let isValid = true;

        const requiredInputs = form.querySelectorAll(
            'input[type="text"], input[type="date"], select'
        );

        requiredInputs.forEach(input => {
            if (
                input.value.trim() === '' ||
                (input.tagName === 'SELECT' && input.value.includes('Select'))
            ) {
                isValid = false;
                input.classList.add('is-invalid');
            } else {
                input.classList.remove('is-invalid');
            }
        });

        return isValid;
    }

    if (createShipmentBtn && shipmentForm) {
        createShipmentBtn.addEventListener('click', function (event) {
            event.preventDefault();

            if (validateForm(shipmentForm)) {
                alert('Shipment created successfully!');
                shipmentForm.reset();
            } else {
                alert('Please fill out all required details before creating the shipment.');
            }
        });
    }

    // =========================================
    // 2. CLEAR DETAILS BUTTON FUNCTIONALITY
    // =========================================

    if (clearDetailsBtn && shipmentForm) {
        clearDetailsBtn.addEventListener('click', function (event) {
            event.preventDefault();

            shipmentForm.reset();

            shipmentForm.querySelectorAll('.is-invalid').forEach(input => {
                input.classList.remove('is-invalid');
            });

            alert('Form details cleared.');
        });
    }

});

