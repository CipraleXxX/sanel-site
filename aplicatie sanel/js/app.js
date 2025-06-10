let map;
let directionsService;
let directionsRenderer;
let markers = [];
let stopCounter = 0;
let sortable;
let selectedVehicles = [];

const VAT_RATE = 0.19; // 19% VAT rate

// Predefined colors for locations (RGB colors)
const locationColors = [
    '#22c55e', // Green for start
    '#ef4444', // Red for end
    '#3b82f6', // Blue
    '#f59e0b', // Orange
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f43f5e', // Rose
    '#a855f7', // Violet
    '#06b6d4', // Cyan
];

// Initialize Google Maps
function initMap() {
    // Create map centered on Romania
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 45.9432, lng: 24.9668 },
        zoom: 7
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // We'll handle markers ourselves
        polylineOptions: {
            strokeColor: '#2563eb',
            strokeWeight: 4
        }
    });
    directionsRenderer.setMap(map);

    // Initialize Places Autocomplete for all location inputs
    initializeAutocomplete('startLocation');

    // Initialize Sortable
    initializeSortable();

    // Initialize form sections
    initializeFormSections();

    // Initialize vehicle management
    initializeVehicleManagement();
}

// Initialize form sections and navigation
function initializeFormSections() {
    const eventSection = document.getElementById('eventSection');
    const vehiclesSection = document.getElementById('vehiclesSection');
    const workforceSection = document.getElementById('workforceSection');
    const locationsSection = document.getElementById('locationsSection');
    
    // Make sure event section is active initially
    eventSection.classList.add('active');
    vehiclesSection.classList.remove('active');
    workforceSection.classList.remove('active');
    locationsSection.classList.remove('active');
    
    // Continue to Vehicles button
    const continueToVehiclesBtn = document.getElementById('continueToVehicles');
    if (continueToVehiclesBtn) {
        continueToVehiclesBtn.addEventListener('click', () => {
            const eventName = document.getElementById('eventName').value.trim();
            const eventDate = document.getElementById('eventDate').value;
            
            if (!eventName || !eventDate) {
                alert('Please fill in both event name and date');
                return;
            }
            
            eventSection.classList.remove('active');
            vehiclesSection.classList.add('active');
        });
    }
    
    // Continue to Workforce button
    const continueToWorkforceBtn = document.getElementById('continueToWorkforce');
    if (continueToWorkforceBtn) {
        continueToWorkforceBtn.addEventListener('click', () => {
            const vehicles = getSelectedVehiclesData();
            if (vehicles.length === 0) {
                alert('Please select at least one vehicle');
                return;
            }
            
            vehiclesSection.classList.remove('active');
            workforceSection.classList.add('active');
        });
    }
    
    // Continue to Locations button
    const continueToLocationsBtn = document.getElementById('continueToLocations');
    if (continueToLocationsBtn) {
        continueToLocationsBtn.addEventListener('click', () => {
            workforceSection.classList.remove('active');
            locationsSection.classList.add('active');
        });
    }

    // Back buttons
    const backToEventBtn = document.getElementById('backToEvent');
    if (backToEventBtn) {
        backToEventBtn.addEventListener('click', () => {
            vehiclesSection.classList.remove('active');
            eventSection.classList.add('active');
        });
    }

    const backToVehiclesFromWorkforceBtn = document.getElementById('backToVehiclesFromWorkforce');
    if (backToVehiclesFromWorkforceBtn) {
        backToVehiclesFromWorkforceBtn.addEventListener('click', () => {
            workforceSection.classList.remove('active');
            vehiclesSection.classList.add('active');
        });
    }

    const backToWorkforceBtn = document.getElementById('backToWorkforce');
    if (backToWorkforceBtn) {
        backToWorkforceBtn.addEventListener('click', () => {
            locationsSection.classList.remove('active');
            workforceSection.classList.add('active');
        });
    }

    // Add Location button
    const addStopBtn = document.getElementById('addStop');
    if (addStopBtn) {
        addStopBtn.addEventListener('click', addLocationStop);
    }

    // Form submission
    const routeForm = document.getElementById('routeForm');
    if (routeForm) {
        routeForm.addEventListener('submit', handleFormSubmit);
    }

    // Initialize workforce cost calculation
    initializeWorkforceCosts();
}

