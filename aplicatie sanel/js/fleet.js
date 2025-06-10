document.addEventListener('DOMContentLoaded', () => {
    // Load saved costs
    const costs = loadVehicleCosts();
    
    // Set initial values
    document.getElementById('cost3_5t').value = costs['3.5t'];
    document.getElementById('cost7t').value = costs['7t'];
    document.getElementById('cost12t').value = costs['12t'];
    document.getElementById('cost24t').value = costs['24t'];

    // Handle save button
    document.getElementById('saveFleet').addEventListener('click', () => {
        const newCosts = {
            '3.5t': parseFloat(document.getElementById('cost3_5t').value),
            '7t': parseFloat(document.getElementById('cost7t').value),
            '12t': parseFloat(document.getElementById('cost12t').value),
            '24t': parseFloat(document.getElementById('cost24t').value)
        };

        // Validate all values are numbers and positive
        for (const cost of Object.values(newCosts)) {
            if (isNaN(cost) || cost <= 0) {
                alert('All costs must be positive numbers!');
                return;
            }
        }

        // Save new costs
        saveVehicleCosts(newCosts);
        alert('Costs saved successfully!');
    });
}); 