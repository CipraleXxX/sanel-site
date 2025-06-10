/**
 * Vehicle Manager Module
 * Handles vehicle selection, fleet management, and vehicle operations
 */

class VehicleManager {
    constructor() {
        this.selectedVehicles = [];
        this.isInitialized = false;
    }

    /**
     * Initialize vehicle management
     */
    initialize() {
        const addVehicleBtn = document.getElementById('addVehicle');
        if (addVehicleBtn) {
            addVehicleBtn.addEventListener('click', () => this.addVehicleEntry());
        }

        // Add first vehicle entry by default
        this.addVehicleEntry();
        this.isInitialized = true;
        console.log('VehicleManager initialized successfully');
    }

    /**
     * Add a new vehicle entry to the form
     */
    addVehicleEntry() {
        const vehiclesList = document.getElementById('vehiclesList');
        if (!vehiclesList) return;

        const vehicleEntry = document.createElement('div');
        vehicleEntry.className = 'vehicle-entry';

        // Get available plates from fleet data
        const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
        const availablePlates = this.getAvailableVehicles(fleet);

        if (availablePlates.length === 0) {
            alert('No vehicles available. Please add vehicles in Fleet Management first.');
            return;
        }

        vehicleEntry.innerHTML = `
            <select class="plate-select flex-grow p-2 border rounded">
                <option value="">Select vehicle</option>
                ${availablePlates.map(vehicle => 
                    `<option value="${vehicle.plate}" data-category="${vehicle.category}" data-price="${vehicle.price}">
                        ${vehicle.plate} (${vehicle.category})
                    </option>`
                ).join('')}
            </select>
            <button type="button" class="remove-btn" onclick="VehicleManager.removeVehicleEntry(this)">
                <i class="fas fa-times"></i>
            </button>
        `;

        vehiclesList.appendChild(vehicleEntry);

        // Update selected vehicles tracking
        const select = vehicleEntry.querySelector('.plate-select');
        select.addEventListener('change', () => {
            const index = Array.from(vehiclesList.children).indexOf(vehicleEntry);
            const oldValue = this.selectedVehicles[index];
            
            if (oldValue) {
                this.selectedVehicles = this.selectedVehicles.filter(v => v !== oldValue);
            }
            
            if (select.value) {
                this.selectedVehicles.push(select.value);
            }
            
            this.updateVehicleDropdowns();
        });

        this.updateVehicleDropdowns();
    }

    /**
     * Get available vehicles that are not already selected
     */
    getAvailableVehicles(fleet) {
        const availablePlates = [];
        
        for (const category in fleet) {
            if (fleet[category].vehicles) {
                fleet[category].vehicles.forEach(plate => {
                    if (!this.selectedVehicles.includes(plate)) {
                        availablePlates.push({
                            plate: plate,
                            category: category,
                            price: fleet[category].price
                        });
                    }
                });
            }
        }
        
        return availablePlates;
    }

    /**
     * Update all vehicle dropdowns to remove already selected options
     */
    updateVehicleDropdowns() {
        const vehiclesList = document.getElementById('vehiclesList');
        if (!vehiclesList) return;

        const selects = vehiclesList.querySelectorAll('.plate-select');
        const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
        
        // Build complete list of plates
        let allPlates = [];
        for (const category in fleet) {
            if (fleet[category].vehicles) {
                fleet[category].vehicles.forEach(plate => {
                    allPlates.push({
                        plate: plate,
                        category: category,
                        price: fleet[category].price
                    });
                });
            }
        }

        // Update each select dropdown
        selects.forEach((select, idx) => {
            const currentValue = select.value;
            
            // Get plates selected in other dropdowns
            const otherSelected = Array.from(selects)
                .filter((s, i) => i !== idx)
                .map(s => s.value)
                .filter(Boolean);

            // Rebuild options
            select.innerHTML = '<option value="">Select vehicle</option>' +
                allPlates.filter(vehicle => !otherSelected.includes(vehicle.plate) || vehicle.plate === currentValue)
                    .map(vehicle => `<option value="${vehicle.plate}" data-category="${vehicle.category}" data-price="${vehicle.price}"${vehicle.plate === currentValue ? ' selected' : ''}>
                        ${vehicle.plate} (${vehicle.category})
                    </option>`).join('');
        });
    }

    /**
     * Remove a vehicle entry
     */
    removeVehicleEntry(button) {
        const entry = button.parentElement;
        const select = entry.querySelector('.plate-select');
        const vehiclesList = document.getElementById('vehiclesList');
        const index = Array.from(vehiclesList.children).indexOf(entry);

        // Remove from selected vehicles
        if (this.selectedVehicles[index]) {
            this.selectedVehicles = this.selectedVehicles.filter(v => v !== this.selectedVehicles[index]);
        }
        
        entry.remove();
        this.updateVehicleDropdowns();
    }

    /**
     * Get selected vehicles data with all details
     */
    getSelectedVehicles() {
        const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
        const vehiclesList = document.getElementById('vehiclesList');
        
        if (!vehiclesList) return [];

        return Array.from(vehiclesList.querySelectorAll('.plate-select'))
            .filter(select => select.value)
            .map(select => {
                const option = select.selectedOptions[0];
                return {
                    type: select.value, // vehicle plate/name
                    pricePerKm: parseFloat(option.dataset.price),
                    category: option.dataset.category
                };
            });
    }

    /**
     * Get waypoints from all location inputs
     */
    getWaypoints() {
        const waypoints = [];
        
        // Get all location inputs
        const allInputs = document.querySelectorAll('.location-input input');
        allInputs.forEach(input => {
            if (input && input.value.trim()) {
                waypoints.push(input.value.trim());
            }
        });
        
        return waypoints;
    }

    /**
     * Reset all vehicle selections
     */
    reset() {
        this.selectedVehicles = [];
        const vehiclesList = document.getElementById('vehiclesList');
        if (vehiclesList) {
            vehiclesList.innerHTML = '';
        }
        
        // Re-add first vehicle entry
        if (this.isInitialized) {
            this.addVehicleEntry();
        }
    }

    /**
     * Validate that at least one vehicle is selected
     */
    validateSelection() {
        const selectedVehicles = this.getSelectedVehicles();
        return selectedVehicles.length > 0;
    }
}

// Export singleton instance
const vehicleManager = new VehicleManager();
window.VehicleManager = vehicleManager; 