// Initialize workforce cost calculation
function initializeWorkforceCosts() {
    const numberOfWorkersInput = document.getElementById('numberOfWorkers');
    const workingHoursInput = document.getElementById('workingHours');
    const hasAccommodationInput = document.getElementById('hasAccommodation');
    const numberOfNightsInput = document.getElementById('numberOfNights');
    const travelDaysInput = document.getElementById('travelDays');
    const accommodationDetails = document.getElementById('accommodationDetails');
    
    if (numberOfWorkersInput && workingHoursInput) {
        numberOfWorkersInput.addEventListener('input', updateWorkforceCostPreview);
        workingHoursInput.addEventListener('input', updateWorkforceCostPreview);
    }
    
    if (hasAccommodationInput) {
        hasAccommodationInput.addEventListener('change', function() {
            if (this.checked) {
                accommodationDetails.classList.remove('hidden');
            } else {
                accommodationDetails.classList.add('hidden');
            }
            updateWorkforceCostPreview();
        });
    }
    
    if (numberOfNightsInput) {
        numberOfNightsInput.addEventListener('input', updateWorkforceCostPreview);
    }
    
    if (travelDaysInput) {
        travelDaysInput.addEventListener('input', updateWorkforceCostPreview);
    }
}

// Calculate distance from Bucharest to first location
async function calculateDistanceFromBucharest(firstLocation) {
    if (!firstLocation) return 0;
    
    const service = new google.maps.DistanceMatrixService();
    const bucharest = "București, România";
    
    return new Promise((resolve, reject) => {
        service.getDistanceMatrix({
            origins: [bucharest],
            destinations: [firstLocation],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
        }, (response, status) => {
            if (status === google.maps.DistanceMatrixStatus.OK) {
                const distance = response.rows[0].elements[0].distance;
                if (distance) {
                    // Convert to kilometers
                    resolve(distance.value / 1000);
                } else {
                    resolve(0);
                }
            } else {
                console.error('Distance calculation failed:', status);
                resolve(0);
            }
        });
    });
}

// Calculate travel allowance based on distance from Bucharest
function calculateTravelAllowance(distanceFromBucharest, travelDays, numberOfPeople) {
    if (distanceFromBucharest < 80 || travelDays === 0 || numberOfPeople === 0) {
        return {
            dailyRate: 0,
            totalAllowance: 0,
            isExternalTravel: false
        };
    }
    
    let dailyRate = 50; // RON per day per person
    if (distanceFromBucharest > 500) {
        dailyRate = 100; // Double rate for distances > 500km
    }
    
    const totalAllowance = dailyRate * travelDays * numberOfPeople;
    
    return {
        dailyRate,
        totalAllowance,
        isExternalTravel: true,
        distanceFromBucharest
    };
}

// Classify vehicles as local runs
function classifyLocalRuns(vehicles, distance) {
    return vehicles.map(vehicle => {
        const vehicleCost = distance * vehicle.pricePerKm;
        const isLocalRun = vehicleCost < 320;
        
        return {
            ...vehicle,
            cost: vehicleCost,
            isLocalRun
        };
    });
}

// Calculate workforce costs with correct logic and travel allowance
function calculateWorkforceCosts(distanceFromBucharest = 0) {
    const numberOfWorkers = parseInt(document.getElementById('numberOfWorkers').value) || 0;
    const workingHours = parseFloat(document.getElementById('workingHours').value) || 0;
    const hasAccommodation = document.getElementById('hasAccommodation').checked;
    const numberOfNights = parseInt(document.getElementById('numberOfNights').value) || 0;
    const travelDays = parseInt(document.getElementById('travelDays').value) || 0;
    
    if (numberOfWorkers === 0) {
        return {
            helpers: 0,
            teamLeaders: 0,
            helpersCost: 0,
            teamLeadersCost: 0,
            workforceCost: 0,
            accommodationCost: 0,
            travelAllowance: {
                dailyRate: 0,
                totalAllowance: 0,
                isExternalTravel: false
            },
            totalCost: 0,
            breakdown: null
        };
    }
    
    const helperRate = 32; // RON per hour
    const teamLeaderRate = 38; // RON per hour
    const accommodationRate = 500; // RON per night per team leader
    
    let helpers = 0;
    let teamLeaders = 0;
    
    // Apply correct logic
    if (numberOfWorkers === 1) {
        teamLeaders = 1;
        helpers = 0;
    } else if (numberOfWorkers >= 2 && numberOfWorkers <= 9) {
        teamLeaders = 1;
        helpers = numberOfWorkers - 1;
    } else if (numberOfWorkers >= 10) {
        teamLeaders = 2;
        helpers = numberOfWorkers - 2;
    }
    
    const helpersCost = helpers * workingHours * helperRate;
    const teamLeadersCost = teamLeaders * workingHours * teamLeaderRate;
    const workforceCost = helpersCost + teamLeadersCost;
    
    // Calculate accommodation costs
    const accommodationCost = hasAccommodation ? (teamLeaders * numberOfNights * accommodationRate) : 0;
    
    // Calculate travel allowance
    const travelAllowance = calculateTravelAllowance(distanceFromBucharest, travelDays, numberOfWorkers);
    
    const totalCost = workforceCost + accommodationCost + travelAllowance.totalAllowance;
    
    return {
        helpers,
        teamLeaders,
        helpersCost,
        teamLeadersCost,
        workforceCost,
        accommodationCost,
        travelAllowance,
        totalCost,
        breakdown: {
            helpers: helpers > 0 ? `${helpers} helpers × ${workingHours}h × ${helperRate} RON/h = ${helpersCost} RON` : null,
            teamLeaders: teamLeaders > 0 ? `${teamLeaders} team leader${teamLeaders > 1 ? 's' : ''} × ${workingHours}h × ${teamLeaderRate} RON/h = ${teamLeadersCost} RON` : null,
            accommodation: accommodationCost > 0 ? `${teamLeaders} team leader${teamLeaders > 1 ? 's' : ''} × ${numberOfNights} night${numberOfNights > 1 ? 's' : ''} × ${accommodationRate} RON = ${accommodationCost} RON` : null,
            travelAllowance: travelAllowance.totalAllowance > 0 ? `${numberOfWorkers} person${numberOfWorkers > 1 ? 's' : ''} × ${travelDays} day${travelDays > 1 ? 's' : ''} × ${travelAllowance.dailyRate} RON = ${travelAllowance.totalAllowance} RON (${Math.round(distanceFromBucharest)}km from Bucharest)` : null,
            workforce: `Workforce subtotal: ${workforceCost} RON`,
            total: `Total workforce, accommodation & travel: ${totalCost} RON`
        }
    };
}

