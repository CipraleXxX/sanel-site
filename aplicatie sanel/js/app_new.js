/**
 * Main Application Controller
 * Orchestrates all modules and handles the main application flow
 */

class TransportApp {
    constructor() {
        this.map = null;
        this.isInitialized = false;
        this.currentRouteData = null;
    }

    /**
     * Initialize the entire application
     */
    async initialize() {
        try {
            console.log('Initializing Transport Application...');

            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize Google Maps if available
            if (typeof google !== 'undefined' && google.maps) {
                this.initializeMap();
            }

            // Initialize all modules
            this.initializeModules();

            // Setup event handlers
            this.setupEventHandlers();

            // Initialize form sections
            this.initializeFormSections();

            this.isInitialized = true;
            console.log('Transport Application initialized successfully');

        } catch (error) {
            console.error('Error initializing application:', error);
            alert('Error initializing application. Please refresh the page.');
        }
    }

    /**
     * Initialize Google Maps
     */
    initializeMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        try {
            this.map = new google.maps.Map(mapElement, {
                center: { lat: 45.9432, lng: 24.9668 }, // Romania center
                zoom: 7
            });

            // Initialize route calculator with map
            if (window.RouteCalculator) {
                window.RouteCalculator.initialize(this.map);
            }

            console.log('Google Maps initialized successfully');
        } catch (error) {
            console.error('Error initializing Google Maps:', error);
        }
    }

    /**
     * Initialize all modules
     */
    initializeModules() {
        // Initialize modules in correct order
        if (window.VehicleManager) {
            window.VehicleManager.initialize();
        }

        if (window.WorkforceManager) {
            window.WorkforceManager.initialize();
        }

        console.log('All modules initialized');
    }

    /**
     * Setup main event handlers
     */
    setupEventHandlers() {
        // Calculate Route button - MAIN FIX
        const calculateBtn = document.getElementById('calculateRoute');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleCalculateRoute();
            });
            console.log('Calculate Route button connected');
        }

        // Form submission
        const routeForm = document.getElementById('routeForm');
        if (routeForm) {
            routeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCalculateRoute();
            });
        }

        // Add Location button
        const addStopBtn = document.getElementById('addStop');
        if (addStopBtn) {
            addStopBtn.addEventListener('click', () => this.addLocationStop());
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshRoute');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.resetForm());
        }

        console.log('Event handlers setup complete');
    }

    /**
     * Initialize form sections navigation
     */
    initializeFormSections() {
        const sections = {
            event: document.getElementById('eventSection'),
            vehicles: document.getElementById('vehiclesSection'),
            workforce: document.getElementById('workforceSection'),
            locations: document.getElementById('locationsSection')
        };

        // Continue buttons
        const continueToVehiclesBtn = document.getElementById('continueToVehicles');
        if (continueToVehiclesBtn) {
            continueToVehiclesBtn.addEventListener('click', () => {
                if (this.validateEventSection()) {
                    this.showSection('vehicles');
                }
            });
        }

        const continueToWorkforceBtn = document.getElementById('continueToWorkforce');
        if (continueToWorkforceBtn) {
            continueToWorkforceBtn.addEventListener('click', () => {
                if (this.validateVehiclesSection()) {
                    this.showSection('workforce');
                }
            });
        }

        const continueToLocationsBtn = document.getElementById('continueToLocations');
        if (continueToLocationsBtn) {
            continueToLocationsBtn.addEventListener('click', () => {
                this.showSection('locations');
            });
        }

        // Back buttons
        const backButtons = [
            { id: 'backToEvent', target: 'event' },
            { id: 'backToVehiclesFromWorkforce', target: 'vehicles' },
            { id: 'backToWorkforce', target: 'workforce' }
        ];

        backButtons.forEach(({ id, target }) => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.showSection(target));
            }
        });

        // Show first section
        this.showSection('event');
        console.log('Form sections initialized');
    }

    /**
     * Show specific form section
     */
    showSection(sectionName) {
        const sections = ['event', 'vehicles', 'workforce', 'locations'];
        
        sections.forEach(name => {
            const section = document.getElementById(`${name}Section`);
            if (section) {
                if (name === sectionName) {
                    section.classList.add('active');
                    section.style.display = 'block';
                } else {
                    section.classList.remove('active');
                    section.style.display = 'none';
                }
            }
        });
    }

    /**
     * Validate event section
     */
    validateEventSection() {
        const eventName = document.getElementById('eventName')?.value?.trim();
        const eventDate = document.getElementById('eventDate')?.value;

        if (!eventName || !eventDate) {
            alert('Please fill in both event name and date');
            return false;
        }
        return true;
    }

    /**
     * Validate vehicles section
     */
    validateVehiclesSection() {
        if (window.VehicleManager && !window.VehicleManager.validateSelection()) {
            alert('Please select at least one vehicle');
            return false;
        }
        return true;
    }

    /**
     * MAIN ROUTE CALCULATION HANDLER - FIXED
     */
    async handleCalculateRoute() {
        try {
            console.log('Starting route calculation...');

            // Validate event name
            const eventName = document.getElementById('eventName')?.value?.trim();
            if (!eventName) {
                alert('Please enter an event name');
                return;
            }

            // Get vehicles
            const selectedVehicles = window.VehicleManager ? 
                window.VehicleManager.getSelectedVehicles() : [];
            
            if (selectedVehicles.length === 0) {
                alert('Please select at least one vehicle');
                return;
            }

            // Get waypoints
            const waypoints = window.VehicleManager ? 
                window.VehicleManager.getWaypoints() : [];
            
            if (waypoints.length < 2) {
                alert('Please add at least 2 waypoints');
                return;
            }

            console.log('Validation passed:', {
                eventName,
                vehicles: selectedVehicles.length,
                waypoints: waypoints.length
            });

            // Calculate route
            const result = await window.RouteCalculator.calculateRoute(waypoints, selectedVehicles);

            // Calculate distance from Bucharest
            const distanceFromBucharest = await window.RouteCalculator.calculateDistanceFromBucharest(waypoints[0]);

            // Calculate workforce costs
            const workforceCosts = window.WorkforceManager ?
                window.WorkforceManager.calculateWorkforceCosts(distanceFromBucharest) :
                { totalCost: 0, helpers: 0, teamLeaders: 0 };

            // Classify vehicles as local runs
            const vehiclesWithClassification = window.RouteCalculator.classifyLocalRuns(
                selectedVehicles, result.totalDistance
            );

            // Store calculation data
            this.currentRouteData = {
                eventName,
                waypoints,
                vehicles: vehiclesWithClassification,
                totalDistance: result.totalDistance,
                totalDuration: result.totalDuration,
                vehicleCost: result.totalCost,
                workforceCosts,
                distanceFromBucharest,
                totalCost: result.totalCost + workforceCosts.totalCost
            };

            // Display results
            this.displayResults();

            console.log('Route calculation completed successfully');

        } catch (error) {
            console.error('Error calculating route:', error);
            alert(`Error calculating route: ${error.message}`);
        }
    }

    /**
     * Display calculation results
     */
    displayResults() {
        const resultDiv = document.getElementById('result');
        if (!resultDiv || !this.currentRouteData) return;

        const data = this.currentRouteData;
        const localRuns = data.vehicles.filter(v => v.isLocalRun);
        const hasExternalTravel = data.workforceCosts.travelAllowance?.isExternalTravel;

        let localRunsInfo = '';
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
        if (hasExternalTravel) {
            travelAllowanceInfo = `
                <div class="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 class="font-semibold text-purple-800 mb-2">
                        <i class="fas fa-map-marker-alt mr-2"></i>External Travel Detected
                    </h4>
                    <div class="text-sm text-purple-700">
                        Distance from Bucharest: ${Math.round(data.distanceFromBucharest)} km<br>
                        Travel allowance: ${data.workforceCosts.travelAllowance.dailyRate} RON/day per person<br>
                        Total allowance: ${data.workforceCosts.travelAllowance.totalAllowance} RON
                    </div>
                </div>
            `;
        }

        resultDiv.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg border">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Route Calculation Results</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p><strong>Event:</strong> ${data.eventName}</p>
                        <p><strong>Total Distance:</strong> ${data.totalDistance.toFixed(2)} km</p>
                        <p><strong>Estimated Duration:</strong> ${data.totalDuration}</p>
                        <p><strong>Number of Vehicles:</strong> ${data.vehicles.length}</p>
                    </div>
                    <div>
                        <p><strong>Vehicle Costs:</strong> ${data.vehicleCost.toFixed(2)} RON</p>
                        <p><strong>Workforce Costs:</strong> ${data.workforceCosts.totalCost.toFixed(2)} RON</p>
                        <p class="text-lg font-bold text-blue-600"><strong>Total Cost:</strong> ${data.totalCost.toFixed(2)} RON</p>
                    </div>
                </div>
                
                ${localRunsInfo}
                ${travelAllowanceInfo}
                
                <div class="mt-6">
                    <h4 class="font-semibold text-gray-700 mb-2">Route Details:</h4>
                    <ul class="text-sm text-gray-600">
                        ${data.waypoints.map((point, index) => `<li>${index + 1}. ${point}</li>`).join('')}
                    </ul>
                </div>
                
                <button onclick="TransportApp.instance.addEvent()" 
                        class="mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                    Add to Events
                </button>
            </div>
        `;
    }

    /**
     * Add event to storage
     */
    addEvent() {
        if (!this.currentRouteData) {
            alert('No route data available. Please calculate a route first.');
            return;
        }

        try {
            const event = window.EventManager.createEvent(this.currentRouteData);
            alert(`Event "${event.name}" has been added successfully!\n\nTotal Cost: ${event.costWithVAT.toFixed(2)} RON (including VAT)`);
            
            this.resetForm();
        } catch (error) {
            console.error('Error adding event:', error);
            alert(`Error adding event: ${error.message}`);
        }
    }

    /**
     * Add location stop
     */
    addLocationStop() {
        const stopsContainer = document.getElementById('stops');
        if (!stopsContainer) return;

        const stopDiv = document.createElement('div');
        stopDiv.className = 'location-input location-stop flex items-center space-x-2 mb-2';
        
        const inputId = `stop_${Date.now()}`;
        stopDiv.innerHTML = `
            <span class="location-letter w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                ${String.fromCharCode(66 + stopsContainer.children.length)}
            </span>
            <input type="text" id="${inputId}" 
                   class="flex-1 p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                   placeholder="Enter destination">
            <button type="button" onclick="this.parentElement.remove()" 
                    class="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <i class="fas fa-times"></i>
            </button>
        `;

        stopsContainer.appendChild(stopDiv);

        // Initialize autocomplete for new input
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            const input = stopDiv.querySelector('input');
            new google.maps.places.Autocomplete(input);
        }
    }

    /**
     * Reset entire form
     */
    resetForm() {
        // Reset form
        const form = document.getElementById('routeForm');
        if (form) form.reset();

        // Clear stops
        const stops = document.getElementById('stops');
        if (stops) stops.innerHTML = '';

        // Reset result display
        const result = document.getElementById('result');
        if (result) result.innerHTML = '';

        // Reset modules
        if (window.VehicleManager) window.VehicleManager.reset();
        if (window.WorkforceManager) window.WorkforceManager.resetInputs();

        // Show first section
        this.showSection('event');

        // Clear current route data
        this.currentRouteData = null;

        console.log('Form reset completed');
    }
}

// Initialize application when DOM is ready
const app = new TransportApp();
TransportApp.instance = app; // Make instance globally available

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    app.initialize();
});

// Make app globally available
window.TransportApp = app; 