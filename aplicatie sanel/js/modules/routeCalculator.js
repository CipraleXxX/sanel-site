/**
 * Route Calculator Module
 * Handles Google Maps route calculations and distance matrix
 */

class RouteCalculator {
    constructor() {
        this.directionsService = null;
        this.directionsRenderer = null;
        this.distanceMatrixService = null;
        this.isInitialized = false;
    }

    /**
     * Initialize Google Maps services
     */
    initialize(map) {
        try {
            this.directionsService = new google.maps.DirectionsService();
            this.directionsRenderer = new google.maps.DirectionsRenderer({
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#2563eb',
                    strokeWeight: 4
                }
            });
            this.distanceMatrixService = new google.maps.DistanceMatrixService();
            
            if (map) {
                this.directionsRenderer.setMap(map);
            }
            
            this.isInitialized = true;
            console.log('RouteCalculator initialized successfully');
        } catch (error) {
            console.error('Error initializing RouteCalculator:', error);
            throw error;
        }
    }

    /**
     * Calculate route between waypoints
     */
    async calculateRoute(waypoints, selectedVehicles) {
        if (!this.isInitialized) {
            throw new Error('RouteCalculator not initialized');
        }

        if (!waypoints || waypoints.length < 2) {
            throw new Error('At least 2 waypoints are required');
        }

        if (!selectedVehicles || selectedVehicles.length === 0) {
            throw new Error('At least 1 vehicle is required');
        }

        const origin = waypoints[0];
        const destination = waypoints[waypoints.length - 1];
        const waypointsForApi = waypoints.slice(1, -1).map(point => ({
            location: point,
            stopover: true
        }));

        return new Promise((resolve, reject) => {
            this.directionsService.route({
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

                    // Set directions on map
                    if (this.directionsRenderer) {
                        this.directionsRenderer.setDirections(result);
                    }

                    resolve({
                        totalDistance: totalDistance,
                        totalDuration: formattedDuration,
                        totalCost: totalCost,
                        route: route
                    });
                } else {
                    reject(new Error(`Route calculation failed: ${status}`));
                }
            });
        });
    }

    /**
     * Calculate distance from Bucharest to destination
     */
    async calculateDistanceFromBucharest(destination) {
        if (!this.isInitialized) {
            throw new Error('RouteCalculator not initialized');
        }

        if (!destination) {
            return 0;
        }

        const bucharest = "București, România";

        return new Promise((resolve, reject) => {
            this.distanceMatrixService.getDistanceMatrix({
                origins: [bucharest],
                destinations: [destination],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC,
                avoidHighways: false,
                avoidTolls: false
            }, (response, status) => {
                if (status === google.maps.DistanceMatrixStatus.OK) {
                    const distance = response.rows[0].elements[0].distance;
                    if (distance) {
                        resolve(distance.value / 1000); // Convert to kilometers
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

    /**
     * Classify vehicles as local runs
     */
    classifyLocalRuns(vehicles, totalDistance) {
        return vehicles.map(vehicle => {
            const vehicleCost = totalDistance * vehicle.pricePerKm;
            const isLocalRun = vehicleCost < 320;

            return {
                ...vehicle,
                cost: vehicleCost,
                isLocalRun
            };
        });
    }
}

// Export singleton instance
const routeCalculator = new RouteCalculator();
window.RouteCalculator = routeCalculator; 