// Update workforce cost preview
function updateWorkforceCostPreview() {
    const costs = calculateWorkforceCosts();
    const preview = document.getElementById('workforceCostPreview');
    const breakdown = document.getElementById('workforceBreakdown');
    
    if (costs.totalCost > 0) {
        preview.classList.remove('hidden');
        let breakdownHtml = '';
        
        if (costs.breakdown.helpers) {
            breakdownHtml += `<div><i class="fas fa-user mr-1"></i>${costs.breakdown.helpers}</div>`;
        }
        if (costs.breakdown.teamLeaders) {
            breakdownHtml += `<div><i class="fas fa-user-tie mr-1"></i>${costs.breakdown.teamLeaders}</div>`;
        }
        if (costs.breakdown.workforce) {
            breakdownHtml += `<div class="font-medium text-blue-800 pt-1 border-t border-blue-200"><i class="fas fa-users mr-1"></i>${costs.breakdown.workforce}</div>`;
        }
        if (costs.breakdown.accommodation) {
            breakdownHtml += `<div><i class="fas fa-bed mr-1"></i>${costs.breakdown.accommodation}</div>`;
        }
        if (costs.breakdown.travelAllowance) {
            breakdownHtml += `<div><i class="fas fa-map-marker-alt mr-1"></i>${costs.breakdown.travelAllowance}</div>`;
        }
        if (costs.breakdown.total) {
            breakdownHtml += `<div class="font-bold text-blue-900 pt-2 border-t border-blue-300"><i class="fas fa-calculator mr-1"></i>${costs.breakdown.total}</div>`;
        }
        
        breakdown.innerHTML = breakdownHtml;
    } else {
        preview.classList.add('hidden');
    }
}

// Initialize vehicle management
function initializeVehicleManagement() {
    const addVehicleBtn = document.getElementById('addVehicle');
    addVehicleBtn.addEventListener('click', addVehicleEntry);

    // Add first vehicle entry by default
    addVehicleEntry();
}

