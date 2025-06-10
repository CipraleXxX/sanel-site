// Export events to Excel - Detailed version
function exportToExcelDetailed(events) {
    if (!events || events.length === 0) {
        alert('No events to export');
        return;
    }
    
    // Sort events by eventId
    const sortedEvents = events.sort((a, b) => a.eventId - b.eventId);
    
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];
    
    // Add header
    worksheetData.push([
        'Event ID',
        'Event Name', 
        'Distance (km)', 
        'Duration', 
        'Vehicles', 
        'Vehicle Cost (RON)',
        'Workforce Cost (RON)',
        'Travel Allowance (RON)',
        'Local Runs',
        'Distance from Bucharest (km)',
        'Cost without VAT (RON)', 
        'VAT (RON)', 
        'Total Cost with VAT (RON)', 
        'Created At'
    ]);
    
    sortedEvents.forEach(event => {
        // Format vehicles info
        const vehiclesInfo = event.vehicles.map(v => {
            const localRunIndicator = v.isLocalRun ? ' [LOCAL RUN]' : '';
            return `${v.type}${localRunIndicator}`;
        }).join(', ');
        
        // Calculate travel allowance info
        const travelAllowance = event.workforce?.travelAllowance || {};
        const travelAllowanceAmount = travelAllowance.totalAllowance || 0;
        
        // Count local runs
        const localRunsCount = event.localRuns || 0;
        
        // Distance from Bucharest
        const distanceFromBucharest = event.distanceFromBucharest || 0;
        
        worksheetData.push([
            event.eventId || '',
            event.name || '',
            event.distance?.toFixed(2) || '0',
            event.duration || '',
            vehiclesInfo,
            event.vehicleCost?.toFixed(2) || '0',
            (event.workforce?.totalWorkforceCost || 0).toFixed(2),
            travelAllowanceAmount.toFixed(2),
            localRunsCount > 0 ? `${localRunsCount} vehicle(s)` : 'None',
            distanceFromBucharest.toFixed(2),
            event.costWithoutVAT?.toFixed(2) || '0',
            event.vatAmount?.toFixed(2) || '0',
            event.costWithVAT?.toFixed(2) || '0',
            event.createdAt ? new Date(event.createdAt).toLocaleString() : ''
        ]);
        
        // Add vehicle breakdown
        if (event.vehicles && event.vehicles.length > 0) {
            event.vehicles.forEach((vehicle, index) => {
                const localRunStatus = vehicle.isLocalRun ? ' [LOCAL RUN]' : '';
                worksheetData.push([
                    '',
                    `  Vehicle ${index + 1}:`,
                    '',
                    '',
                    `${vehicle.type} - ${vehicle.pricePerKm} RON/km${localRunStatus}`,
                    vehicle.cost?.toFixed(2) || '0',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ]);
            });
        }
        
        // Add workforce breakdown if available
        if (event.workforce && event.workforce.numberOfWorkers > 0) {
            worksheetData.push([
                '',
                '  Workforce:',
                '',
                '',
                `${event.workforce.numberOfWorkers} workers (${event.workforce.helpers} helpers + ${event.workforce.teamLeaders} team leaders) × ${event.workforce.workingHours}h`,
                '',
                (event.workforce.workforceCost || 0).toFixed(2),
                '',
                '',
                '',
                '',
                '',
                '',
                ''
            ]);
            
            if (event.workforce.hasAccommodation && event.workforce.accommodationCost > 0) {
                worksheetData.push([
                    '',
                    '  Accommodation:',
                    '',
                    '',
                    `${event.workforce.teamLeaders} team leaders × ${event.workforce.numberOfNights} nights`,
                    '',
                    (event.workforce.accommodationCost || 0).toFixed(2),
                    '',
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ]);
            }
            
            if (travelAllowanceAmount > 0) {
                const allowanceDetails = travelAllowance.isExternalTravel ? 
                    `${event.workforce.numberOfWorkers} persons × ${event.workforce.travelDays} days × ${travelAllowance.dailyRate} RON/day` : 
                    'No external travel';
                worksheetData.push([
                    '',
                    '  Travel Allowance:',
                    '',
                    '',
                    allowanceDetails,
                    '',
                    '',
                    travelAllowanceAmount.toFixed(2),
                    '',
                    '',
                    '',
                    '',
                    '',
                    ''
                ]);
            }
        }
        
        // Add empty row for separation
        worksheetData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Events Detailed');
    
    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `events-detailed-${currentDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
}

// Export events to Excel - Simplified version  
function exportToExcelSimplified(events) {
    if (!events || events.length === 0) {
        alert('No events to export');
        return;
    }
    
    // Sort events by eventId
    const sortedEvents = events.sort((a, b) => a.eventId - b.eventId);
    
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];
    
    // Calculate totals
    const totalWithoutVAT = sortedEvents.reduce((sum, event) => sum + (event.costWithoutVAT || 0), 0);
    const totalVAT = sortedEvents.reduce((sum, event) => sum + (event.vatAmount || 0), 0);
    const totalWithVAT = sortedEvents.reduce((sum, event) => sum + (event.costWithVAT || 0), 0);
    const totalLocalRuns = sortedEvents.reduce((sum, event) => sum + (event.localRuns || 0), 0);
    const totalTravelAllowance = sortedEvents.reduce((sum, event) => {
        const travelAllowance = event.workforce?.travelAllowance || {};
        return sum + (travelAllowance.totalAllowance || 0);
    }, 0);
    
    // Add totals row at the top
    worksheetData.push(['TOTALS', `${totalWithoutVAT.toFixed(2)} RON`, `${totalVAT.toFixed(2)} RON`, `${totalWithVAT.toFixed(2)} RON`, `${totalLocalRuns} vehicles`, `${totalTravelAllowance.toFixed(2)} RON`]);
    worksheetData.push(['', '', '', '', '', '']); // Empty row
    
    // Add header
    worksheetData.push(['Event Name', 'Cost without VAT (RON)', 'VAT (RON)', 'Total Cost with VAT (RON)', 'Local Runs', 'Travel Allowance (RON)']);
    
    sortedEvents.forEach(event => {
        const localRunsText = event.localRuns > 0 ? `${event.localRuns} vehicle(s)` : 'None';
        const travelAllowance = event.workforce?.travelAllowance || {};
        const travelAllowanceAmount = travelAllowance.totalAllowance || 0;
        
        worksheetData.push([
            event.name || '',
            event.costWithoutVAT?.toFixed(2) || '0',
            event.vatAmount?.toFixed(2) || '0',
            event.costWithVAT?.toFixed(2) || '0',
            localRunsText,
            travelAllowanceAmount.toFixed(2)
        ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Events Summary');
    
    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `events-summary-${currentDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
}

// Export helpers details to Excel - New dedicated export
function exportHelpersToExcel(events) {
    if (!events || events.length === 0) {
        alert('No events to export');
        return;
    }
    
    // Sort events by eventId
    const sortedEvents = events.sort((a, b) => a.eventId - b.eventId);
    
    const workbook = XLSX.utils.book_new();
    const worksheetData = [];
    
    // Add header with totals
    let totalHelpers = 0;
    let totalTeamLeaders = 0;
    let totalWorkingHours = 0;
    let totalHelpersCost = 0;
    let totalTeamLeadersCost = 0;
    let totalAccommodationCost = 0;
    let totalTravelAllowance = 0;
    let totalWorkforceCost = 0;
    
    // Calculate totals
    sortedEvents.forEach(event => {
        const workforce = event.workforce || {};
        totalHelpers += workforce.helpers || 0;
        totalTeamLeaders += workforce.teamLeaders || 0;
        totalWorkingHours += (workforce.workingHours || 0) * (workforce.numberOfWorkers || 0);
        totalHelpersCost += workforce.helpersCost || 0;
        totalTeamLeadersCost += workforce.teamLeadersCost || 0;
        totalAccommodationCost += workforce.accommodationCost || 0;
        totalTravelAllowance += (workforce.travelAllowance?.totalAllowance || 0);
        totalWorkforceCost += workforce.totalWorkforceCost || 0;
    });
    
    // Add summary at top
    worksheetData.push(['WORKFORCE SUMMARY REPORT']);
    worksheetData.push(['Generated on:', new Date().toLocaleString()]);
    worksheetData.push(['']);
    worksheetData.push(['TOTALS']);
    worksheetData.push(['Total Events:', sortedEvents.length]);
    worksheetData.push(['Total Helpers:', totalHelpers]);
    worksheetData.push(['Total Team Leaders:', totalTeamLeaders]);
    worksheetData.push(['Total Working Hours:', totalWorkingHours.toFixed(1)]);
    worksheetData.push(['Total Helpers Cost:', `${totalHelpersCost.toFixed(2)} RON`]);
    worksheetData.push(['Total Team Leaders Cost:', `${totalTeamLeadersCost.toFixed(2)} RON`]);
    worksheetData.push(['Total Accommodation Cost:', `${totalAccommodationCost.toFixed(2)} RON`]);
    worksheetData.push(['Total Travel Allowance:', `${totalTravelAllowance.toFixed(2)} RON`]);
    worksheetData.push(['TOTAL WORKFORCE COST:', `${totalWorkforceCost.toFixed(2)} RON`]);
    worksheetData.push(['', '', '', '', '', '', '', '']); // Empty row
    
    // Add detailed header
    worksheetData.push([
        'Event ID',
        'Event Name',
        'Total Workers',
        'Helpers',
        'Team Leaders',
        'Working Hours',
        'Helpers Cost (RON)',
        'Team Leaders Cost (RON)',
        'Accommodation Nights',
        'Accommodation Cost (RON)',
        'Travel Days',
        'Travel Allowance (RON)',
        'Distance from Bucharest (km)',
        'Total Workforce Cost (RON)',
        'Created Date'
    ]);
    
    sortedEvents.forEach(event => {
        const workforce = event.workforce || {};
        const travelAllowance = workforce.travelAllowance || {};
        
        worksheetData.push([
            event.eventId || '',
            event.name || '',
            workforce.numberOfWorkers || 0,
            workforce.helpers || 0,
            workforce.teamLeaders || 0,
            workforce.workingHours || 0,
            (workforce.helpersCost || 0).toFixed(2),
            (workforce.teamLeadersCost || 0).toFixed(2),
            workforce.hasAccommodation ? (workforce.numberOfNights || 0) : 0,
            (workforce.accommodationCost || 0).toFixed(2),
            travelAllowance.isExternalTravel ? (workforce.travelDays || 0) : 0,
            (travelAllowance.totalAllowance || 0).toFixed(2),
            (event.distanceFromBucharest || 0).toFixed(2),
            (workforce.totalWorkforceCost || 0).toFixed(2),
            event.createdAt ? new Date(event.createdAt).toLocaleDateString() : ''
        ]);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths
    worksheet['!cols'] = [
        {wch: 8},   // Event ID
        {wch: 25},  // Event Name
        {wch: 12},  // Total Workers
        {wch: 8},   // Helpers
        {wch: 12},  // Team Leaders
        {wch: 12},  // Working Hours
        {wch: 15},  // Helpers Cost
        {wch: 18},  // Team Leaders Cost
        {wch: 15},  // Accommodation Nights
        {wch: 18},  // Accommodation Cost
        {wch: 12},  // Travel Days
        {wch: 18},  // Travel Allowance
        {wch: 22},  // Distance from Bucharest
        {wch: 20},  // Total Workforce Cost
        {wch: 12}   // Created Date
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Workforce Details');
    
    // Generate filename with current date
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `workforce-export-${currentDate}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
} 