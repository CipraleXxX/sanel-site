// WARNING: In a production environment, the API key should be stored securely on the backend
const CONFIG = {
    MAPS_API_KEY: 'AIzaSyB9eG3KGQHsUJ8biAsGyqWeN_tfupC2BPE',
    DEFAULT_COSTS: {
        '3.5t': 2.50,
        '7t': 3.00,
        '12t': 3.50,
        '24t': 4.00
    }
};

// Load costs from localStorage or use defaults
function loadVehicleCosts() {
    const savedCosts = localStorage.getItem('vehicleCosts');
    if (savedCosts) {
        return JSON.parse(savedCosts);
    }
    return CONFIG.DEFAULT_COSTS;
}

// Save costs to localStorage
function saveVehicleCosts(costs) {
    localStorage.setItem('vehicleCosts', JSON.stringify(costs));
}

// Get current costs
function getVehicleCosts() {
    return loadVehicleCosts();
} 