// Add a new vehicle entry
function addVehicleEntry() {
    const vehiclesList = document.getElementById('vehiclesList');
    const vehicleEntry = document.createElement('div');
    vehicleEntry.className = 'vehicle-entry';
    
    // Get available plates from fleet data
    const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
    const availablePlates = [];
    
    for (const category in fleet) {
        fleet[category].vehicles.forEach(plate => {
            if (!selectedVehicles.includes(plate)) {
                availablePlates.push({
                    plate: plate,
                    category: category,
                    price: fleet[category].price
                });
            }
        });
    }

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
        <button type="button" class="remove-btn" onclick="removeVehicleEntry(this)">
            <i class="fas fa-times"></i>
        </button>
    `;

    vehiclesList.appendChild(vehicleEntry);

    // Update selected vehicles tracking
    const select = vehicleEntry.querySelector('.plate-select');
    select.addEventListener('change', function() {
        const oldValue = selectedVehicles[Array.from(vehiclesList.children).indexOf(vehicleEntry)];
        if (oldValue) {
            selectedVehicles = selectedVehicles.filter(v => v !== oldValue);
        }
        if (this.value) {
            selectedVehicles.push(this.value);
        }
        updateVehicleDropdowns();
    });

    updateVehicleDropdowns();
}

// Actualizează toate dropdown-urile de vehicule pentru a elimina opțiunile deja selectate
function updateVehicleDropdowns() {
    const vehiclesList = document.getElementById('vehiclesList');
    const selects = vehiclesList.querySelectorAll('.plate-select');
    const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
    // Construim lista completă de plăci
    let allPlates = [];
    for (const category in fleet) {
        fleet[category].vehicles.forEach(plate => {
            allPlates.push({
                plate: plate,
                category: category,
                price: fleet[category].price
            });
        });
    }
    // Pentru fiecare select, refacem opțiunile
    selects.forEach((select, idx) => {
        const currentValue = select.value;
        // Plăcile selectate în alte dropdown-uri
        const otherSelected = Array.from(selects)
            .filter((s, i) => i !== idx)
            .map(s => s.value)
            .filter(Boolean);
        // Refacem opțiunile
        select.innerHTML = '<option value="">Select vehicle</option>' +
            allPlates.filter(vehicle => !otherSelected.includes(vehicle.plate) || vehicle.plate === currentValue)
                .map(vehicle => `<option value="${vehicle.plate}" data-category="${vehicle.category}" data-price="${vehicle.price}"${vehicle.plate === currentValue ? ' selected' : ''}>
                    ${vehicle.plate} (${vehicle.category})
                </option>`).join('');
    });
}

// Remove a vehicle entry
function removeVehicleEntry(button) {
    const entry = button.parentElement;
    const select = entry.querySelector('.plate-select');
    const index = Array.from(entry.parentElement.children).indexOf(entry);
    
    // Remove from selected vehicles
    if (selectedVehicles[index]) {
        selectedVehicles = selectedVehicles.filter(v => v !== selectedVehicles[index]);
    }
    entry.remove();
    updateVehicleDropdowns();
}

// Get selected vehicles data
function getSelectedVehiclesData() {
    const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
    return Array.from(document.querySelectorAll('.plate-select'))
        .filter(select => select.value)
        .map(select => {
            const option = select.selectedOptions[0];
            return {
                plate: select.value,
                category: option.dataset.category,
                price: parseFloat(option.dataset.price)
            };
        });
}

// Clear all markers from the map
function clearMarkers() {
    markers.forEach(marker => {
        marker.setMap(null);
    });
    markers = [];
}

// Get marker offset for overlapping locations
function getMarkerOffset(position, existingMarkers) {
    const baseOffset = 0.0002; // Increased offset (about 22 meters)
    let maxLat = position.lat();
    let maxLng = position.lng();
    let count = 0;
    
    // Find markers that are very close to this position
    existingMarkers.forEach(marker => {
        const markerPos = marker.getPosition();
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(position.lat(), position.lng()),
            markerPos
        );
        
        // If markers are within 50 meters of each other
        if (distance < 50) {
            count++;
            // Update maximum values to ensure we don't place markers in the same spot
            maxLat = Math.max(maxLat, markerPos.lat());
            maxLng = Math.max(maxLng, markerPos.lng());
        }
    });
    
    if (count > 0) {
        // Place the new marker in a circular pattern around the base position
        const angle = (2 * Math.PI * count) / 8; // Divide circle into 8 segments
        return {
            lat: position.lat() + (baseOffset * Math.cos(angle)),
            lng: position.lng() + (baseOffset * Math.sin(angle))
        };
    }
    
    return {
        lat: position.lat(),
        lng: position.lng()
    };
}

// Create a marker with a label
function createMarker(position, label, color, isOverlapping = false) {
    const adjustedPosition = isOverlapping ? 
        getMarkerOffset(position, markers) : 
        { lat: position.lat(), lng: position.lng() };

    const marker = new google.maps.Marker({
        position: new google.maps.LatLng(adjustedPosition.lat, adjustedPosition.lng),
        map: map,
        label: {
            text: label,
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
        },
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 12
        }
    });
    
    markers.push(marker);
    return marker;
}

// Initialize Places Autocomplete
function initializeAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.setFields(['formatted_address']);
}

// Initialize Sortable.js
function initializeSortable() {
    const container = document.getElementById('all-locations');
    sortable = new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: function() {
            updateLocationLetters();
        }
    });
}

// Add a new location stop
function addLocationStop() {
    const stops = document.getElementById('stops');
    const stopDiv = document.createElement('div');
    stopDiv.className = 'location-input';
    stopDiv.innerHTML = `
        <span class="location-letter"></span>
        <div class="drag-handle">
            <i class="fas fa-grip-vertical"></i>
        </div>
        <input type="text" class="flex-grow p-2 border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter location">
        <button type="button" class="remove-btn ml-2" onclick="removeLocation(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    stops.appendChild(stopDiv);
    
    // Initialize autocomplete for the new input
    const input = stopDiv.querySelector('input');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.setFields(['formatted_address']);
    
    updateLocationLetters();
}

// Remove a location
function removeLocation(button) {
    const locationInput = button.closest('.location-input');
    locationInput.remove();
    updateLocationLetters();
}

