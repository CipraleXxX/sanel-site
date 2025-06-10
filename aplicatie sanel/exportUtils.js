// Export Utilities
const ExportUtils = {
    // Constants
    VAT_RATE: 0.19,
    DECIMAL_PLACES: 2,

    // Helper functions
    roundTo2Decimals: function(value) {
        if (typeof value !== 'number' || isNaN(value)) return 0;
        return Math.round((value + Number.EPSILON) * 100) / 100;
    },

    formatCurrency: function(value) {
        return this.roundTo2Decimals(value).toLocaleString('ro-RO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    formatDate: function(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Calculate costs for a single vehicle
    calculateVehicleCost: function(vehicle, distance) {
        const pricePerKm = parseFloat(vehicle.pricePerKm || 0);
        const dist = parseFloat(distance);
        if (isNaN(pricePerKm) || isNaN(dist)) return 0;
        return this.roundTo2Decimals(pricePerKm * dist);
    },

    // Calculate costs for an event
    calculateEventCosts: function(event) {
        if (!event || !event.vehicles || !event.distance) return null;

        const distance = parseFloat(event.distance);
        let totalWithoutVAT = 0;
        const vehicleCosts = [];

        // Calculate cost for each vehicle
        for (const vehicle of event.vehicles) {
            const cost = this.calculateVehicleCost(vehicle, distance);
            totalWithoutVAT += cost;
            vehicleCosts.push({
                vehicle: vehicle,
                cost: cost
            });
        }

        // Calculate VAT and total
        totalWithoutVAT = this.roundTo2Decimals(totalWithoutVAT);
        const vatAmount = this.roundTo2Decimals(totalWithoutVAT * this.VAT_RATE);
        const totalWithVAT = this.roundTo2Decimals(totalWithoutVAT + vatAmount);

        return {
            distance,
            totalWithoutVAT,
            vatAmount,
            totalWithVAT,
            vehicleCosts,
            numberOfVehicles: event.vehicles.length
        };
    },

    // Calculate totals for multiple events
    calculateEventsTotal: function(events) {
        if (!Array.isArray(events)) return null;

        let totals = {
            totalWithoutVAT: 0,
            vatAmount: 0,
            totalWithVAT: 0,
            totalDistance: 0,
            totalVehicles: 0
        };

        for (const event of events) {
            const costs = this.calculateEventCosts(event);
            if (costs) {
                totals.totalWithoutVAT += costs.totalWithoutVAT;
                totals.vatAmount += costs.vatAmount;
                totals.totalWithVAT += costs.totalWithVAT;
                totals.totalDistance += costs.distance;
                totals.totalVehicles += costs.numberOfVehicles;
            }
        }

        // Round all totals
        totals.totalWithoutVAT = this.roundTo2Decimals(totals.totalWithoutVAT);
        totals.vatAmount = this.roundTo2Decimals(totals.vatAmount);
        totals.totalWithVAT = this.roundTo2Decimals(totals.totalWithVAT);
        totals.totalDistance = this.roundTo2Decimals(totals.totalDistance);

        return totals;
    },

    // Export to Excel (Simplified)
    exportSimplifiedToExcel: function(events) {
        try {
            if (!Array.isArray(events) || events.length === 0) {
                throw new Error('No events to export');
            }

            // Sort events by eventId to maintain order
            events.sort((a, b) => (a.eventId || 0) - (b.eventId || 0));

            // Calculate totals
            const totals = this.calculateEventsTotal(events);
            if (!totals) {
                throw new Error('Failed to calculate totals');
            }

            // Prepare data for export
            const exportData = [
                // Total row
                {
                    'Eveniment': 'TOTAL',
                    'Valoare': totals.totalWithoutVAT,
                    'TVA': totals.vatAmount,
                    'Total cu TVA': totals.totalWithVAT
                },
                // Empty row
                {
                    'Eveniment': '',
                    'Valoare': '',
                    'TVA': '',
                    'Total cu TVA': ''
                }
            ];

            // Add event rows
            events.forEach(event => {
                const costs = this.calculateEventCosts(event);
                if (costs) {
                    exportData.push({
                        'Eveniment': event.name,
                        'Valoare': costs.totalWithoutVAT,
                        'TVA': costs.vatAmount,
                        'Total cu TVA': costs.totalWithVAT
                    });
                }
            });

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData, {
                header: ['Eveniment', 'Valoare', 'TVA', 'Total cu TVA']
            });

            // Set column widths
            worksheet['!cols'] = [
                { wch: 30 }, // Eveniment
                { wch: 15 }, // Valoare
                { wch: 15 }, // TVA
                { wch: 15 }  // Total cu TVA
            ];

            // Format numbers
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r; R <= range.e.r; R++) {
                for (let C = 1; C <= 3; C++) {
                    const cell = worksheet[XLSX.utils.encode_cell({r: R, c: C})];
                    if (cell && typeof cell.v === 'number') {
                        cell.z = '#,##0.00';
                        cell.v = this.roundTo2Decimals(cell.v);
                    }
                }
            }

            return worksheet;
        } catch (error) {
            console.error('Error in exportSimplifiedToExcel:', error);
            throw error;
        }
    },

    // Export to Excel (Detailed)
    exportDetailedToExcel: function(events) {
        try {
            if (!Array.isArray(events) || events.length === 0) {
                throw new Error('No events to export');
            }

            // Sort events by eventId to maintain order
            events.sort((a, b) => (a.eventId || 0) - (b.eventId || 0));

            // Calculate totals
            const totals = this.calculateEventsTotal(events);
            if (!totals) {
                throw new Error('Failed to calculate totals');
            }

            // Prepare data for export
            const exportData = [];

            // Add event rows
            events.forEach(event => {
                const costs = this.calculateEventCosts(event);
                if (costs) {
                    // Add a row for each vehicle
                    costs.vehicleCosts.forEach((vehicleCost, index) => {
                        const vat = this.roundTo2Decimals(vehicleCost.cost * this.VAT_RATE);
                        const totalWithVAT = this.roundTo2Decimals(vehicleCost.cost + vat);

                        exportData.push({
                            'Data': index === 0 ? this.formatDate(event.date) : '',
                            'Eveniment': index === 0 ? event.name : '',
                            'Traseu': index === 0 ? event.route : '',
                            'Distanță': index === 0 ? costs.distance : '',
                            'Vehicul': vehicleCost.vehicle.name,
                            'Preț/km': vehicleCost.vehicle.pricePerKm,
                            'Valoare': vehicleCost.cost,
                            'TVA': vat,
                            'Total cu TVA': totalWithVAT
                        });
                    });

                    // Add empty row after each event
                    exportData.push({
                        'Data': '',
                        'Eveniment': '',
                        'Traseu': '',
                        'Distanță': '',
                        'Vehicul': '',
                        'Preț/km': '',
                        'Valoare': '',
                        'TVA': '',
                        'Total cu TVA': ''
                    });
                }
            });

            // Add totals row
            exportData.push({
                'Data': 'TOTAL',
                'Eveniment': '',
                'Traseu': '',
                'Distanță': totals.totalDistance,
                'Vehicul': '',
                'Preț/km': '',
                'Valoare': totals.totalWithoutVAT,
                'TVA': totals.vatAmount,
                'Total cu TVA': totals.totalWithVAT
            });

            // Create worksheet
            const worksheet = XLSX.utils.json_to_sheet(exportData, {
                header: ['Data', 'Eveniment', 'Traseu', 'Distanță', 'Vehicul', 'Preț/km', 'Valoare', 'TVA', 'Total cu TVA']
            });

            // Set column widths
            worksheet['!cols'] = [
                { wch: 12 }, // Data
                { wch: 30 }, // Eveniment
                { wch: 30 }, // Traseu
                { wch: 10 }, // Distanță
                { wch: 20 }, // Vehicul
                { wch: 10 }, // Preț/km
                { wch: 15 }, // Valoare
                { wch: 15 }, // TVA
                { wch: 15 }  // Total cu TVA
            ];

            // Format numbers
            const range = XLSX.utils.decode_range(worksheet['!ref']);
            for (let R = range.s.r; R <= range.e.r; R++) {
                for (let C = 3; C <= 8; C++) { // Columns D through I
                    const cell = worksheet[XLSX.utils.encode_cell({r: R, c: C})];
                    if (cell && typeof cell.v === 'number') {
                        cell.z = '#,##0.00';
                        cell.v = this.roundTo2Decimals(cell.v);
                    }
                }
            }

            return worksheet;
        } catch (error) {
            console.error('Error in exportDetailedToExcel:', error);
            throw error;
        }
    }
}; 