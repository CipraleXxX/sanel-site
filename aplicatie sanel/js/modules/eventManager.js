/**
 * Event Manager Module
 * Handles event creation, storage, and management
 */

class EventManager {
    constructor() {
        this.VAT_RATE = 0.19;
        this.STORAGE_KEY = 'events';
    }

    /**
     * Generate next sequential event ID
     */
    getNextEventId() {
        const events = this.getAllEvents();
        if (events.length === 0) {
            return 1;
        }

        // Find maximum existing ID
        let maxId = 0;
        events.forEach(event => {
            if (event.eventId && typeof event.eventId === 'number') {
                maxId = Math.max(maxId, event.eventId);
            }
        });

        return maxId + 1;
    }

    /**
     * Get all events from localStorage
     */
    getAllEvents() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch (error) {
            console.error('Error loading events:', error);
            return [];
        }
    }

    /**
     * Save events to localStorage
     */
    saveEvents(events) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
            return true;
        } catch (error) {
            console.error('Error saving events:', error);
            return false;
        }
    }

    /**
     * Create and save a new event
     */
    createEvent(eventData) {
        const {
            eventName,
            waypoints,
            vehicles,
            totalDistance,
            totalDuration,
            vehicleCost,
            workforceCosts,
            distanceFromBucharest
        } = eventData;

        // Calculate VAT
        const totalCost = vehicleCost + workforceCosts.totalCost;
        const vatAmount = totalCost * this.VAT_RATE;
        const costWithVAT = totalCost + vatAmount;

        const event = {
            eventId: this.getNextEventId(),
            name: eventName,
            waypoints: waypoints,
            vehicles: vehicles.map(vehicle => ({
                type: vehicle.type,
                pricePerKm: vehicle.pricePerKm,
                cost: vehicle.cost,
                isLocalRun: vehicle.isLocalRun,
                category: vehicle.category
            })),
            distance: totalDistance,
            duration: totalDuration,
            vehicleCost: vehicleCost,
            workforce: {
                numberOfWorkers: parseInt(document.getElementById('numberOfWorkers')?.value) || 0,
                workingHours: parseFloat(document.getElementById('workingHours')?.value) || 0,
                helpers: workforceCosts.helpers,
                teamLeaders: workforceCosts.teamLeaders,
                helpersCost: workforceCosts.helpersCost,
                teamLeadersCost: workforceCosts.teamLeadersCost,
                workforceCost: workforceCosts.workforceCost,
                hasAccommodation: document.getElementById('hasAccommodation')?.checked || false,
                numberOfNights: parseInt(document.getElementById('numberOfNights')?.value) || 0,
                accommodationCost: workforceCosts.accommodationCost,
                travelDays: parseInt(document.getElementById('travelDays')?.value) || 0,
                travelAllowance: workforceCosts.travelAllowance,
                totalWorkforceCost: workforceCosts.totalCost
            },
            distanceFromBucharest: distanceFromBucharest,
            localRuns: vehicles.filter(v => v.isLocalRun).length,
            costWithoutVAT: totalCost,
            vatAmount: vatAmount,
            costWithVAT: costWithVAT,
            createdAt: new Date().toISOString()
        };

        // Save to localStorage
        const events = this.getAllEvents();
        events.push(event);
        
        if (this.saveEvents(events)) {
            console.log('Event created successfully:', event);
            return event;
        } else {
            throw new Error('Failed to save event');
        }
    }

    /**
     * Delete an event by ID
     */
    deleteEvent(eventId) {
        const events = this.getAllEvents();
        const updatedEvents = events.filter(event => event.eventId != eventId);
        
        if (this.saveEvents(updatedEvents)) {
            console.log('Event deleted successfully:', eventId);
            return true;
        } else {
            throw new Error('Failed to delete event');
        }
    }

    /**
     * Get an event by ID
     */
    getEvent(eventId) {
        const events = this.getAllEvents();
        return events.find(event => event.eventId == eventId);
    }

    /**
     * Update an existing event
     */
    updateEvent(eventId, updatedData) {
        const events = this.getAllEvents();
        const eventIndex = events.findIndex(event => event.eventId == eventId);
        
        if (eventIndex === -1) {
            throw new Error('Event not found');
        }

        events[eventIndex] = { ...events[eventIndex], ...updatedData };
        
        if (this.saveEvents(events)) {
            console.log('Event updated successfully:', eventId);
            return events[eventIndex];
        } else {
            throw new Error('Failed to update event');
        }
    }

    /**
     * Clear all events (with confirmation)
     */
    clearAllEvents() {
        if (confirm('Are you sure you want to delete ALL events? This action cannot be undone.')) {
            if (this.saveEvents([])) {
                console.log('All events cleared');
                return true;
            } else {
                throw new Error('Failed to clear events');
            }
        }
        return false;
    }

    /**
     * Export events for backup
     */
    exportEvents() {
        const events = this.getAllEvents();
        const dataStr = JSON.stringify(events, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `events-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    /**
     * Import events from backup
     */
    importEvents(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedEvents = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(importedEvents)) {
                        throw new Error('Invalid file format');
                    }

                    // Validate events structure
                    const validEvents = importedEvents.filter(event => 
                        event.name && event.eventId && event.createdAt
                    );

                    if (this.saveEvents(validEvents)) {
                        resolve(validEvents.length);
                    } else {
                        reject(new Error('Failed to save imported events'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.readAsText(file);
        });
    }

    /**
     * Get events statistics
     */
    getStatistics() {
        const events = this.getAllEvents();
        
        if (events.length === 0) {
            return {
                totalEvents: 0,
                totalDistance: 0,
                totalCost: 0,
                totalVehicles: 0,
                totalLocalRuns: 0,
                averageCost: 0
            };
        }

        const stats = events.reduce((acc, event) => {
            acc.totalDistance += event.distance || 0;
            acc.totalCost += event.costWithVAT || 0;
            acc.totalVehicles += event.vehicles?.length || 0;
            acc.totalLocalRuns += event.localRuns || 0;
            return acc;
        }, {
            totalEvents: events.length,
            totalDistance: 0,
            totalCost: 0,
            totalVehicles: 0,
            totalLocalRuns: 0
        });

        stats.averageCost = stats.totalCost / stats.totalEvents;

        return stats;
    }
}

// Export singleton instance
const eventManager = new EventManager();
window.EventManager = eventManager; 