// Update location letters (A, B, C, etc.)
function updateLocationLetters() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const locations = document.querySelectorAll('#stops .location-stop');
    
    locations.forEach((location, index) => {
        const letter = location.querySelector('.location-letter');
        if (letter) {
            letter.textContent = letters[index + 1]; // +1 because A is start location
        }
    });
}

// Get all locations
function getLocations() {
    // This function is deprecated, use getWaypoints() instead
    return getWaypoints();
}

// Calculate route using Google Maps Directions Service
async function calculateRoute(locations) {
    // This is a simplified wrapper for backward compatibility
    // The main route calculation is now handled by calculateRouteAndShowResults
    console.log('Legacy calculateRoute called with:', locations);
    return { totalDistance: 0, route: null };
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Europe/Bucharest'
    };
    return date.toLocaleDateString('ro-RO', options);
}

// Load saved events from localStorage
function loadSavedEvents() {
    const savedEvents = localStorage.getItem('events');
    return savedEvents ? JSON.parse(savedEvents) : [];
}

// Save event to localStorage
function saveEvent(eventData) {
    try {
        if (!eventData.eventId) {
            eventData.eventId = getNextEventId();
        }
        console.log('Saving event:', eventData);
        const savedEvents = JSON.parse(localStorage.getItem('events') || '[]');
        savedEvents.push(eventData);
        localStorage.setItem('events', JSON.stringify(savedEvents));
        console.log('Events after save:', JSON.parse(localStorage.getItem('events')));
    } catch (error) {
        console.error('Error saving event:', error);
        throw error;
    }
}

// Calculate VAT and totals
function calculateVAT(amount) {
    const vatAmount = amount * VAT_RATE;
    return {
        withoutVAT: amount,
        vatAmount: vatAmount,
        withVAT: amount + vatAmount
    };
}

// Format currency
function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2);
}

// Get route as string
function getRouteString(locations) {
    return locations.join(' → ');
}

// Funcție pentru generare ID simplu numeric începând de la 1
function getNextEventId() {
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    if (events.length === 0) {
        return 1;
    }
    
    // Găsește ID-ul maxim existent
    let maxId = 0;
    events.forEach(event => {
        if (event.eventId && typeof event.eventId === 'number') {
            maxId = Math.max(maxId, event.eventId);
        }
    });
    
    return maxId + 1;
}

// Funcție pentru generare UUID v4 (păstrată pentru compatibilitate)
function generateUUID() {
    // https://stackoverflow.com/a/2117523/2715716
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Use the unified calculateRouteAndShowResults function
    await calculateRouteAndShowResults();
}

// Get waypoints (updated name to match the rest of the code)
function getWaypoints() {
    const waypoints = [];
    // Get all location inputs (start, stops, end)
    const allInputs = document.querySelectorAll('.location-input input');
    allInputs.forEach(input => {
        if (input && input.value.trim()) {
            waypoints.push(input.value.trim());
        }
    });
    return waypoints;
}

