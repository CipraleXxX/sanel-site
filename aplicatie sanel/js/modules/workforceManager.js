/**
 * Workforce Manager Module
 * Handles workforce calculations, travel allowance, and accommodation
 */

class WorkforceManager {
    constructor() {
        this.HELPER_RATE = 32; // RON per hour
        this.TEAM_LEADER_RATE = 38; // RON per hour
        this.ACCOMMODATION_RATE = 500; // RON per night per team leader
        this.TRAVEL_ALLOWANCE_THRESHOLD = 80; // km from Bucharest
        this.ENHANCED_ALLOWANCE_THRESHOLD = 500; // km from Bucharest
        this.BASIC_ALLOWANCE_RATE = 50; // RON per day per person
        this.ENHANCED_ALLOWANCE_RATE = 100; // RON per day per person
    }

    /**
     * Initialize workforce cost calculation event listeners
     */
    initialize() {
        const numberOfWorkersInput = document.getElementById('numberOfWorkers');
        const workingHoursInput = document.getElementById('workingHours');
        const hasAccommodationInput = document.getElementById('hasAccommodation');
        const numberOfNightsInput = document.getElementById('numberOfNights');
        const travelDaysInput = document.getElementById('travelDays');
        const accommodationDetails = document.getElementById('accommodationDetails');

        if (numberOfWorkersInput && workingHoursInput) {
            numberOfWorkersInput.addEventListener('input', () => this.updateCostPreview());
            workingHoursInput.addEventListener('input', () => this.updateCostPreview());
        }

        if (hasAccommodationInput) {
            hasAccommodationInput.addEventListener('change', () => {
                if (accommodationDetails) {
                    if (hasAccommodationInput.checked) {
                        accommodationDetails.classList.remove('hidden');
                    } else {
                        accommodationDetails.classList.add('hidden');
                    }
                }
                this.updateCostPreview();
            });
        }

        if (numberOfNightsInput) {
            numberOfNightsInput.addEventListener('input', () => this.updateCostPreview());
        }

        if (travelDaysInput) {
            travelDaysInput.addEventListener('input', () => this.updateCostPreview());
        }

        console.log('WorkforceManager initialized successfully');
    }

    /**
     * Calculate travel allowance based on distance from Bucharest
     */
    calculateTravelAllowance(distanceFromBucharest, travelDays, numberOfPeople) {
        if (distanceFromBucharest < this.TRAVEL_ALLOWANCE_THRESHOLD || travelDays === 0 || numberOfPeople === 0) {
            return {
                dailyRate: 0,
                totalAllowance: 0,
                isExternalTravel: false
            };
        }

        let dailyRate = this.BASIC_ALLOWANCE_RATE;
        if (distanceFromBucharest > this.ENHANCED_ALLOWANCE_THRESHOLD) {
            dailyRate = this.ENHANCED_ALLOWANCE_RATE;
        }

        const totalAllowance = dailyRate * travelDays * numberOfPeople;

        return {
            dailyRate,
            totalAllowance,
            isExternalTravel: true,
            distanceFromBucharest
        };
    }

    /**
     * Calculate workforce costs with correct team leader logic
     */
    calculateWorkforceCosts(distanceFromBucharest = 0) {
        const numberOfWorkers = parseInt(document.getElementById('numberOfWorkers')?.value) || 0;
        const workingHours = parseFloat(document.getElementById('workingHours')?.value) || 0;
        const hasAccommodation = document.getElementById('hasAccommodation')?.checked || false;
        const numberOfNights = parseInt(document.getElementById('numberOfNights')?.value) || 0;
        const travelDays = parseInt(document.getElementById('travelDays')?.value) || 0;

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

        let helpers = 0;
        let teamLeaders = 0;

        // Apply workforce logic
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

        const helpersCost = helpers * workingHours * this.HELPER_RATE;
        const teamLeadersCost = teamLeaders * workingHours * this.TEAM_LEADER_RATE;
        const workforceCost = helpersCost + teamLeadersCost;

        // Calculate accommodation costs (only for team leaders)
        const accommodationCost = hasAccommodation ? (teamLeaders * numberOfNights * this.ACCOMMODATION_RATE) : 0;

        // Calculate travel allowance
        const travelAllowance = this.calculateTravelAllowance(distanceFromBucharest, travelDays, numberOfWorkers);

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
                helpers: helpers > 0 ? `${helpers} helpers × ${workingHours}h × ${this.HELPER_RATE} RON/h = ${helpersCost} RON` : null,
                teamLeaders: teamLeaders > 0 ? `${teamLeaders} team leader${teamLeaders > 1 ? 's' : ''} × ${workingHours}h × ${this.TEAM_LEADER_RATE} RON/h = ${teamLeadersCost} RON` : null,
                accommodation: accommodationCost > 0 ? `${teamLeaders} team leader${teamLeaders > 1 ? 's' : ''} × ${numberOfNights} night${numberOfNights > 1 ? 's' : ''} × ${this.ACCOMMODATION_RATE} RON = ${accommodationCost} RON` : null,
                travelAllowance: travelAllowance.totalAllowance > 0 ? `${numberOfWorkers} person${numberOfWorkers > 1 ? 's' : ''} × ${travelDays} day${travelDays > 1 ? 's' : ''} × ${travelAllowance.dailyRate} RON = ${travelAllowance.totalAllowance} RON (${Math.round(distanceFromBucharest)}km from Bucharest)` : null,
                workforce: `Workforce subtotal: ${workforceCost} RON`,
                total: `Total workforce, accommodation & travel: ${totalCost} RON`
            }
        };
    }

    /**
     * Update workforce cost preview
     */
    updateCostPreview() {
        const costs = this.calculateWorkforceCosts();
        const preview = document.getElementById('workforceCostPreview');
        const breakdown = document.getElementById('workforceBreakdown');

        if (!preview || !breakdown) return;

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

    /**
     * Reset all workforce inputs
     */
    resetInputs() {
        const inputs = [
            'numberOfWorkers',
            'workingHours',
            'hasAccommodation',
            'numberOfNights',
            'travelDays'
        ];

        inputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = false;
                } else {
                    element.value = inputId === 'numberOfNights' || inputId === 'travelDays' ? '1' : '0';
                }
            }
        });

        const accommodationDetails = document.getElementById('accommodationDetails');
        if (accommodationDetails) {
            accommodationDetails.classList.add('hidden');
        }

        this.updateCostPreview();
    }
}

// Export singleton instance
const workforceManager = new WorkforceManager();
window.WorkforceManager = workforceManager; 