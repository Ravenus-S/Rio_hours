document.getElementById('hoursForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Get total food sales
    const foodSales = parseFloat(document.getElementById('foodSales').value) || 0;

    // Get hours worked by barbecue workers
    const barbecueWorkers = {
        Mariana: getValueOrDefault('hoursMariana'),
        Lucas: getValueOrDefault('hoursLucas'),
        Vitor: getValueOrDefault('hoursVitor'),                // Vitor added
        SidEspetador: getValueOrDefault('hoursSidEspetador'),  // Sid Espetador added
        Filipe: getValueOrDefault('hoursFilipe'),
        Antonio: getValueOrDefault('hoursAntonio'),
        Fernando: getValueOrDefault('hoursFernando'),
        Marco: getValueOrDefault('hoursMarco'),
        Dani: getValueOrDefault('hoursDani')
    };

    // Get hours worked by kitchen workers
    const kitchenWorkers = {
        Sidney: getValueOrDefault('hoursSidney'),
        Jamile: getValueOrDefault('hoursJamile'),
        Ana: getValueOrDefault('hoursAna'),
        Talita: getValueOrDefault('hoursTalita'),
        Rafa: getValueOrDefault('hoursRafa'),                  // Rafa added
        Alfonso: getValueOrDefault('hoursAlfonso'),
        LucasKitchen: getValueOrDefault('hoursLucasKitchen'),
        MarcoKitchen: getValueOrDefault('hoursMarcoKitchen')
    };

    // Calculate total hours for barbecue and kitchen workers
    const totalBarbecueHours = sumHours(barbecueWorkers);
    const totalKitchenHours = sumHours(kitchenWorkers);

    // Calculate tip percentages
    const barbecueTipPool = foodSales * 0.045;
    const kitchenTipPool = foodSales * 0.035;

    // Calculate individual earnings
    const barbecueEarnings = calculateEarnings(barbecueWorkers, totalBarbecueHours, barbecueTipPool);
    const kitchenEarnings = calculateEarnings(kitchenWorkers, totalKitchenHours, kitchenTipPool);

    // Update the summary on the page
    updateSummary(barbecueEarnings, kitchenEarnings);
});

function getValueOrDefault(elementId) {
    const element = document.getElementById(elementId);
    return element ? parseFloat(element.value) || 0 : 0;
}

function sumHours(workers) {
    return Object.values(workers).reduce((total, hours) => total + hours, 0);
}

function calculateEarnings(workers, totalHours, tipPool) {
    const earnings = {};
    for (const worker in workers) {
        const hours = workers[worker];
        earnings[worker] = (hours / totalHours) * tipPool;
    }
    return earnings;
}

function updateSummary(barbecueEarnings, kitchenEarnings) {
    const summaryElement = document.getElementById('summary');
    summaryElement.innerHTML = '';

    // Barbecue workers summary
    const barbecueSummary = document.createElement('div');
    barbecueSummary.innerHTML = `<h3 class="text-xl font-semibold text-gray-700">Barbecue Workers</h3>`;
    for (const worker in barbecueEarnings) {
        barbecueSummary.innerHTML += `<p>${worker}: $${barbecueEarnings[worker].toFixed(2)} earned</p>`;
    }
    summaryElement.appendChild(barbecueSummary);

    // Kitchen workers summary
    const kitchenSummary = document.createElement('div');
    kitchenSummary.innerHTML = `<h3 class="text-xl font-semibold text-gray-700">Kitchen Workers</h3>`;
    for (const worker in kitchenEarnings) {
        kitchenSummary.innerHTML += `<p>${worker}: $${kitchenEarnings[worker].toFixed(2)} earned</p>`;
    }
    summaryElement.appendChild(kitchenSummary);

    // Calculate and display total earnings for barbecue and kitchen workers
    const totalBarbecueEarnings = Object.values(barbecueEarnings).reduce((total, earning) => total + earning, 0);
    const totalKitchenEarnings = Object.values(kitchenEarnings).reduce((total, earning) => total + earning, 0);

    const totalBarbecueElement = document.createElement('p');
    totalBarbecueElement.innerHTML = `<strong>Total Barbecue Earnings: $${totalBarbecueEarnings.toFixed(2)}</strong>`;
    summaryElement.appendChild(totalBarbecueElement);

    const totalKitchenElement = document.createElement('p');
    totalKitchenElement.innerHTML = `<strong>Total Kitchen Earnings: $${totalKitchenEarnings.toFixed(2)}</strong>`;
    summaryElement.appendChild(totalKitchenElement);
}