// Get selected vehicles (updated to match the new structure)
function getSelectedVehicles() {
    const fleet = JSON.parse(localStorage.getItem('fleet') || '{}');
    return Array.from(document.querySelectorAll('.plate-select'))
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

// Reset route form
function resetRouteForm() {
    // Reset form
    const form = document.getElementById('routeForm');
    if (form) form.reset();
    
    // Clear stops
    const stops = document.getElementById('stops');
    if (stops) stops.innerHTML = '';
    
    // Reset vehicle list
    const vehiclesList = document.getElementById('vehiclesList');
    if (vehiclesList) vehiclesList.innerHTML = '';
    
    // Reset sections
    const eventSection = document.getElementById('eventSection');
    const vehiclesSection = document.getElementById('vehiclesSection');
    const workforceSection = document.getElementById('workforceSection');
    const locationsSection = document.getElementById('locationsSection');
    
    if (eventSection) eventSection.classList.add('active');
    if (vehiclesSection) vehiclesSection.classList.remove('active');
    if (workforceSection) workforceSection.classList.remove('active');
    if (locationsSection) locationsSection.classList.remove('active');
    
    // Reset workforce inputs
    const numberOfWorkersInput = document.getElementById('numberOfWorkers');
    const workingHoursInput = document.getElementById('workingHours');
    const hasAccommodationInput = document.getElementById('hasAccommodation');
    const numberOfNightsInput = document.getElementById('numberOfNights');
    const travelDaysInput = document.getElementById('travelDays');
    const accommodationDetails = document.getElementById('accommodationDetails');
    
    if (numberOfWorkersInput) numberOfWorkersInput.value = '0';
    if (workingHoursInput) workingHoursInput.value = '0';
    if (hasAccommodationInput) hasAccommodationInput.checked = false;
    if (numberOfNightsInput) numberOfNightsInput.value = '1';
    if (travelDaysInput) travelDaysInput.value = '1';
    if (accommodationDetails) accommodationDetails.classList.add('hidden');
    updateWorkforceCostPreview();
    
    // Reinitialize vehicle management
    selectedVehicles = [];
    initializeVehicleManagement();
}

// Add event listeners
const addStopBtn = document.getElementById('addStop');
if (addStopBtn) addStopBtn.addEventListener('click', addLocationStop);

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    updateLocationLetters();

    // Form sections navigation
    const eventSection = document.getElementById('eventSection');
    const vehiclesSection = document.getElementById('vehiclesSection');
    const locationsSection = document.getElementById('locationsSection');

    // Hide vehicles and locations sections initially
    if (vehiclesSection) vehiclesSection.style.display = 'none';
    if (locationsSection) locationsSection.style.display = 'none';

    // Continue buttons
    const continueToVehiclesBtn = document.getElementById('continueToVehicles');
    if (continueToVehiclesBtn) {
        continueToVehiclesBtn.addEventListener('click', function() {
            const eventName = document.getElementById('eventName').value.trim();
            const eventDate = document.getElementById('eventDate').value;
            if (!eventName || !eventDate) {
                alert('Please fill in both the event name and date before continuing.');
                return;
            }
            if (eventSection) eventSection.style.display = 'none';
            if (vehiclesSection) vehiclesSection.style.display = 'block';
            if (locationsSection) locationsSection.style.display = 'none';
        });
    }

    const continueToLocationsBtn = document.getElementById('continueToLocations');
    if (continueToLocationsBtn) {
        continueToLocationsBtn.addEventListener('click', function() {
            if (document.querySelectorAll('.vehicle-entry').length === 0) {
                alert('Please add at least one vehicle before continuing.');
                return;
            }
            if (eventSection) eventSection.style.display = 'none';
            if (vehiclesSection) vehiclesSection.style.display = 'none';
            if (locationsSection) locationsSection.style.display = 'block';
        });
    }

    // Back buttons
    const backToEventBtn = document.getElementById('backToEvent');
    if (backToEventBtn) {
        backToEventBtn.addEventListener('click', function() {
            if (eventSection) eventSection.style.display = 'block';
            if (vehiclesSection) vehiclesSection.style.display = 'none';
            if (locationsSection) locationsSection.style.display = 'none';
        });
    }

    const backToVehiclesBtn = document.getElementById('backToVehicles');
    if (backToVehiclesBtn) {
        backToVehiclesBtn.addEventListener('click', function() {
            if (eventSection) eventSection.style.display = 'none';
            if (vehiclesSection) vehiclesSection.style.display = 'block';
            if (locationsSection) locationsSection.style.display = 'none';
        });
    }

    // Refresh pentru Route Planner (index.html)
    const refreshRouteBtn = document.getElementById('refreshRoute');
    if (refreshRouteBtn) {
        refreshRouteBtn.addEventListener('click', function() {
            const form = document.getElementById('routeForm');
            if (form) form.reset();
            const stops = document.getElementById('stops');
            if (stops) stops.innerHTML = '';
            const vehiclesList = document.getElementById('vehiclesList');
            if (vehiclesList) vehiclesList.innerHTML = '';
            const vehicleCostsDiv = document.getElementById('vehicleCosts');
            if (vehicleCostsDiv) vehicleCostsDiv.innerHTML = '';
            const results = document.getElementById('results');
            if (results) results.classList.add('hidden');
            if (eventSection) {
                eventSection.style.display = 'block';
                eventSection.classList.add('active');
            }
            if (vehiclesSection) {
                vehiclesSection.style.display = 'none';
                vehiclesSection.classList.remove('active');
            }
            const workforceSection = document.getElementById('workforceSection');
            if (workforceSection) {
                workforceSection.style.display = 'none';
                workforceSection.classList.remove('active');
            }
            if (locationsSection) {
                locationsSection.style.display = 'none';
                locationsSection.classList.remove('active');
            }
            const numberOfWorkersInput = document.getElementById('numberOfWorkers');
            const workingHoursInput = document.getElementById('workingHours');
            const hasAccommodationInput = document.getElementById('hasAccommodation');
            const numberOfNightsInput = document.getElementById('numberOfNights');
            const travelDaysInput = document.getElementById('travelDays');
            const accommodationDetails = document.getElementById('accommodationDetails');
            if (numberOfWorkersInput) numberOfWorkersInput.value = '0';
            if (workingHoursInput) workingHoursInput.value = '0';
            if (hasAccommodationInput) hasAccommodationInput.checked = false;
            if (numberOfNightsInput) numberOfNightsInput.value = '1';
            if (travelDaysInput) travelDaysInput.value = '1';
            if (accommodationDetails) accommodationDetails.classList.add('hidden');
            updateWorkforceCostPreview();
            if (typeof initializeVehicleManagement === 'function') initializeVehicleManagement();
            if (typeof initializeAutocomplete === 'function') initializeAutocomplete('startLocation');
            if (typeof initializeSortable === 'function') initializeSortable();
        });
    }
    // Refresh pentru Fleet Management (fleet.html)
    const refreshFleetBtn = document.getElementById('refreshFleet');
    if (refreshFleetBtn) {
        refreshFleetBtn.addEventListener('click', function() {
            const grid = document.getElementById('categoriesGrid');
            if (grid) grid.innerHTML = '';
            const totalCategories = document.getElementById('totalCategories');
            if (totalCategories) totalCategories.textContent = '0';
            const totalVehicles = document.getElementById('totalVehicles');
            if (totalVehicles) totalVehicles.textContent = '0';
            if (typeof updateUI === 'function') updateUI();
        });
    }
});

// Main calculation function - REMOVED (replaced with new implementation above)
// The old calculateRouteAndShowResults function has been replaced

// Route calculation utility function
async function calculateRoute(waypoints, selectedVehicles) {
    const service = new google.maps.DirectionsService();
    
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const waypointsForApi = waypoints.slice(1, -1).map(point => ({
        location: point,
        stopover: true
    }));
    
    return new Promise((resolve, reject) => {
        service.route({
            origin: origin,
            destination: destination,
            waypoints: waypointsForApi,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            optimizeWaypoints: true
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
                let totalDistance = 0;
                let totalDuration = 0;
                
                const route = result.routes[0];
                for (let i = 0; i < route.legs.length; i++) {
                    totalDistance += route.legs[i].distance.value / 1000; // Convert to km
                    totalDuration += route.legs[i].duration.value;
                }
                
                // Calculate cost for each vehicle
                let totalCost = 0;
                selectedVehicles.forEach(vehicle => {
                    totalCost += totalDistance * vehicle.pricePerKm;
                });
                
                // Format duration
                const hours = Math.floor(totalDuration / 3600);
                const minutes = Math.floor((totalDuration % 3600) / 60);
                const formattedDuration = `${hours}h ${minutes}m`;
                
                resolve({
                    totalDistance: totalDistance,
                    totalDuration: formattedDuration,
                    totalCost: totalCost,
                    route: route
                });
            } else {
                reject(new Error('Route calculation failed: ' + status));
            }
        });
    });
}

// Add event with enhanced data including travel allowance and local runs
function addEvent() {
    if (!window.currentRouteData) {
        alert('No route data available. Please calculate a route first.');
        return;
    }
    
    const data = window.currentRouteData;
    
    // Calculate VAT (19%)
    const vatRate = 0.19;
    const costWithoutVAT = data.totalCost;
    const vatAmount = costWithoutVAT * vatRate;
    const costWithVAT = costWithoutVAT + vatAmount;
    
    const event = {
        eventId: getNextEventId(),
        name: data.eventName,
        waypoints: data.waypoints,
        vehicles: data.vehicles.map(vehicle => ({
            type: vehicle.type,
            pricePerKm: vehicle.pricePerKm,
            cost: vehicle.cost,
            isLocalRun: vehicle.isLocalRun
        })),
        distance: data.totalDistance,
        duration: data.totalDuration,
        vehicleCost: data.vehicleCost,
        workforce: {
            numberOfWorkers: parseInt(document.getElementById('numberOfWorkers').value) || 0,
            workingHours: parseFloat(document.getElementById('workingHours').value) || 0,
            helpers: data.workforceCosts.helpers,
            teamLeaders: data.workforceCosts.teamLeaders,
            helpersCost: data.workforceCosts.helpersCost,
            teamLeadersCost: data.workforceCosts.teamLeadersCost,
            workforceCost: data.workforceCosts.workforceCost,
            hasAccommodation: document.getElementById('hasAccommodation').checked,
            numberOfNights: parseInt(document.getElementById('numberOfNights').value) || 0,
            accommodationCost: data.workforceCosts.accommodationCost,
            travelDays: parseInt(document.getElementById('travelDays').value) || 0,
            travelAllowance: data.workforceCosts.travelAllowance,
            totalWorkforceCost: data.workforceCosts.totalCost
        },
        distanceFromBucharest: data.distanceFromBucharest,
        localRuns: data.vehicles.filter(v => v.isLocalRun).length,
        costWithoutVAT: costWithoutVAT,
        vatAmount: vatAmount,
        costWithVAT: costWithVAT,
        createdAt: new Date().toISOString()
    };
    
    // Get existing events or initialize empty array
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    events.push(event);
    localStorage.setItem('events', JSON.stringify(events));
    
    alert(`Event "${data.eventName}" has been added successfully!\n\nTotal Cost: ${costWithVAT.toFixed(2)} RON (including VAT)`);
    
    // Reset the form
    resetRouteForm();
    
    // Clear the result display
    const resultDisplay = document.getElementById('result');
    if (resultDisplay) resultDisplay.innerHTML = '';
    
    // Clear stored route data
    window.currentRouteData = null;
}

// Calculate route and show results
async function calculateRouteAndShowResults() {
    const eventName = document.getElementById('eventName').value.trim();
    
    if (!eventName) {
        alert('Please enter an event name');
        return;
    }
    
    const selectedVehicles = getSelectedVehicles();
    if (selectedVehicles.length === 0) {
        alert('Please select at least one vehicle');
        return;
    }
    
    const waypoints = getWaypoints();
    if (waypoints.length < 2) {
        alert('Please add at least 2 waypoints');
        return;
    }
    
    try {
        const result = await calculateRoute(waypoints, selectedVehicles);
        
        // Calculate distance from Bucharest to first location
        const firstLocation = waypoints[0];
        const distanceFromBucharest = await calculateDistanceFromBucharest(firstLocation);
        
        // Calculate workforce costs with distance from Bucharest
        const workforceCosts = calculateWorkforceCosts(distanceFromBucharest);
        
        // Classify vehicles as local runs
        const vehiclesWithClassification = classifyLocalRuns(selectedVehicles, result.totalDistance);
        
        // Add workforce costs to total
        const totalWithWorkforce = result.totalCost + workforceCosts.totalCost;
        
        // Display results including local run information
        const resultDiv = document.getElementById('results');
        if (resultDiv) {
            let localRunsInfo = '';
            const localRuns = vehiclesWithClassification.filter(v => v.isLocalRun);
            if (localRuns.length > 0) {
                localRunsInfo = `
                    <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <h4 class="font-semibold text-green-800 mb-2">
                            <i class="fas fa-map-signs mr-2"></i>Local Runs Detected
                        </h4>
                        <div class="text-sm text-green-700">
                            ${localRuns.map(v => `• ${v.type} (${v.cost.toFixed(2)} RON < 320 RON)`).join('<br>')}
                            <div class="mt-2 font-medium">${localRuns.length} vehicle${localRuns.length > 1 ? 's' : ''} classified as local run${localRuns.length > 1 ? 's' : ''}</div>
                        </div>
                    </div>
                `;
            }
            let travelAllowanceInfo = '';
            if (workforceCosts.travelAllowance.isExternalTravel) {
                travelAllowanceInfo = `
                    <div class="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 class="font-semibold text-purple-800 mb-2">
                            <i class="fas fa-map-marker-alt mr-2"></i>External Travel Detected
                        </h4>
                        <div class="text-sm text-purple-700">
                            Distance from Bucharest: ${Math.round(distanceFromBucharest)} km<br>
                            Travel allowance: ${workforceCosts.travelAllowance.dailyRate} RON/day per person<br>
                            Total allowance: ${workforceCosts.travelAllowance.totalAllowance} RON
                        </div>
                    </div>
                `;
            }
            resultDiv.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-lg border">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Route Calculation Results</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p><strong>Event:</strong> ${eventName}</p>
                            <p><strong>Total Distance:</strong> ${result.totalDistance.toFixed(2)} km</p>
                            <p><strong>Estimated Duration:</strong> ${result.totalDuration}</p>
                            <p><strong>Number of Vehicles:</strong> ${selectedVehicles.length}</p>
                        </div>
                        <div>
                            <p><strong>Vehicle Costs:</strong> ${result.totalCost.toFixed(2)} RON</p>
                            <p><strong>Workforce Costs:</strong> ${workforceCosts.totalCost.toFixed(2)} RON</p>
                            <p class="text-lg font-bold text-blue-600"><strong>Total Cost:</strong> ${totalWithWorkforce.toFixed(2)} RON</p>
                        </div>
                    </div>
                    
                    ${localRunsInfo}
                    ${travelAllowanceInfo}
                    
                    <div class="mt-6">
                        <h4 class="font-semibold text-gray-700 mb-2">Route Details:</h4>
                        <ul class="text-sm text-gray-600">
                            ${waypoints.map((point, index) => `<li>${index + 1}. ${point}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <button onclick="addEvent()" 
                            class="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                        Add to Events
                    </button>
                </div>
            `;
        }
        
        // Store the current calculation data for the addEvent function
        window.currentRouteData = {
            eventName,
            waypoints,
            vehicles: vehiclesWithClassification,
            totalDistance: result.totalDistance,
            totalDuration: result.totalDuration,
            vehicleCost: result.totalCost,
            workforceCosts,
            distanceFromBucharest,
            totalCost: totalWithWorkforce
        };
        
    } catch (error) {
        console.error('Error calculating route:', error);
        alert('Error calculating route. Please try again.');
    }
}

 